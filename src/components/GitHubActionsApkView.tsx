import React, { useState, useEffect, useCallback } from "react";
import { 
  GitBranch, 
  Play, 
  ExternalLink, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Smartphone, 
  FileCode, 
  Package, 
  Key, 
  Layers,
  ArrowRight,
  Sparkles,
  Info
} from "lucide-react";
import confetti from "canvas-confetti";

interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  head_branch: string;
  head_commit?: {
    message: string;
    id: string;
  };
}

interface GitHubWorkflowItem {
  id: number;
  name: string;
  path: string;
  state: string;
  html_url: string;
}

const WORKFLOW_YAML = `name: Build Android APK (build)

on:
  push:
    branches: [ '**' ]
  workflow_dispatch:
    inputs:
      build_type:
        description: 'Тип сборки (debug или release)'
        required: true
        default: 'debug'
        type: choice
        options:
          - debug
          - release

permissions:
  contents: write
  actions: read

jobs:
  build:
    name: Build Sitrak Android APK
    runs-on: ubuntu-latest

    steps:
      - name: 📥 Клонирование репозитория
        uses: actions/checkout@v4

      - name: ☕ Настройка Java (JDK 17)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: 🟢 Настройка Node.js (v20)
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: 📦 Установка зависимостей проекта
        run: |
          npm install --legacy-peer-deps

      - name: ⚡ Сборка веб-приложения (Vite Build)
        run: |
          npm run build

      - name: 🔧 Установка Capacitor 6 (совместимо с Java 17)
        run: |
          npm install --no-save @capacitor/core@^6.2.0 @capacitor/cli@^6.2.0 @capacitor/android@^6.2.0

      - name: 📱 Инициализация Android платформы
        run: |
          mkdir -p dist
          if [ ! -d "android" ]; then
            npx cap add android
          fi
          npx cap sync android

      - name: 🛡️ Добавление разрешений Bluetooth SPP & ELM327 в AndroidManifest
        run: |
          node -e '
            const fs = require("fs");
            const file = "android/app/src/main/AndroidManifest.xml";
            if (fs.existsSync(file)) {
              let content = fs.readFileSync(file, "utf8");
              const perms = [
                "<uses-permission android:name=\\"android.permission.BLUETOOTH\\" />",
                "<uses-permission android:name=\\"android.permission.BLUETOOTH_ADMIN\\" />",
                "<uses-permission android:name=\\"android.permission.BLUETOOTH_CONNECT\\" />",
                "<uses-permission android:name=\\"android.permission.BLUETOOTH_SCAN\\" android:usesPermissionFlags=\\"neverForLocation\\" />",
                "<uses-permission android:name=\\"android.permission.ACCESS_FINE_LOCATION\\" />",
                "<uses-permission android:name=\\"android.permission.ACCESS_COARSE_LOCATION\\" />",
                "<uses-permission android:name=\\"android.permission.INTERNET\\" />",
                "<uses-permission android:name=\\"android.permission.WAKE_LOCK\\" />"
              ];
              perms.forEach(p => {
                if (!content.includes(p)) {
                  content = content.replace("<application", p + "\\n    <application");
                }
              });
              fs.writeFileSync(file, content, "utf8");
              console.log("AndroidManifest успешно обновлен с правами Bluetooth SPP");
            }
          '

      - name: 🔨 Компиляция APK через Gradle
        run: |
          cd android
          chmod +x ./gradlew
          ./gradlew assembleDebug --stacktrace
          
          if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
            cp app/build/outputs/apk/debug/app-debug.apk ../sitrak-s7h-diagnostics.apk
            cp app/build/outputs/apk/debug/app-debug.apk ../sitrak-s7h-diagnostics-debug.apk
            echo "✅ APK файл успешно создан!"
          else
            find . -name "*.apk" -exec cp {} ../sitrak-s7h-diagnostics.apk \\;
          fi

      - name: 📤 Загрузка скомпилированного APK в артефакты сборки
        uses: actions/upload-artifact@v4
        with:
          name: sitrak-s7h-diagnostics-apk
          path: |
            sitrak-s7h-diagnostics*.apk
            android/app/build/outputs/apk/**/*.apk
          if-no-files-found: warn
          retention-days: 30

      - name: 🚀 Создание GitHub Release (при наличии тега v*)
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        with:
          files: sitrak-s7h-diagnostics.apk
          name: "Sitrak S7H Diagnostics APK \${{ github.ref_name }}"
          body: |
            Готовый установочный пакет Android APK для тягачей Sitrak S7H / C7H.
            - Поддержка ELM327 Bluetooth (протокол J1939)
            - 7 блоков ЭБУ, пневматика EC-APU, тормоза EBS3
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`;

interface GitHubActionsApkViewProps {
  onNavigateToEcus?: () => void;
}

export const GitHubActionsApkView: React.FC<GitHubActionsApkViewProps> = ({ onNavigateToEcus }) => {
  // GitHub repo credentials
  const [repoOwner, setRepoOwner] = useState<string>(() => {
    return localStorage.getItem("sitrak_gh_owner") || "allkost73";
  });
  const [repoName, setRepoName] = useState<string>(() => {
    return localStorage.getItem("sitrak_gh_repo") || "sitrak-s7h-diagnostics";
  });
  const [branch, setBranch] = useState<string>(() => {
    return localStorage.getItem("sitrak_gh_branch") || "main";
  });
  const [githubToken, setGithubToken] = useState<string>(() => {
    return localStorage.getItem("sitrak_gh_token") || "";
  });
  const [buildType, setBuildType] = useState<"release" | "debug">("release");

  // Workflow status state
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);
  const [latestRun, setLatestRun] = useState<GitHubWorkflowRun | null>(null);
  const [isCopiedYaml, setIsCopiedYaml] = useState<boolean>(false);
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);

  // Save repo info to localStorage
  const handleSaveRepoSettings = () => {
    try {
      localStorage.setItem("sitrak_gh_owner", repoOwner.trim());
      localStorage.setItem("sitrak_gh_repo", repoName.trim());
      localStorage.setItem("sitrak_gh_branch", branch.trim());
      if (githubToken) {
        localStorage.setItem("sitrak_gh_token", githubToken.trim());
      }
      setStatusMessage({ type: "success", text: "Настройки репозитория GitHub сохранены!" });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch {}
  };

  const [detectedWorkflows, setDetectedWorkflows] = useState<GitHubWorkflowItem[]>([]);
  const [hasCheckedWorkflows, setHasCheckedWorkflows] = useState<boolean>(false);

  // Check latest workflow run & workflow definitions from GitHub API
  const checkWorkflowStatus = useCallback(async (isSilent = false) => {
    const owner = repoOwner.trim();
    const repo = repoName.trim();
    if (!owner || !repo) {
      if (!isSilent) {
        setStatusMessage({ type: "error", text: "Укажите владельца и имя репозитория GitHub." });
      }
      return;
    }

    setIsCheckingStatus(true);
    try {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
      };
      if (githubToken.trim()) {
        headers.Authorization = `Bearer ${githubToken.trim()}`;
      }

      // 1. Query installed workflow YAML files in repo
      try {
        const wfRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows`, {
          headers,
        });
        if (wfRes.ok) {
          const wfData = await wfRes.json();
          setDetectedWorkflows(wfData.workflows || []);
        }
      } catch {}
      setHasCheckedWorkflows(true);

      // 2. Query workflow runs
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=5`, {
        headers,
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Репозиторий не найден или приватный (требуется токен GitHub)");
        }
        if (res.status === 403) {
          throw new Error("Превышен лимит запросов GitHub API. Укажите Personal Access Token.");
        }
        throw new Error(`Ошибка GitHub API (${res.status})`);
      }

      const data = await res.json();
      if (data.workflow_runs && data.workflow_runs.length > 0) {
        const run: GitHubWorkflowRun = data.workflow_runs[0];
        setLatestRun(run);

        if (run.conclusion === "success") {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 }
          });
          if (!isSilent) {
            setStatusMessage({ type: "success", text: `Сборка #${run.id} успешно завершена! APK готов к скачиванию.` });
          }
        } else if (run.status === "in_progress" || run.status === "queued") {
          if (!isSilent) {
            setStatusMessage({ type: "info", text: `Сборка #${run.id} выполняется в облаке GitHub Actions (${run.status})...` });
          }
        }
      } else {
        if (!isSilent) {
          setStatusMessage({ type: "info", text: "Сборки пока не запускались. Добавьте build.yml в репозиторий или нажмите запуск." });
        }
      }
    } catch (e: any) {
      if (!isSilent) {
        setStatusMessage({ type: "error", text: e.message || "Не удалось проверить статус сборки" });
      }
    } finally {
      setIsCheckingStatus(false);
    }
  }, [repoOwner, repoName, githubToken]);

  // Initial check on mount
  useEffect(() => {
    checkWorkflowStatus(true);
  }, [checkWorkflowStatus]);

  // Trigger workflow dispatch via GitHub API (supports build.yml and build-apk.yml)
  const handleTriggerWorkflow = async () => {
    const owner = repoOwner.trim();
    const repo = repoName.trim();
    if (!owner || !repo) {
      setStatusMessage({ type: "error", text: "Укажите владельца и имя репозитория GitHub." });
      return;
    }

    if (!githubToken.trim()) {
      setShowTokenInput(true);
      setStatusMessage({ 
        type: "error", 
        text: "Для удаленного запуска через кнопку требуется Personal Access Token с правом 'repo'/'actions', либо просто нажмите 'Создать build.yml в GitHub' ниже." 
      });
      return;
    }

    setIsTriggering(true);
    setStatusMessage({ type: "info", text: "Отправка запроса на запуск сборки в GitHub Actions..." });

    // Try build.yml first, fallback to build-apk.yml
    const workflowCandidates = ["build.yml", "build-apk.yml"];
    let triggered = false;
    let lastError = "";

    for (const wfFile of workflowCandidates) {
      try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${wfFile}/dispatches`, {
          method: "POST",
          headers: {
            Accept: "application/vnd.github.v3+json",
            Authorization: `Bearer ${githubToken.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ref: branch.trim() || "main",
            inputs: {
              build_type: buildType,
            },
          }),
        });

        if (res.status === 204) {
          triggered = true;
          setStatusMessage({ 
            type: "success", 
            text: `Сборка APK успешно запущена (${wfFile})! Обновление статуса...` 
          });
          setTimeout(() => checkWorkflowStatus(true), 3500);
          break;
        } else if (res.status === 404) {
          lastError = `Файл ${wfFile} не найден в ветке ${branch} на GitHub.`;
        } else {
          const errData = await res.json().catch(() => ({}));
          lastError = errData.message || `Ошибка (${res.status})`;
        }
      } catch (err: any) {
        lastError = err.message || "Ошибка сети";
      }
    }

    if (!triggered) {
      setStatusMessage({ 
        type: "error", 
        text: `${lastError} Создайте файл .github/workflows/build.yml в репозитории на GitHub.` 
      });
    }

    setIsTriggering(false);
  };

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(WORKFLOW_YAML);
    setIsCopiedYaml(true);
    setTimeout(() => setIsCopiedYaml(false), 2500);
  };

  const handleDownloadYaml = () => {
    const blob = new Blob([WORKFLOW_YAML], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "build.yml";
    a.click();
    URL.revokeObjectURL(url);
  };

  const ghActionsUrl = `https://github.com/${repoOwner.trim()}/${repoName.trim()}/actions`;
  const ghReleasesUrl = `https://github.com/${repoOwner.trim()}/${repoName.trim()}/releases`;
  const ghSettingsActionsUrl = `https://github.com/${repoOwner.trim()}/${repoName.trim()}/settings/actions`;
  const createWorkflowDirectUrl = `https://github.com/${repoOwner.trim()}/${repoName.trim()}/new/${branch.trim() || "main"}?filename=.github/workflows/build.yml`;
  const editWorkflowDirectUrl = `https://github.com/${repoOwner.trim()}/${repoName.trim()}/edit/${branch.trim() || "main"}/.github/workflows/build.yml`;

  return (
    <div className="space-y-5 text-slate-100">
      {/* Top Banner: GitHub Actions APK Builder */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-950/40">
              <Package className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-black text-white tracking-tight">
                  Компиляция Android APK через GitHub Actions
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Cloud CI/CD
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Автоматическая облачная компиляция настоящего установочного файла <b>.apk</b> на виртуальных машинах GitHub (Ubuntu + Java 17 + Android SDK 34 + Gradle).
              </p>
            </div>
          </div>

          {/* Quick External Links */}
          <div className="flex items-center gap-2 flex-wrap">
            <a
              id="link-gh-actions-page"
              href={ghActionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all shadow active:scale-95"
            >
              <GitBranch className="w-4 h-4 text-emerald-400" />
              <span>GitHub Actions</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <a
              id="link-gh-releases-page"
              href={ghReleasesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 transition-all shadow active:scale-95"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Релизы APK</span>
              <ExternalLink className="w-3 h-3 text-emerald-400" />
            </a>
          </div>
        </div>

        {/* Status Toast / Alert */}
        {statusMessage && (
          <div className={`mt-4 p-3 rounded-xl border flex items-center gap-3 text-xs sm:text-sm animate-in fade-in duration-200 ${
            statusMessage.type === "success" 
              ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-200" 
              : statusMessage.type === "error"
              ? "bg-red-950/70 border-red-500/50 text-red-200"
              : "bg-blue-950/70 border-blue-500/50 text-blue-200"
          }`}>
            {statusMessage.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {statusMessage.type === "error" && <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
            {statusMessage.type === "info" && <RefreshCw className="w-5 h-5 text-blue-400 shrink-0 animate-spin" />}
            <span className="flex-1">{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Direct Fix Alert: "Why is there no build in GitHub Actions?" */}
      <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-amber-200">
                В GitHub Actions нет пункта «build» или пусто на вкладке Actions?
              </h2>
              <p className="text-[11px] text-amber-300/80">
                Почему это происходит и как добавить автоматическую сборку за 1 минуту:
              </p>
            </div>
          </div>

          {hasCheckedWorkflows && (
            <div className="shrink-0">
              {detectedWorkflows.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Workflows найдены ({detectedWorkflows.length})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  <span>Workflows в репозитории пока не найдены</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* 3 Steps Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-2.5">
            <div>
              <div className="flex items-center gap-2 text-white font-bold mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px]">1</span>
                <span>Папка .github не загрузилась</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Если вы перетаскивали файлы в GitHub через браузер (кнопка <i>Upload files</i>), сайт GitHub <b>автоматически игнорирует скрытые папки с точкой (.github)</b>, поэтому воркфлоу не создался.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/80">
              <a
                id="btn-quick-create-gh-workflow"
                href={createWorkflowDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] transition-all active:scale-95 text-center shadow"
              >
                <span>Создать build.yml в GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-2.5">
            <div>
              <div className="flex items-center gap-2 text-white font-bold mb-1">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[11px]">2</span>
                <span>Скопируйте код YAML</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                На открывшейся в GitHub странице вставьте готовый код манифеста и внизу нажмите зеленую кнопку <b>«Commit changes»</b>.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                id="btn-copy-yaml-quick"
                onClick={handleCopyYaml}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] border border-slate-700 transition-all active:scale-95"
              >
                {isCopiedYaml ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Код скопирован!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-emerald-400" />
                    <span>Скопировать готовый YAML</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-2.5">
            <div>
              <div className="flex items-center gap-2 text-white font-bold mb-1">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[11px]">3</span>
                <span>Проверьте настройки Actions</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                В некоторых репозиториях GitHub Actions по умолчанию выключен. Проверьте переключатель <i>«Allow all actions»</i> в настройках.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/80">
              <a
                id="btn-open-gh-actions-settings"
                href={ghSettingsActionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] border border-slate-700 transition-all active:scale-95 text-center"
              >
                <span>Настройки Actions</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Control Panel & Workflow Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Repo & Build Trigger (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Параметры репозитория GitHub
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {repoOwner}/{repoName}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Владелец (GitHub Username / Org)
                </label>
                <input
                  id="input-gh-owner"
                  type="text"
                  value={repoOwner}
                  onChange={(e) => setRepoOwner(e.target.value)}
                  placeholder="allkost73"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Имя репозитория
                </label>
                <input
                  id="input-gh-repo"
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="sitrak-s7h-diagnostics"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ветка Git
                </label>
                <input
                  id="input-gh-branch"
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Тип сборки APK
                </label>
                <select
                  id="select-gh-build-type"
                  value={buildType}
                  onChange={(e) => setBuildType(e.target.value as "release" | "debug")}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="release">Release (Оптимизированный)</option>
                  <option value="debug">Debug (Для отладки)</option>
                </select>
              </div>
            </div>

            {/* Personal Access Token Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowTokenInput(!showTokenInput)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{showTokenInput ? "Скрыть GitHub Personal Access Token" : "Указать GitHub Token для прямого запуска через кнопку"}</span>
              </button>

              {showTokenInput && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    GitHub Personal Access Token (classic или fine-grained с правами 'actions:write')
                  </label>
                  <input
                    id="input-gh-token"
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    Токен хранится локально в браузере. Без токена сборка запускается обычным <code className="text-emerald-300">git push origin main</code>.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                id="btn-trigger-gh-workflow"
                onClick={handleTriggerWorkflow}
                disabled={isTriggering}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-950/50 transition-all active:scale-95 disabled:opacity-50"
              >
                {isTriggering ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Отправка команды...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Запустить сборку APK в GitHub Actions</span>
                  </>
                )}
              </button>

              <button
                id="btn-check-gh-status"
                onClick={() => checkWorkflowStatus(false)}
                disabled={isCheckingStatus}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all active:scale-95 disabled:opacity-50"
                title="Обновить статус сборки"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-400 ${isCheckingStatus ? "animate-spin" : ""}`} />
                <span>Проверить статус</span>
              </button>

              <button
                id="btn-save-gh-settings"
                onClick={handleSaveRepoSettings}
                className="px-3 py-3 rounded-xl font-semibold text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-all"
                title="Сохранить настройки"
              >
                Сохранить
              </button>
            </div>
          </div>

          {/* Quick Guide */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>3 простых шага для сборки APK</span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <b className="text-slate-100">Workflow файл уже создан в репозитории:</b>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Файл <code className="text-emerald-300">.github/workflows/build-apk.yml</code> находится в корне проекта и готов к работе.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <b className="text-slate-100">Запуск компиляции:</b>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Сделайте <code className="text-amber-300">git push origin main</code> или нажмите зеленую кнопку выше. GitHub автоматически запустит сборку на виртуальной машине.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <b className="text-slate-100">Скачивание готового APK:</b>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    По завершении сборки (обычно 2–3 минуты) перейдите в раздел <b>Actions &rarr; Artifacts</b> или <b>Releases</b> и установите файл <code className="text-emerald-300">sitrak-s7h-diagnostics.apk</code> на устройство.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Status & Artifacts (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Текущий статус GitHub Actions
                </h2>
              </div>
              <button
                onClick={() => checkWorkflowStatus(false)}
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingStatus ? "animate-spin" : ""}`} />
                <span>Обновить</span>
              </button>
            </div>

            {latestRun ? (
              <div className="space-y-3.5">
                {/* Status Indicator Card */}
                <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
                  latestRun.conclusion === "success"
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : latestRun.conclusion === "failure"
                    ? "bg-red-950/40 border-red-500/40 text-red-300"
                    : "bg-blue-950/40 border-blue-500/40 text-blue-300"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {latestRun.conclusion === "success" && (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span>Сборка завершена успешно!</span>
                        </>
                      )}
                      {latestRun.conclusion === "failure" && (
                        <>
                          <XCircle className="w-5 h-5 text-red-400" />
                          <span>Сборка завершилась ошибкой</span>
                        </>
                      )}
                      {!latestRun.conclusion && (
                        <>
                          <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                          <span>Сборка выполняется ({latestRun.status})...</span>
                        </>
                      )}
                    </div>
                    <span className="text-[10px] font-mono opacity-80">
                      Run #{latestRun.id}
                    </span>
                  </div>

                  {latestRun.head_commit && (
                    <div className="text-xs text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500">Коммит: </span>
                      <span className="font-mono text-[11px] text-amber-300">
                        {latestRun.head_commit.id.slice(0, 7)}
                      </span>
                      <p className="mt-0.5 truncate text-slate-300">
                        {latestRun.head_commit.message}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Ветка: <b className="text-slate-200">{latestRun.head_branch}</b></span>
                    <span>{new Date(latestRun.created_at).toLocaleTimeString()}</span>
                  </div>

                  {/* Actions inside status card */}
                  <div className="flex items-center gap-2 pt-2">
                    <a
                      href={latestRun.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors text-center"
                    >
                      <span>Открыть ошибку в GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    {latestRun.conclusion === "success" && (
                      <a
                        href={`${latestRun.html_url}#artifacts`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95 text-center"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Скачать APK</span>
                      </a>
                    )}
                  </div>

                  {latestRun.conclusion === "failure" && (
                    <div className="mt-2.5 p-3 rounded-xl bg-slate-950/90 border border-red-500/30 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 text-red-300 font-bold">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>Причина красного крестика и решение:</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        В предыдущей версии манифеста сборка падала из-за отсутствия файла кэша <code className="text-amber-300">package-lock.json</code> либо конфликта версий Android SDK. Мы исправили код workflow!
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <a
                          href={editWorkflowDirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-500/40 text-red-200 text-[11px] font-semibold transition-colors text-center"
                        >
                          <span>Редактировать build.yml в GitHub</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          type="button"
                          onClick={handleCopyYaml}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors"
                        >
                          {isCopiedYaml ? (
                            <span className="text-emerald-400">Скопировано!</span>
                          ) : (
                            <span>Скопировать исправленный код</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
                <Package className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-medium text-slate-300">
                  Нет данных о последних сборках
                </p>
                <p className="text-[11px] text-slate-500">
                  Убедитесь, что репозиторий <code className="text-slate-400">{repoOwner}/{repoName}</code> существует и на нем настроен GitHub Actions.
                </p>
              </div>
            )}

            {/* Android Feature Highlights */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Что встроено в генерируемый APK:</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-400 pl-1">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400" />
                  Прямой Bluetooth SPP доступ к ELM327 / ELM375
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400" />
                  WakeLock: экран тягача не гаснет во время рейса
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400" />
                  Полный опрос 7 блоков ЭБУ (EDC17, TraXon, EBS3 и др.)
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400" />
                  Офлайн-база ошибок DTC Sinotruk & WABCO EC-APU
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: YAML Workflow Viewer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">
              Конфигурация GitHub Actions: <code className="text-emerald-400 font-mono text-xs">.github/workflows/build-apk.yml</code>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-copy-workflow-yaml"
              onClick={handleCopyYaml}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95"
            >
              {isCopiedYaml ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Копировать YAML</span>
                </>
              )}
            </button>

            <button
              id="btn-download-workflow-yaml"
              onClick={handleDownloadYaml}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать файл</span>
            </button>
          </div>
        </div>

        {/* YAML Code Container */}
        <div className="relative rounded-xl bg-slate-950 border border-slate-800/80 p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-72 overflow-y-auto leading-relaxed scrollbar-thin">
          <pre className="text-[11px] sm:text-xs">
            {WORKFLOW_YAML}
          </pre>
        </div>
      </div>
    </div>
  );
};

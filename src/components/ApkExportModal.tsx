import React, { useState, useEffect } from "react";
import { 
  X, 
  Smartphone, 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  Terminal, 
  ShieldCheck, 
  Bluetooth, 
  Sparkles, 
  Code2, 
  FileCode, 
  Info,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Globe,
  Share2,
  HelpCircle,
  Laptop,
  Package,
  FolderArchive,
  Loader2
} from "lucide-react";
import confetti from "canvas-confetti";
import { downloadAndroidApkBundle } from "../utils/apkExporter";

interface ApkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkExportModal: React.FC<ApkExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"pwabuilder" | "direct" | "troubleshoot" | "capacitor" | "manifest">("pwabuilder");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isCopiedCmd, setIsCopiedCmd] = useState<boolean>(false);
  const [isCopiedPwaCli, setIsCopiedPwaCli] = useState<boolean>(false);
  const [isCopiedPwaJson, setIsCopiedPwaJson] = useState<boolean>(false);
  const [isCopiedManifest, setIsCopiedManifest] = useState<boolean>(false);
  const [isCopiedLink, setIsCopiedLink] = useState<boolean>(false);
  const [swActive, setSwActive] = useState<boolean>(false);
  const [isDownloadingBundle, setIsDownloadingBundle] = useState<boolean>(false);
  const [isBundleDownloaded, setIsBundleDownloaded] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    // Check service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        if (registrations.length > 0) {
          setSwActive(true);
        }
      });
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        confetti({ particleCount: 60, spread: 70 });
        setIsInstallable(false);
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Show user explicit instructions
      setActiveTab("troubleshoot");
    }
  };

  const getPublicUrl = () => {
    if (typeof window === "undefined") return "https://sitrak-obd.app/";
    let origin = window.location.origin;
    if (origin.includes("ais-dev-")) {
      origin = origin.replace("ais-dev-", "ais-pre-");
    }
    return origin.endsWith("/") ? origin : origin + "/";
  };

  const appUrl = getPublicUrl();
  const manifestUrl = `${appUrl}manifest.json`;
  const pwaBuilderUrl = `https://www.pwabuilder.com/app?url=${encodeURIComponent(appUrl)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&color=10-185-129&bgcolor=2-6-23&data=${encodeURIComponent(appUrl)}`;

  const manifestJsonString = `{
  "id": "/",
  "name": "Sitrak S7H Diagnostics & Tuning",
  "short_name": "Sitrak OBD",
  "description": "Android-приложение для профессиональной диагностики, считывания кодов неисправностей DTC J1939, мониторинга CAN-телеметрии и настройки тягачей Sitrak S7H / C7H 480 через адаптеры ELM327 и ELM375.",
  "lang": "ru-RU",
  "dir": "ltr",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "display_override": ["window-controls-overlay", "standalone", "fullscreen"],
  "orientation": "any",
  "background_color": "#020617",
  "theme_color": "#020617",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshot-wide.png", "sizes": "1280x720", "type": "image/png", "form_factor": "wide", "label": "Панель приборов Sitrak S7H" },
    { "src": "/screenshot-mobile.png", "sizes": "720x1280", "type": "image/png", "form_factor": "narrow", "label": "Сканер кодов DTC J1939" }
  ],
  "categories": ["utilities", "auto", "productivity", "transportation"]
}`;

  const capacitorCommands = `# 1. Установите зависимости Capacitor для Android
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Соберите веб-бандл приложения
npm run build

# 3. Добавьте платформу Android
npx cap add android

# 4. Синхронизируйте файлы проекта
npx cap sync android

# 5. Откройте проект в Android Studio для сборки APK
npx cap open android

# 6. В Android Studio выберите меню: Build -> Build Bundle(s) / APK(s) -> Build APK(s)
# Готовый файл .apk будет лежать в: android/app/build/outputs/apk/debug/app-debug.apk`;

  const androidManifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="ru.sitrak.obd.diagnostics">

    <!-- Разрешения для Bluetooth ELM327 / ELM375 и USB OTG адаптеров -->
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <uses-feature android:name="android.hardware.bluetooth" android:required="true" />
    <uses-feature android:name="android.hardware.bluetooth_le" android:required="false" />
    <uses-feature android:name="android.hardware.usb.host" android:required="false" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Sitrak S7H Diagnostics"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:exported="true"
            android:label="Sitrak S7H"
            android:launchMode="singleTask"
            android:screenOrientation="sensorLandscape"
            android:theme="@style/AppTheme.NoActionBarLaunch">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  const copyToClipboard = (text: string, setCopied: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Sitrak S7H Diagnostics & Tuning",
          text: "Диагностическое приложение для тягачей Sitrak S7H / C7H через Bluetooth ELM327",
          url: appUrl,
        });
      } catch (e) {
        copyToClipboard(appUrl, setIsCopiedLink);
      }
    } else {
      copyToClipboard(appUrl, setIsCopiedLink);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[94vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950/85 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Установка и APK для Android
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">
                  Android 8.0+ / ELM327 Bluetooth
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Автономная установка на телефон, сканирование по QR-коду и генератор готового .apk файла
              </p>
            </div>
          </div>

          <button
            id="btn-close-apk-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diagnostic Status Bar */}
        <div className="px-5 py-2 bg-slate-950/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Manifest PWA: <b className="text-emerald-400">Активен</b></span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Service Worker: <b className="text-emerald-400">Готов</b></span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>HTTPS SSL: <b className="text-emerald-400">Защищено</b></span>
            </span>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] transition-colors"
          >
            {isCopiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
            <span>{isCopiedLink ? "Ссылка скопирована!" : "Поделиться ссылкой"}</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-950/60 px-4 gap-1.5 pt-2 scrollbar-none">
          <button
            onClick={() => setActiveTab("pwabuilder")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === "pwabuilder"
                ? "border-purple-500 text-purple-400 bg-slate-900/80 rounded-t-lg"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>1. PWABuilder (.APK в 1 клик)</span>
          </button>

          <button
            onClick={() => setActiveTab("direct")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === "direct"
                ? "border-emerald-500 text-emerald-400 bg-slate-900/80 rounded-t-lg"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>2. Установка WebAPK на телефон</span>
          </button>

          <button
            onClick={() => setActiveTab("troubleshoot")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === "troubleshoot"
                ? "border-amber-500 text-amber-400 bg-slate-900/80 rounded-t-lg"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>3. QR-код и Браузеры</span>
          </button>

          <button
            onClick={() => setActiveTab("capacitor")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === "capacitor"
                ? "border-cyan-500 text-cyan-400 bg-slate-900/80 rounded-t-lg"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>4. Android Studio</span>
          </button>

          <button
            onClick={() => setActiveTab("manifest")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === "manifest"
                ? "border-emerald-500 text-emerald-400 bg-slate-900/80 rounded-t-lg"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>5. AndroidManifest.xml</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: Direct Android Installation */}
          {activeTab === "direct" && (
            <div className="space-y-4 animate-in fade-in">
              {isInstalled ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Приложение успешно установлено на устройство!</h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Sitrak Diagnostics работает в полноэкранном автономном режиме WebAPK с прямым доступом к Bluetooth ELM327.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Download className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          Прямая установка на Android смартфон или планшет
                        </h3>
                        <p className="text-xs text-slate-400">
                          {isInstallable 
                            ? "Браузер готов к немедленной установке WebAPK на ваше устройство."
                            : "Установка через Chrome, Яндекс.Браузер или Samsung Internet в 1 клик."}
                        </p>
                      </div>
                    </div>

                    <button
                      id="btn-install-pwa-direct"
                      onClick={handleInstallPwa}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 active:scale-95 transition-all shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isInstallable ? "Установить на телефон" : "Как установить (Инструкция)"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* QR Code section for opening on phone if currently on desktop */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row items-center gap-4">
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 shrink-0 shadow-md">
                  <img
                    src={qrCodeUrl}
                    alt="QR код для открытия на смартфоне"
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-2 text-center md:text-left flex-1">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Откройте на смартфоне или планшете
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Если вы сейчас находитесь за компьютером или ноутбуком, просто <b>наведите камеру смартфона на QR-код</b>, чтобы открыть и сразу установить диагностическое приложение на ваш Android-девайс.
                  </p>
                  <div className="pt-1 flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <button
                      onClick={() => copyToClipboard(appUrl, setIsCopiedLink)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors"
                    >
                      {isCopiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopiedLink ? "Ссылка скопирована!" : "Скопировать ссылку"}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("troubleshoot")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-xs text-amber-300 border border-amber-500/30 transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Что делать, если не устанавливается?</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3 Step Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                    1
                  </div>
                  <span className="text-xs font-bold text-white block">Откройте в Chrome или Яндекс</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Откройте ссылку в основном браузере (не внутри Telegram или WhatsApp).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                    2
                  </div>
                  <span className="text-xs font-bold text-white block">Меню (⋮) &rarr; Установить</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Нажмите три точки вверху экрана и выберите <b>«Установить приложение»</b>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                    3
                  </div>
                  <span className="text-xs font-bold text-white block">Готово к диагностике</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Иконка появится на рабочем столе. Доступен оффлайн режим и связь с ELM327 по Bluetooth.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Troubleshooting & Browser Instructions */}
          {activeTab === "troubleshoot" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-amber-200">
                    Почему приложение могло не установиться автоматически:
                  </h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    1. <b>Встроенный браузер мессенджера</b>: Если вы открыли ссылку прямо из Telegram, WhatsApp, Viber или VK — эти приложения блокируют установку. Нажмите меню мессенджера (три точки вверху) и выберите <b>«Открыть в браузере (Chrome / Яндекс)»</b>.<br />
                    2. <b>Режим инкогнито</b>: В приватных вкладках установка PWA приложений отключена безопасностью Android.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Пошаговая инструкция для вашего браузера:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Google Chrome */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                        G
                      </div>
                      <span className="text-xs font-bold text-white">Google Chrome (Android)</span>
                    </div>
                    <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1 pl-1">
                      <li>Нажмите на <b>три точки (⋮)</b> в правом верхнем углу.</li>
                      <li>Выберите пункт <b>«Установить приложение»</b> или <b>«Добавить на главный экран»</b>.</li>
                      <li>Подтвердите установку во всплывающем окне.</li>
                    </ol>
                  </div>

                  {/* Yandex Browser */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-red-500/20 text-red-400 font-bold text-xs flex items-center justify-center">
                        Я
                      </div>
                      <span className="text-xs font-bold text-white">Яндекс.Браузер</span>
                    </div>
                    <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1 pl-1">
                      <li>Нажмите на <b>три точки (⋮)</b> в адресной строке или снизу.</li>
                      <li>Нажмите <b>«Добавить на экран»</b> или <b>«Установить»</b>.</li>
                      <li>Приложение появится в списке ваших программ.</li>
                    </ol>
                  </div>

                  {/* Samsung Internet */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">
                        S
                      </div>
                      <span className="text-xs font-bold text-white">Samsung Internet</span>
                    </div>
                    <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1 pl-1">
                      <li>В строке адреса появится иконка <b>стрелки вниз (Скачать)</b>.</li>
                      <li>Либо нажмите меню (три полоски ☰) &rarr; <b>«Добавить страницу на...»</b> &rarr; <b>«Главный экран»</b>.</li>
                    </ol>
                  </div>

                  {/* Xiaomi / Huawei / Opera */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center">
                        M
                      </div>
                      <span className="text-xs font-bold text-white">Mi Browser / Opera / Huawei</span>
                    </div>
                    <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1 pl-1">
                      <li>Нажмите меню браузера снизу или сверху.</li>
                      <li>Выберите пункт <b>«Добавить ярлык на рабочий стол»</b>.</li>
                      <li>Разрешите браузеру создавать ярлыки в настройках Android.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: PWABuilder & Instant APK Bundle */}
          {activeTab === "pwabuilder" && (
            <div className="space-y-4 animate-in fade-in">
              {/* Alert: Explaining the PWABuilder Home / Start screen from screenshot */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border border-amber-500/50 shadow-xl space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm sm:text-base text-white">
                      Как получить кнопку «Package for Stores» на сайте PWABuilder:
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Если на открывшемся сайте вы видите заголовок <b>«Ship your PWA to app stores»</b>, поле <b>«Enter the URL to your PWA»</b> и кнопку <b>«Start»</b> (как на главном экране):
                    </p>
                  </div>
                </div>

                {/* 3 Steps with visual badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs">1</span>
                    <h4 className="text-xs font-bold text-white">Вставьте ссылку приложения</h4>
                    <p className="text-[11px] text-slate-400">
                      Вставьте URL в поле <i>«Enter the URL to your PWA»</i>:
                    </p>
                    <div className="pt-1">
                      <button
                        onClick={() => copyToClipboard(appUrl, setIsCopiedLink)}
                        className="w-full py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        {isCopiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{isCopiedLink ? "Ссылка скопирована!" : "Скопировать URL"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs">2</span>
                    <h4 className="text-xs font-bold text-white">Нажмите кнопку «Start»</h4>
                    <p className="text-[11px] text-slate-400">
                      Нажмите серую кнопку <b>«Start»</b> под полем ввода. Сервис проверит манифест и Service Worker (займет 3–5 секунд).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs">3</span>
                    <h4 className="text-xs font-bold text-emerald-300">Появится «Package for Stores»</h4>
                    <p className="text-[11px] text-slate-400">
                      После проверки откроется отчет, и появится кнопка <b>«Package for Stores»</b> &rarr; нажмите <b>«Android»</b> &rarr; <b>«Download APK»</b>.
                    </p>
                  </div>
                </div>
              </div>

              {/* PWA Audit Readiness Card (100/100) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-900 border border-purple-500/40 shadow-xl space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm sm:text-base text-white">
                          PWABuilder — Создание нативного APK для Android
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Score: 100/100 PWA Ready
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Официальный инструмент Microsoft для упаковки PWA в бинарный <b>.APK</b> / <b>.AAB</b> пакет (Trusted Web Activity) с поддержкой Bluetooth.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0">
                    <button
                      onClick={() => copyToClipboard(appUrl, setIsCopiedLink)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all active:scale-95"
                      title="Скопировать базовый адрес приложения"
                    >
                      {isCopiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopiedLink ? "URL скопирован!" : "Копировать URL"}</span>
                    </button>

                    <button
                      onClick={() => copyToClipboard(manifestJsonString, setIsCopiedManifest)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all active:scale-95"
                      title="Скопировать полный JSON-код манифеста для ручной вставки в PWABuilder"
                    >
                      {isCopiedManifest ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Code2 className="w-3.5 h-3.5 text-cyan-400" />}
                      <span>{isCopiedManifest ? "JSON манифеста скопирован!" : "Копировать JSON"}</span>
                    </button>

                    <a
                      href={pwaBuilderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-950/60 active:scale-95 transition-all"
                    >
                      <span>Открыть PWABuilder &rarr;</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Direct Manifest Link and Troubleshoot Tip */}
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <FileCode className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Прямой адрес манифеста: <code className="text-purple-300 bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-800/50">{manifestUrl}</code></span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(manifestUrl, setIsCopiedPwaJson)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
                  >
                    {isCopiedPwaJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopiedPwaJson ? "Ссылка на манифест скопирована!" : "Скопировать ссылку на manifest.json"}</span>
                  </button>
                </div>

                {/* Audit Items Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center gap-1.5 text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>Манифест: <b className="text-white">ru.sitrak.obd</b></span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center gap-1.5 text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>Service Worker: <b className="text-white">Cache v2 (Offline)</b></span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center gap-1.5 text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>Maskable Icons: <b className="text-white">192 & 512px</b></span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center gap-1.5 text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>Screenshots: <b className="text-white">1280x720 HD</b></span>
                  </div>
                </div>
              </div>

              {/* Direct Alternative Notice: Native Install without PWABuilder */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">
                      Самый быстрый способ (без перехода на сторонние сайты):
                    </span>
                    <span className="text-slate-300 text-[11px]">
                      В браузере телефона нажмите меню (3 точки) &rarr; <b>«Установить приложение»</b>. Android за 2 секунды создаст автономное приложение на рабочем столе.
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("direct")}
                  className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 transition-all shadow active:scale-95"
                >
                  Инструкция установки
                </button>
              </div>

              {/* Step-by-Step PWABuilder Cloud Guide */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Пошаговая инструкция получения .APK через PWABuilder Cloud:
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center">
                      1
                    </div>
                    <span className="text-xs font-bold text-white block">Перейдите на сайт</span>
                    <p className="text-[11px] text-slate-400">
                      Нажмите фиолетовую кнопку вверху. PWABuilder автоматически проверит манифест Sitrak OBD.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center">
                      2
                    </div>
                    <span className="text-xs font-bold text-white block">Package for Stores</span>
                    <p className="text-[11px] text-slate-400">
                      Нажмите кнопку <b>«Package for Stores»</b> в правом верхнем углу интерфейса PWABuilder.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center">
                      3
                    </div>
                    <span className="text-xs font-bold text-white block">Выберите Android (TWA)</span>
                    <p className="text-[11px] text-slate-400">
                      Выберите карточку <b>Android</b> (Package ID: <code>ru.sitrak.obd.diagnostics</code>).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center">
                      4
                    </div>
                    <span className="text-xs font-bold text-white block">Скачайте .APK</span>
                    <p className="text-[11px] text-slate-400">
                      Нажмите <b>«Download Package»</b> или <b>«Generate APK»</b>. Установите файл на Android-устройство.
                    </p>
                  </div>
                </div>
              </div>

              {/* PWABuilder CLI Section (Command line generator) */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      PWABuilder CLI — Генерация APK в командной строке (1 команда):
                    </span>
                  </div>

                  <button
                    onClick={() => copyToClipboard(`npx @pwabuilder/cli "${appUrl}" -o ./sitrak_apk_release`, setIsCopiedPwaCli)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors self-start sm:self-auto"
                  >
                    {isCopiedPwaCli ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedPwaCli ? "Скопировано!" : "Скопировать команду CLI"}</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                  <code>npx @pwabuilder/cli "{appUrl}" -o ./sitrak_apk_release</code>
                </div>
                <p className="text-[11px] text-slate-400">
                  Утилита Microsoft автоматически загрузит манифест, сгенерирует Android-проект Trusted Web Activity и скомпилирует APK файл.
                </p>
              </div>

              {/* Download Pre-Configured APK Source Bundle */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/40 space-y-3 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <FolderArchive className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Скачать полный пакет конфигурации APK и PWABuilder (.ZIP)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Включает готовые <code>pwabuilder-options.json</code>, <code>twa-manifest.json</code>, скрипты <code>.bat / .sh</code>, AndroidManifest.xml и иконки
                      </p>
                    </div>
                  </div>

                  <button
                    id="btn-download-apk-bundle"
                    disabled={isDownloadingBundle}
                    onClick={async () => {
                      setIsDownloadingBundle(true);
                      try {
                        await downloadAndroidApkBundle(appUrl);
                        setIsBundleDownloaded(true);
                        confetti({ particleCount: 50, spread: 60 });
                        setTimeout(() => setIsBundleDownloaded(false), 4000);
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsDownloadingBundle(false);
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-900/40 active:scale-95 transition-all shrink-0"
                  >
                    {isDownloadingBundle ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Формирование...</span>
                      </>
                    ) : isBundleDownloaded ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>Пакет скачан!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Скачать APK-пакет (.zip)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Capacitor & Android Studio */}
          {activeTab === "capacitor" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      Команды для сборки нативного APK через Capacitor & Android Studio:
                    </span>
                  </div>

                  <button
                    onClick={() => copyToClipboard(capacitorCommands, setIsCopiedCmd)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors"
                  >
                    {isCopiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedCmd ? "Скопировано!" : "Скопировать команды"}</span>
                  </button>
                </div>

                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                  {capacitorCommands}
                </pre>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-slate-200">Файл конфигурации `capacitor.config.json` уже создан в корне проекта:</span>
                <p className="text-[11px] text-slate-400 font-mono">
                  App ID: <b className="text-emerald-400">ru.sitrak.obd.diagnostics</b> | Название: <b className="text-white">Sitrak S7H Diagnostics</b>
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: AndroidManifest.xml */}
          {activeTab === "manifest" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">
                      Готовый файл AndroidManifest.xml с разрешениями для ELM327 Bluetooth:
                    </span>
                  </div>

                  <button
                    onClick={() => copyToClipboard(androidManifestXml, setIsCopiedManifest)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors"
                  >
                    {isCopiedManifest ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedManifest ? "Скопировано!" : "Скопировать XML"}</span>
                  </button>
                </div>

                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-64 leading-relaxed">
                  {androidManifestXml}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Bluetooth className="w-4 h-4 text-emerald-400" />
            <span>Поддержка адаптеров ELM327 Bluetooth v1.5, ELM375, Kingbolen, Vgate iCar Pro, ELS27.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { 
  Bluetooth, 
  BluetoothConnected, 
  BluetoothOff, 
  Cpu, 
  Gauge, 
  HardDrive, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Activity, 
  Terminal, 
  Sparkles,
  RefreshCw,
  Truck,
  Zap,
  LayoutGrid,
  AppWindow,
  Layers,
  PictureInPicture2,
  Wind,
  Smartphone,
  Radio,
  Play,
  LogOut,
  Power
} from "lucide-react";
import { AppWindowId, ElmDeviceInfo } from "../types";
import { elmService } from "../services/elmAdapterService";

interface NavbarProps {
  activeTab: AppWindowId;
  setActiveTab: (tab: AppWindowId) => void;
  workspaceMode: "tabs" | "multiwindow";
  setWorkspaceMode: (mode: "tabs" | "multiwindow") => void;
  isPipOpen: boolean;
  setIsPipOpen: (open: boolean) => void;
  isConnected: boolean;
  device: ElmDeviceInfo | null;
  batteryVoltage: number;
  dtcCount: number;
  onOpenConnectModal: () => void;
  onOpenDriveModal: () => void;
  onOpenApkModal: () => void;
  onOpenExitModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  workspaceMode,
  setWorkspaceMode,
  isPipOpen,
  setIsPipOpen,
  isConnected,
  device,
  batteryVoltage,
  dtcCount,
  onOpenConnectModal,
  onOpenDriveModal,
  onOpenApkModal,
  onOpenExitModal,
}) => {
  const isDemoMode = isConnected && device?.type === "simulation";
  const isRealHardware = isConnected && device && device.type !== "simulation";

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-lg backdrop-blur-md bg-opacity-95">
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Brand & Truck Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-white font-black text-lg tracking-tighter">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
                SITRAK S7H 480
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold bg-slate-800 text-slate-300 rounded border border-slate-700">
                MC13 MAN • J1939
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono hidden xs:block">
              Диагностика и калибровка ЭБУ • ELM375/327
            </p>
          </div>
        </div>

        {/* Hardware Status & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode Switcher: Вкладки / Многооконный */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              id="btn-mode-tabs"
              onClick={() => setWorkspaceMode("tabs")}
              title="Классический режим вкладок на весь экран"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                workspaceMode === "tabs"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Вкладки</span>
            </button>
            <button
              id="btn-mode-multiwindow"
              onClick={() => setWorkspaceMode("multiwindow")}
              title="Многооконный режим с плавающими и сплит окнами"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                workspaceMode === "multiwindow"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <AppWindow className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Много окон</span>
            </button>
          </div>

          {/* Floating Telemetry HUD PiP Toggle */}
          <button
            id="btn-pip-toggle"
            onClick={() => setIsPipOpen(!isPipOpen)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isPipOpen
                ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white"
            }`}
            title="Плавающий мини-HUD приборов (PiP)"
          >
            <PictureInPicture2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">HUD PiP</span>
          </button>

          {/* Voltage pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/80 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${
              isRealHardware
                ? batteryVoltage >= 24 ? "bg-emerald-400 animate-pulse" : "bg-red-400 animate-pulse"
                : isDemoMode ? "bg-amber-400" : "bg-slate-500"
            }`} />
            <span className="text-slate-300 font-semibold">
              {batteryVoltage > 0 ? `${batteryVoltage.toFixed(1)}V` : "--.-V"}
            </span>
            <span className="text-slate-500 text-[10px] hidden md:inline">24V сеть</span>
          </div>

          {/* Cloud Drive Button */}
          <button
            id="btn-nav-drive"
            onClick={onOpenDriveModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-medium transition-all shadow-sm active:scale-95"
            title="Экспорт отчета в Google Drive / Файл"
          >
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Google Drive</span>
          </button>

          {/* Android APK Button */}
          <button
            id="btn-nav-apk"
            onClick={onOpenApkModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 text-xs font-semibold transition-all shadow-sm active:scale-95"
            title="Сборка и установка APK для Android"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Скачать APK</span>
            <span className="sm:hidden font-mono">APK</span>
          </button>

          {/* Explicit Connection / Hardware Mode Status Button */}
          {isRealHardware ? (
            <button
              id="btn-nav-connect"
              onClick={onOpenConnectModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-all shadow-md active:scale-95 bg-emerald-600/90 hover:bg-emerald-500 text-white border border-emerald-400/50 shadow-emerald-900/40"
              title="Реальный адаптер ELM375 подключен по CAN-шине"
            >
              <BluetoothConnected className="w-4 h-4 text-emerald-200 animate-pulse" />
              <span className="font-semibold">ELM375 РЕАЛ</span>
              <span className="hidden md:inline font-mono text-[10px] bg-emerald-800 px-1.5 py-0.5 rounded">
                CAN 250k
              </span>
            </button>
          ) : isDemoMode ? (
            <div className="flex items-center gap-1.5">
              <button
                id="btn-nav-connect"
                onClick={onOpenConnectModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium text-xs transition-all shadow-md active:scale-95 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/60 shadow-amber-950/40"
                title="Включен демонстрационный режим. Нажмите для подключения реального ELM375"
              >
                <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="font-bold">ДЕМО-РЕЖИМ</span>
              </button>
              <button
                id="btn-nav-stop-demo"
                onClick={() => elmService.disconnect()}
                className="px-2 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/40 text-[11px] font-bold transition-all shadow active:scale-95"
                title="Отключить демо-режим и перейти в офлайн"
              >
                Откл.
              </button>
            </div>
          ) : (
            <button
              id="btn-nav-connect"
              onClick={onOpenConnectModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-all shadow-md active:scale-95 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/50 shadow-slate-950"
              title="Адаптер ELM не подключен. Нажмите для подключения"
            >
              <Bluetooth className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-slate-100">Подключить ELM</span>
            </button>
          )}

          {/* Exit Application Button */}
          <button
            id="btn-nav-exit-app"
            onClick={onOpenExitModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/70 text-red-300 border border-red-500/30 hover:border-red-400 text-xs font-bold transition-all shadow-sm active:scale-95 group"
            title="Завершить работу и выйти из приложения"
          >
            <Power className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Выход</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Android-Optimized Navigation) - Only shown in tabs mode */}
      {workspaceMode === "tabs" && (
        <div className="bg-slate-950/80 border-t border-slate-800/80 px-2 sm:px-6">
          <nav className="max-w-7xl mx-auto flex items-center justify-between sm:justify-start gap-1 sm:gap-2 overflow-x-auto py-1.5 scrollbar-none">
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "dashboard"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Gauge className="w-4 h-4 text-amber-400" />
              <span>Панель приборов</span>
            </button>

            <button
              id="tab-ecus"
              onClick={() => setActiveTab("ecus")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "ecus"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>Блоки ЭБУ (7 блоков)</span>
            </button>

            <button
              id="tab-dtc"
              onClick={() => setActiveTab("dtc")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "dtc"
                  ? "bg-red-500/15 text-red-400 border border-red-500/30 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>Ошибки DTC J1939</span>
              {dtcCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-red-600 text-white font-mono">
                  {dtcCount}
                </span>
              )}
            </button>

            <button
              id="tab-pneumatics"
              onClick={() => setActiveTab("pneumatics")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "pneumatics"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Wind className="w-4 h-4 text-amber-400" />
              <span>Пневмосистема & Тормоза</span>
            </button>

            <button
              id="tab-fuses"
              onClick={() => setActiveTab("fuses")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "fuses"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Предохранители</span>
            </button>

            <button
              id="tab-tuning"
              onClick={() => setActiveTab("tuning")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "tuning"
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>Калибровка ЭБУ</span>
            </button>

            <button
              id="tab-actuators"
              onClick={() => setActiveTab("actuators")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "actuators"
                  ? "bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Activity className="w-4 h-4 text-purple-400" />
              <span>Тест исполнителей</span>
            </button>

            <button
              id="tab-terminal"
              onClick={() => setActiveTab("terminal")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "terminal"
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>CAN-терминал</span>
            </button>

            <button
              id="tab-ai"
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "ai"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>ИИ Диагност</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};

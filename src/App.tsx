import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { BottomMobileNav } from "./components/BottomMobileNav";
import { DashboardView } from "./components/DashboardView";
import { EcuStatusView } from "./components/EcuStatusView";
import { DtcScannerView } from "./components/DtcScannerView";
import { FusesView } from "./components/FusesView";
import { TuningView } from "./components/TuningView";
import { PneumaticsBrakeView } from "./components/PneumaticsBrakeView";
import { ActuatorsView } from "./components/ActuatorsView";
import { TerminalView } from "./components/TerminalView";
import { AiAdvisorView } from "./components/AiAdvisorView";
import { MultiWindowWorkspace } from "./components/MultiWindowWorkspace";
import { MiniTelemetryPip } from "./components/MiniTelemetryPip";
import { BluetoothConnectModal } from "./components/BluetoothConnectModal";
import { DriveExportModal } from "./components/DriveExportModal";
import { ApkExportModal } from "./components/ApkExportModal";
import { AppExitModal } from "./components/AppExitModal";
import { elmService } from "./services/elmAdapterService";
import { AppWindowId, DtcFault, ElmDeviceInfo, TelemetryData, TruckConfig, TruckProfile } from "./types";
import { INITIAL_DTC_LIST, INITIAL_TRUCK_CONFIG, INITIAL_TRUCK_PROFILE } from "./data/sitrakData";
import { Radio, Bluetooth, CheckCircle2, Zap, X, AlertTriangle } from "lucide-react";

export default function App() {
  const [workspaceMode, setWorkspaceModeState] = useState<"tabs" | "multiwindow">(() => {
    try {
      const saved = localStorage.getItem("sitrak_workspace_mode");
      if (saved === "tabs" || saved === "multiwindow") return saved;
    } catch {}
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return "tabs";
    }
    return "multiwindow";
  });

  const setWorkspaceMode = (mode: "tabs" | "multiwindow") => {
    setWorkspaceModeState(mode);
    try {
      localStorage.setItem("sitrak_workspace_mode", mode);
    } catch {}
  };
  const [isPipOpen, setIsPipOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<AppWindowId>("dashboard");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [device, setDevice] = useState<ElmDeviceInfo | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData>(elmService.getCurrentTelemetry());
  const [dtcs, setDtcs] = useState<DtcFault[]>(INITIAL_DTC_LIST);
  const [config, setConfig] = useState<TruckConfig>(INITIAL_TRUCK_CONFIG);
  const [profile, setProfile] = useState<TruckProfile>(INITIAL_TRUCK_PROFILE);

  // Modal states
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState<boolean>(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [aiSelectedPrompt, setAiSelectedPrompt] = useState<string | undefined>(undefined);

  // Subscribe to ELM service updates
  useEffect(() => {
    const unsubConn = elmService.onConnectionChange((connected, dev) => {
      setIsConnected(connected);
      setDevice(dev);
    });

    const unsubTelem = elmService.onTelemetry((data) => {
      setTelemetry(data);
    });

    return () => {
      unsubConn();
      unsubTelem();
    };
  }, []);

  const handleAskAiForDtc = React.useCallback((fault: DtcFault) => {
    setAiSelectedPrompt(
      `Проанализируй ошибку "${fault.code}: ${fault.title}" на тягаче Sitrak S7H (ЭБУ ${fault.ecuName}).\nСимптомы: ${fault.symptoms.join(", ")}.\nКаковы первоочередные шаги проверки проводки и датчика мультиметром, типичные места перетирания жгутов на раме Sitrak, и как устранить неисправность?`
    );
    if (workspaceMode === "tabs") {
      setActiveTab("ai");
    }
  }, [workspaceMode]);

  const handleAskAiForFuse = React.useCallback((fuseSlot: string, circuitName: string) => {
    setAiSelectedPrompt(
      `Подскажи подробную электрическую схему и поиск неисправностей по цепи предохранителя ${fuseSlot} ("${circuitName}") на тягаче Sitrak S7H 480.\nКакие точки замера напряжения мультиметром, через какие промежуточные разъемы проходит жгут и какие типичные причины перегорания этого предохранителя?`
    );
    if (workspaceMode === "tabs") {
      setActiveTab("ai");
    }
  }, [workspaceMode]);

  const isDemo = isConnected && device?.type === "simulation";
  const isReal = isConnected && device && device.type !== "simulation";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-amber-500 selection:text-slate-950 antialiased">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        workspaceMode={workspaceMode}
        setWorkspaceMode={setWorkspaceMode}
        isPipOpen={isPipOpen}
        setIsPipOpen={setIsPipOpen}
        isConnected={isConnected}
        device={device}
        batteryVoltage={telemetry.batteryVoltage}
        dtcCount={dtcs.filter((d) => d.status === "active").length}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        onOpenApkModal={() => setIsApkModalOpen(true)}
        onOpenExitModal={() => setIsExitModalOpen(true)}
      />

      {/* Global Connection / Mode Status Banner */}
      <div className="w-full max-w-[1720px] mx-auto px-2 sm:px-4 pt-2">
        {isDemo ? (
          <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <Radio className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span>
                <b>ВНИМАНИЕ: Включен ДЕМО-РЕЖИМ (Эмулятор CAN Sitrak).</b> Данные приборов генерируются виртуально. Для реальной диагностики подключите сканер <b>ELM375</b> или <b>ELM327</b> к диагностическому разъему тягача.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                id="btn-banner-connect-real"
                onClick={() => setIsConnectModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all active:scale-95 shadow"
              >
                Подключить реальный ELM375
              </button>
              <button
                id="btn-banner-exit-demo"
                onClick={() => elmService.disconnect()}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all"
                title="Отключить эмулятор"
              >
                Отключить демо
              </button>
            </div>
          </div>
        ) : !isConnected ? (
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <Bluetooth className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <b>Сканер не подключен.</b> Включите зажигание Sitrak и выберите адаптер для подключения, или включите демо-режим для ознакомления.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                id="btn-banner-connect-elm"
                onClick={() => setIsConnectModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all active:scale-95 shadow flex items-center gap-1.5"
              >
                <Bluetooth className="w-3.5 h-3.5" />
                <span>Подключить ELM375</span>
              </button>
              <button
                id="btn-banner-start-demo"
                onClick={() => elmService.connectSimulator("J1939_250K")}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition-all flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Включить Демо</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <b>РЕАЛЬНЫЙ АДАПТЕР ELM375 АКТИВЕН.</b> Прямое считывание шины SAE J1939 (29-bit CAN, 250k) тягача Sitrak S7H.
              </span>
            </div>
            <span className="font-mono font-bold bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-300 text-[11px]">
              {telemetry.batteryVoltage > 0 ? `${telemetry.batteryVoltage}V` : "24V CAN"}
            </span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full mx-auto p-2 sm:p-4 max-w-[1720px]">
        {workspaceMode === "multiwindow" ? (
          <MultiWindowWorkspace
            telemetry={telemetry}
            isConnected={isConnected}
            device={device}
            dtcs={dtcs}
            setDtcs={setDtcs}
            config={config}
            setConfig={setConfig}
            profile={profile}
            aiPrompt={aiSelectedPrompt}
            onAskAiForDtc={handleAskAiForDtc}
            onAskAiForFuse={handleAskAiForFuse}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            onOpenDriveModal={() => setIsDriveModalOpen(true)}
            onSwitchToTabsMode={(tabId) => {
              if (tabId) setActiveTab(tabId);
              setWorkspaceMode("tabs");
            }}
          />
        ) : (
          <div className="max-w-7xl mx-auto">
            {activeTab === "dashboard" && (
              <DashboardView
                telemetry={telemetry}
                isConnected={isConnected}
                onNavigateToDtc={() => setActiveTab("dtc")}
                onNavigateToTuning={() => setActiveTab("tuning")}
                onOpenConnectModal={() => setIsConnectModalOpen(true)}
              />
            )}

            {activeTab === "ecus" && (
              <EcuStatusView
                isConnected={isConnected}
                device={device}
                onOpenConnectModal={() => setIsConnectModalOpen(true)}
                onNavigateToTerminal={() => setActiveTab("terminal")}
                onNavigateToDtc={() => setActiveTab("dtc")}
              />
            )}

            {activeTab === "dtc" && (
              <DtcScannerView
                dtcs={dtcs}
                setDtcs={setDtcs}
                onAskAi={handleAskAiForDtc}
                isConnected={isConnected}
                onOpenConnectModal={() => setIsConnectModalOpen(true)}
              />
            )}

            {activeTab === "pneumatics" && (
              <PneumaticsBrakeView
                telemetry={telemetry}
                config={config}
                setConfig={setConfig}
                isConnected={isConnected}
                onOpenDriveModal={() => setIsDriveModalOpen(true)}
              />
            )}

            {activeTab === "fuses" && (
              <FusesView
                dtcs={dtcs}
                onNavigateToDtc={() => setActiveTab("dtc")}
                onAskAiForFuse={handleAskAiForFuse}
              />
            )}

            {activeTab === "tuning" && (
              <TuningView
                config={config}
                setConfig={setConfig}
                isConnected={isConnected}
                onOpenDriveModal={() => setIsDriveModalOpen(true)}
              />
            )}

            {activeTab === "actuators" && (
              <ActuatorsView
                isConnected={isConnected}
                onOpenConnectModal={() => setIsConnectModalOpen(true)}
              />
            )}

            {activeTab === "terminal" && (
              <TerminalView
                isConnected={isConnected}
                device={device}
              />
            )}

            {activeTab === "ai" && (
              <AiAdvisorView
                dtcs={dtcs}
                telemetry={telemetry}
                config={config}
                initialPrompt={aiSelectedPrompt}
              />
            )}
          </div>
        )}
      </main>

      {/* Floating Picture-in-Picture Mini Telemetry HUD */}
      {isPipOpen && (
        <MiniTelemetryPip
          telemetry={telemetry}
          onClose={() => setIsPipOpen(false)}
          onOpenFullDashboard={() => {
            if (workspaceMode === "tabs") {
              setActiveTab("dashboard");
            }
          }}
        />
      )}

      {/* Modals */}
      <BluetoothConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        isConnected={isConnected}
        device={device}
      />

      <DriveExportModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        dtcs={dtcs}
        config={config}
        telemetry={telemetry}
        profile={profile}
      />

      <ApkExportModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
      />

      <AppExitModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        isConnected={isConnected}
        device={device}
        dtcs={dtcs}
        telemetry={telemetry}
        onOpenDriveExport={() => setIsDriveModalOpen(true)}
      />

      {/* Android Mobile Navigation Bar */}
      <BottomMobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onOpenExitModal={() => setIsExitModalOpen(true)}
        dtcCount={dtcs.filter((d) => d.status === "active").length}
      />
    </div>
  );
}

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { 
  Gauge, 
  AlertTriangle, 
  Zap, 
  Sliders, 
  Activity, 
  Sparkles, 
  Terminal, 
  Grid2X2, 
  Columns, 
  Rows, 
  Layers, 
  Maximize2, 
  Minimize2, 
  Plus, 
  LayoutGrid,
  ChevronUp,
  ChevronDown,
  Wind,
  LayoutTemplate,
  MonitorCheck,
  Cpu,
  Brain,
  Wrench,
  Search,
  Check,
  Package,
  GitBranch
} from "lucide-react";
import { AppWindowId, AppWindowState, DtcFault, ElmDeviceInfo, TelemetryData, TruckConfig, TruckProfile } from "../types";
import { FloatingWindow } from "./FloatingWindow";
import { DashboardView } from "./DashboardView";
import { EcuStatusView } from "./EcuStatusView";
import { DtcScannerView } from "./DtcScannerView";
import { FusesView } from "./FusesView";
import { TuningView } from "./TuningView";
import { PneumaticsBrakeView } from "./PneumaticsBrakeView";
import { ActuatorsView } from "./ActuatorsView";
import { TerminalView } from "./TerminalView";
import { AiAdvisorView } from "./AiAdvisorView";
import { GitHubActionsApkView } from "./GitHubActionsApkView";

interface MultiWindowWorkspaceProps {
  telemetry: TelemetryData;
  isConnected: boolean;
  device: ElmDeviceInfo | null;
  dtcs: DtcFault[];
  setDtcs: React.Dispatch<React.SetStateAction<DtcFault[]>>;
  config: TruckConfig;
  setConfig: React.Dispatch<React.SetStateAction<TruckConfig>>;
  profile: TruckProfile;
  aiPrompt?: string;
  onAskAiForDtc: (fault: DtcFault) => void;
  onAskAiForFuse: (fuseSlot: string, circuitName: string) => void;
  onOpenConnectModal: () => void;
  onOpenDriveModal: () => void;
  onSwitchToTabsMode: (tabId?: AppWindowId) => void;
}

const DEFAULT_WINDOWS: AppWindowState[] = [
  {
    id: "dashboard",
    title: "Панель приборов & CAN-шина MC13",
    shortTitle: "Приборы",
    icon: "Gauge",
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    zIndex: 10,
    position: { x: 12, y: 12 },
    size: { width: 620, height: 480 },
    minSize: { width: 340, height: 320 },
  },
  {
    id: "ecus",
    title: "Блоки Управления Sitrak (7 ЭБУ)",
    shortTitle: "Блоки ЭБУ",
    icon: "Cpu",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 9,
    position: { x: 30, y: 30 },
    size: { width: 720, height: 520 },
    minSize: { width: 360, height: 340 },
  },
  {
    id: "dtc",
    title: "Сканер кодов неисправностей DTC J1939",
    shortTitle: "Ошибки DTC",
    icon: "AlertTriangle",
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    zIndex: 11,
    position: { x: 645, y: 12 },
    size: { width: 600, height: 480 },
    minSize: { width: 340, height: 320 },
  },
  {
    id: "pneumatics",
    title: "Пневмосистема & Тормоза WABCO EBS3",
    shortTitle: "Пневмо & Тормоза",
    icon: "Wind",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 8,
    position: { x: 40, y: 50 },
    size: { width: 680, height: 520 },
    minSize: { width: 360, height: 340 },
  },
  {
    id: "fuses",
    title: "Схема предохранителей и реле S7H",
    shortTitle: "Предохранители",
    icon: "Zap",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 9,
    position: { x: 70, y: 80 },
    size: { width: 680, height: 500 },
    minSize: { width: 340, height: 320 },
  },
  {
    id: "tuning",
    title: "Калибровки и параметры ЭБУ (EDC17 / TraXon)",
    shortTitle: "Настройки ЭБУ",
    icon: "Sliders",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 7,
    position: { x: 100, y: 110 },
    size: { width: 660, height: 500 },
    minSize: { width: 340, height: 320 },
  },
  {
    id: "actuators",
    title: "Тесты исполнительных механизмов",
    shortTitle: "Тесты",
    icon: "Activity",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 8,
    position: { x: 130, y: 140 },
    size: { width: 620, height: 480 },
    minSize: { width: 340, height: 320 },
  },
  {
    id: "ai",
    title: "AI Автомастер Sitrak Expert",
    shortTitle: "AI Мастер",
    icon: "Sparkles",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 12,
    position: { x: 160, y: 80 },
    size: { width: 660, height: 530 },
    minSize: { width: 340, height: 340 },
  },
  {
    id: "terminal",
    title: "Терминал AT / CAN команд ELM327",
    shortTitle: "Консоль ELM",
    icon: "Terminal",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 6,
    position: { x: 190, y: 160 },
    size: { width: 580, height: 460 },
    minSize: { width: 320, height: 300 },
  },
  {
    id: "apk",
    title: "Сборка Android APK в GitHub Actions",
    shortTitle: "GitHub APK",
    icon: "GitBranch",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 5,
    position: { x: 220, y: 100 },
    size: { width: 720, height: 580 },
    minSize: { width: 340, height: 320 },
  },
];

export const MultiWindowWorkspace: React.FC<MultiWindowWorkspaceProps> = ({
  telemetry,
  isConnected,
  device,
  dtcs,
  setDtcs,
  config,
  setConfig,
  profile,
  aiPrompt,
  onAskAiForDtc,
  onAskAiForFuse,
  onOpenConnectModal,
  onOpenDriveModal,
  onSwitchToTabsMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [windows, setWindows] = useState<AppWindowState[]>(() => {
    try {
      const saved = localStorage.getItem("sitrak_multiwindow_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_WINDOWS;
  });

  const [activeWindowId, setActiveWindowId] = useState<AppWindowId>("dashboard");
  const [highestZ, setHighestZ] = useState<number>(30);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [isPresetsMenuOpen, setIsPresetsMenuOpen] = useState(false);
  const [windowSearch, setWindowSearch] = useState("");

  // Persist window layout to localStorage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("sitrak_multiwindow_state", JSON.stringify(windows));
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [windows]);

  // Focus Window
  const focusWindow = useCallback((id: AppWindowId) => {
    setActiveWindowId(id);
    setHighestZ((prev) => {
      const nextZ = prev + 1;
      setWindows((curr) =>
        curr.map((w) => (w.id === id ? { ...w, zIndex: nextZ, isMinimized: false } : w))
      );
      return nextZ;
    });
  }, []);

  // Open Window
  const openWindow = (id: AppWindowId) => {
    setWindows((curr) =>
      curr.map((w) =>
        w.id === id ? { ...w, isOpen: true, isMinimized: false, zIndex: highestZ + 1 } : w
      )
    );
    setHighestZ((prev) => prev + 1);
    setActiveWindowId(id);
    setIsLauncherOpen(false);
  };

  // Close Window
  const closeWindow = (id: AppWindowId) => {
    setWindows((curr) =>
      curr.map((w) => (w.id === id ? { ...w, isOpen: false } : w))
    );
  };

  // Minimize Window
  const minimizeWindow = (id: AppWindowId) => {
    setWindows((curr) =>
      curr.map((w) => (w.id === id ? { ...w, isMinimized: true } : w))
    );
  };

  // Maximize Window Toggle
  const toggleMaximizeWindow = (id: AppWindowId) => {
    setWindows((curr) =>
      curr.map((w) =>
        w.id === id ? { ...w, isMaximized: !w.isMaximized } : w
      )
    );
    focusWindow(id);
  };

  // Snap Window to Left Half (50%)
  const snapWindowLeft = (id: AppWindowId) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const containerW = rect ? rect.width - 24 : window.innerWidth - 32;
    const containerH = rect ? rect.height - 24 : window.innerHeight - 170;
    const halfW = Math.max(340, Math.floor(containerW / 2) - 6);

    setWindows((curr) =>
      curr.map((w) =>
        w.id === id
          ? {
              ...w,
              isOpen: true,
              isMinimized: false,
              isMaximized: false,
              position: { x: 8, y: 8 },
              size: { width: halfW, height: containerH },
            }
          : w
      )
    );
    focusWindow(id);
  };

  // Snap Window to Right Half (50%)
  const snapWindowRight = (id: AppWindowId) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const containerW = rect ? rect.width - 24 : window.innerWidth - 32;
    const containerH = rect ? rect.height - 24 : window.innerHeight - 170;
    const halfW = Math.max(340, Math.floor(containerW / 2) - 6);

    setWindows((curr) =>
      curr.map((w) =>
        w.id === id
          ? {
              ...w,
              isOpen: true,
              isMinimized: false,
              isMaximized: false,
              position: { x: halfW + 16, y: 8 },
              size: { width: halfW, height: containerH },
            }
          : w
      )
    );
    focusWindow(id);
  };

  // Update Window Position and Size
  const updateWindowPositionSize = (
    id: AppWindowId,
    pos: { x: number; y: number },
    size: { width: number; height: number }
  ) => {
    setWindows((curr) =>
      curr.map((w) => (w.id === id ? { ...w, position: pos, size: size } : w))
    );
  };

  // Presets
  const applyPresetLayout = (preset: "grid4" | "split_engine_dtc" | "split_brakes_telemetry" | "split_ai_dtc" | "split_traxon_actuators" | "split_terminal_dash" | "cascade" | "tile_open") => {
    const rect = containerRef.current?.getBoundingClientRect();
    const containerW = rect ? rect.width - 24 : window.innerWidth - 32;
    const containerH = rect ? rect.height - 24 : window.innerHeight - 170;
    const halfW = Math.max(340, Math.floor(containerW / 2) - 8);
    const halfH = Math.max(280, Math.floor(containerH / 2) - 8);

    if (preset === "grid4") {
      // 4-window Grid (Dashboard, DTC, Pneumatics, Tuning)
      setWindows((curr) =>
        curr.map((w) => {
          if (w.id === "dashboard") {
            return { ...w, isOpen: true, isMinimized: false, isMaximized: false, position: { x: 8, y: 8 }, size: { width: halfW, height: halfH } };
          }
          if (w.id === "dtc") {
            return { ...w, isOpen: true, isMinimized: false, isMaximized: false, position: { x: halfW + 16, y: 8 }, size: { width: halfW, height: halfH } };
          }
          if (w.id === "pneumatics") {
            return { ...w, isOpen: true, isMinimized: false, isMaximized: false, position: { x: 8, y: halfH + 16 }, size: { width: halfW, height: halfH } };
          }
          if (w.id === "tuning") {
            return { ...w, isOpen: true, isMinimized: false, isMaximized: false, position: { x: halfW + 16, y: halfH + 16 }, size: { width: halfW, height: halfH } };
          }
          return { ...w, isOpen: false };
        })
      );
    } else if (preset === "split_engine_dtc") {
      setWindows((curr) =>
        curr.map((w) => {
          if (w.id === "dashboard") {
            return { ...w, isOpen: true, isMinimized: false, isMaximized: false, position: { x: 8, y: 8 }, size: { width: halfW, height: containerH } };
          }
          if (w.id === "dtc") {
            return { ...w, isOpen: true, isMinimized: false, isMaximized: false, position: { x: halfW + 16, y: 8 }, size: { width: halfW, height: containerH } };
          }
          return { ...w, isOpen: false };
        })
      );
    } else if (preset === "split_brakes_telemetry") {
      setWindows((curr) =>
        curr.map((w) => {
          if (w.id === "pneumatics") {
            return { ...w, isOpen: true, isMinimized: false, isMaximized: false, position: { x: 8, y: 8 }, size: { width: halfW, height: containerH } };
          }
          if (w.id === "dashboard") {
            return { ...w, isOpen: true, isMinimized: false, isMaximized: false, position: { x: halfW + 16, y: 8 }, size: { width: halfW, height: containerH } };
          }
          return { ...w, isOpen: false };
        })
      );
    } else if (preset === "split_ai_dtc") {
      setWindows((curr) =>
        curr.map((w) => {
          if (w.id === "dtc") {
            return { ...w, isOpen: true, isMinimized: false, isMaximized: false, position: { x: 8, y: 8 }, size: { width: halfW, height: containerH } };
          }
          if (w.id === "ai") {
            return { ...w, isOpen: true, isMinimized: false, isMaximized: false, position: { x: halfW + 16, y: 8 }, size: { width: halfW, height: containerH } };
          }
          return { ...w, isOpen: false };
        })
      );
    } else if (preset === "split_traxon_actuators") {
      setWindows((curr) =>
        curr.map((w) => {
          if (w.id === "tuning") {
            return { ...w, isOpen: true, isMinimized: false, isMaximized: false, position: { x: 8, y: 8 }, size: { width: halfW, height: containerH } };
          }
          if (w.id === "actuators") {
            return { ...w, isOpen: true, isMinimized: false, isMaximized: false, position: { x: halfW + 16, y: 8 }, size: { width: halfW, height: containerH } };
          }
          return { ...w, isOpen: false };
        })
      );
    } else if (preset === "split_terminal_dash") {
      setWindows((curr) =>
        curr.map((w) => {
          if (w.id === "terminal") {
            return { ...w, isOpen: true, isMinimized: false, isMaximized: false, position: { x: 8, y: 8 }, size: { width: halfW, height: containerH } };
          }
          if (w.id === "dashboard") {
            return { ...w, isOpen: true, isMinimized: false, isMaximized: false, position: { x: halfW + 16, y: 8 }, size: { width: halfW, height: containerH } };
          }
          return { ...w, isOpen: false };
        })
      );
    } else if (preset === "cascade") {
      let offset = 16;
      setWindows((curr) =>
        curr.map((w) => {
          if (w.isOpen && !w.isMinimized) {
            const res = {
              ...w,
              isMaximized: false,
              position: { x: offset, y: offset },
              size: { width: 620, height: 460 },
            };
            offset = (offset + 36) % 240;
            return res;
          }
          return w;
        })
      );
    } else if (preset === "tile_open") {
      const openWins = windows.filter((w) => w.isOpen && !w.isMinimized);
      if (openWins.length === 1) {
        setWindows((curr) =>
          curr.map((w) =>
            w.id === openWins[0].id
              ? { ...w, isMaximized: false, position: { x: 8, y: 8 }, size: { width: containerW, height: containerH } }
              : w
          )
        );
      } else if (openWins.length === 2) {
        setWindows((curr) =>
          curr.map((w) => {
            if (w.id === openWins[0].id) {
              return { ...w, isMaximized: false, position: { x: 8, y: 8 }, size: { width: halfW, height: containerH } };
            }
            if (w.id === openWins[1].id) {
              return { ...w, isMaximized: false, position: { x: halfW + 16, y: 8 }, size: { width: halfW, height: containerH } };
            }
            return w;
          })
        );
      } else if (openWins.length >= 3) {
        setWindows((curr) =>
          curr.map((w) => {
            const idx = openWins.findIndex((ow) => ow.id === w.id);
            if (idx === 0) return { ...w, isMaximized: false, position: { x: 8, y: 8 }, size: { width: halfW, height: halfH } };
            if (idx === 1) return { ...w, isMaximized: false, position: { x: halfW + 16, y: 8 }, size: { width: halfW, height: halfH } };
            if (idx === 2) return { ...w, isMaximized: false, position: { x: 8, y: halfH + 16 }, size: { width: halfW, height: halfH } };
            if (idx === 3) return { ...w, isMaximized: false, position: { x: halfW + 16, y: halfH + 16 }, size: { width: halfW, height: halfH } };
            return w;
          })
        );
      }
    }

    setIsPresetsMenuOpen(false);
  };

  // Minimize All
  const minimizeAll = () => {
    setWindows((curr) => curr.map((w) => ({ ...w, isMinimized: true })));
  };

  // Restore All
  const restoreAll = () => {
    setWindows((curr) =>
      curr.map((w) => (w.isOpen ? { ...w, isMinimized: false } : w))
    );
  };

  // Reset to Default Windows
  const resetToDefaultLayout = () => {
    setWindows(DEFAULT_WINDOWS);
    setIsPresetsMenuOpen(false);
  };

  // Helpers for Icons
  const renderWindowIcon = (id: AppWindowId) => {
    switch (id) {
      case "dashboard":
        return <Gauge className="w-4 h-4 text-amber-400" />;
      case "ecus":
        return <Cpu className="w-4 h-4 text-amber-400" />;
      case "dtc":
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case "fuses":
        return <Zap className="w-4 h-4 text-amber-400" />;
      case "tuning":
        return <Sliders className="w-4 h-4 text-blue-400" />;
      case "pneumatics":
        return <Wind className="w-4 h-4 text-amber-400" />;
      case "actuators":
        return <Activity className="w-4 h-4 text-purple-400" />;
      case "terminal":
        return <Terminal className="w-4 h-4 text-cyan-400" />;
      case "ai":
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case "apk":
        return <GitBranch className="w-4 h-4 text-emerald-400" />;
    }
  };

  // Window content mapping
  const renderWindowContent = (id: AppWindowId) => {
    switch (id) {
      case "dashboard":
        return (
          <DashboardView
            telemetry={telemetry}
            isConnected={isConnected}
            onNavigateToDtc={() => openWindow("dtc")}
            onNavigateToTuning={() => openWindow("tuning")}
            onOpenConnectModal={onOpenConnectModal}
          />
        );
      case "ecus":
        return (
          <EcuStatusView
            isConnected={isConnected}
            device={device}
            onOpenConnectModal={onOpenConnectModal}
            onNavigateToTerminal={() => openWindow("terminal")}
            onNavigateToDtc={() => openWindow("dtc")}
          />
        );
      case "dtc":
        return (
          <DtcScannerView
            dtcs={dtcs}
            setDtcs={setDtcs}
            onAskAi={(fault) => {
              onAskAiForDtc(fault);
              openWindow("ai");
            }}
            isConnected={isConnected}
          />
        );
      case "fuses":
        return (
          <FusesView
            dtcs={dtcs}
            onNavigateToDtc={() => openWindow("dtc")}
            onAskAiForFuse={(slot, name) => {
              onAskAiForFuse(slot, name);
              openWindow("ai");
            }}
          />
        );
      case "tuning":
        return (
          <TuningView
            config={config}
            setConfig={setConfig}
            isConnected={isConnected}
            onOpenDriveModal={onOpenDriveModal}
          />
        );
      case "pneumatics":
        return (
          <PneumaticsBrakeView
            telemetry={telemetry}
            config={config}
            setConfig={setConfig}
            isConnected={isConnected}
            onOpenDriveModal={onOpenDriveModal}
          />
        );
      case "actuators":
        return (
          <ActuatorsView
            telemetry={telemetry}
            isConnected={isConnected}
          />
        );
      case "terminal":
        return <TerminalView isConnected={isConnected} />;
      case "ai":
        return (
          <AiAdvisorView
            dtcs={dtcs}
            telemetry={telemetry}
            profile={profile}
            initialQuestion={aiPrompt}
          />
        );
      case "apk":
        return <GitHubActionsApkView onNavigateToEcus={() => openWindow("ecus")} />;
    }
  };

  const openWindows = useMemo(() => windows.filter((w) => w.isOpen), [windows]);
  const activeDtcCount = useMemo(() => dtcs.filter((d) => d.status === "active").length, [dtcs]);

  const filteredWindows = useMemo(() => {
    if (!windowSearch.trim()) return windows;
    return windows.filter((w) =>
      w.title.toLowerCase().includes(windowSearch.toLowerCase()) ||
      w.shortTitle.toLowerCase().includes(windowSearch.toLowerCase())
    );
  }, [windows, windowSearch]);

  return (
    <div className="relative w-full h-[calc(100vh-125px)] min-h-[620px] bg-slate-950/95 rounded-2xl border border-slate-800/90 overflow-hidden flex flex-col shadow-2xl">
      {/* Workspace Top Toolbar */}
      <div className="px-3 sm:px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 select-none overflow-x-auto scrollbar-none z-20">
        {/* Left: Window Launcher + Preset Layouts */}
        <div className="flex items-center gap-2">
          {/* Open Window Launcher Button */}
          <div className="relative">
            <button
              id="btn-workspace-launcher"
              onClick={() => setIsLauncherOpen(!isLauncherOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Окна ({openWindows.length}/8)</span>
              {isLauncherOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Launcher Dropdown */}
            {isLauncherOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2.5 space-y-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-2 pb-1 border-b border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Диагностические модули
                  </span>
                  <button 
                    onClick={() => {
                      windows.forEach((w) => openWindow(w.id));
                      setIsLauncherOpen(false);
                    }}
                    className="text-[10px] text-amber-400 hover:underline"
                  >
                    Открыть все
                  </button>
                </div>

                {/* Search input */}
                <div className="relative my-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={windowSearch}
                    onChange={(e) => setWindowSearch(e.target.value)}
                    placeholder="Поиск модуля..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                  {filteredWindows.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => openWindow(w.id)}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs hover:bg-slate-800 text-slate-200 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {renderWindowIcon(w.id)}
                        <div className="truncate">
                          <div className="font-medium text-white group-hover:text-amber-300">{w.shortTitle}</div>
                          <div className="text-[10px] text-slate-400 truncate">{w.title}</div>
                        </div>
                      </div>
                      {w.isOpen && !w.isMinimized ? (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold ml-1 shrink-0">Открыто</span>
                      ) : w.isMinimized ? (
                        <span className="text-[10px] font-mono text-amber-400 font-bold ml-1 shrink-0">Свернуто</span>
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0 ml-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Presets Dropdown */}
          <div className="relative">
            <button
              id="btn-workspace-presets"
              onClick={() => setIsPresetsMenuOpen(!isPresetsMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-all hover:text-white"
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-amber-400" />
              <span>Шаблоны экранов</span>
              {isPresetsMenuOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Presets Menu */}
            {isPresetsMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Готовые рабочие места (Многооконные)
                </div>

                <button
                  onClick={() => applyPresetLayout("grid4")}
                  className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-slate-800 text-slate-200 transition-colors text-left"
                >
                  <Grid2X2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">Диагностический центр (Сетка 2x2)</div>
                    <div className="text-[11px] text-slate-400">Приборы + DTC + Пневмосистема EBS3 + Настройки ЭБУ</div>
                  </div>
                </button>

                <button
                  onClick={() => applyPresetLayout("split_engine_dtc")}
                  className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-slate-800 text-slate-200 transition-colors text-left"
                >
                  <Columns className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">Двигатель & Ошибки (50/50)</div>
                    <div className="text-[11px] text-slate-400">Панель приборов слева, Сканер кодов DTC справа</div>
                  </div>
                </button>

                <button
                  onClick={() => applyPresetLayout("split_brakes_telemetry")}
                  className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-slate-800 text-slate-200 transition-colors text-left"
                >
                  <Wind className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">Тормоза WABCO EBS3 + Телеметрия</div>
                    <div className="text-[11px] text-slate-400">Пневмоконтуры и опережение полуприцепа + Панель приборов</div>
                  </div>
                </button>

                <button
                  onClick={() => applyPresetLayout("split_ai_dtc")}
                  className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-slate-800 text-slate-200 transition-colors text-left"
                >
                  <Brain className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">AI Эксперт & Поиск неисправностей</div>
                    <div className="text-[11px] text-slate-400">Ошибки DTC слева, AI Автомастер со схемами справа</div>
                  </div>
                </button>

                <button
                  onClick={() => applyPresetLayout("split_traxon_actuators")}
                  className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-slate-800 text-slate-200 transition-colors text-left"
                >
                  <Cpu className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">АКПП ZF TraXon + Тесты</div>
                    <div className="text-[11px] text-slate-400">Калибровки сцепления слева, Тесты исполнителей справа</div>
                  </div>
                </button>

                <button
                  onClick={() => applyPresetLayout("split_terminal_dash")}
                  className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-slate-800 text-slate-200 transition-colors text-left"
                >
                  <Terminal className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">Терминал ELM327 + CAN-мониторинг</div>
                    <div className="text-[11px] text-slate-400">Прямая консоль AT-команд + Панель приборов</div>
                  </div>
                </button>

                <div className="pt-1 border-t border-slate-800 flex items-center justify-between gap-2 px-1">
                  <button
                    onClick={() => applyPresetLayout("tile_open")}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-[11px] font-semibold text-slate-300 hover:text-white text-center"
                  >
                    Плитка открытых
                  </button>
                  <button
                    onClick={() => applyPresetLayout("cascade")}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-[11px] font-semibold text-slate-300 hover:text-white text-center"
                  >
                    Каскад
                  </button>
                  <button
                    onClick={resetToDefaultLayout}
                    className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-[11px] font-semibold text-red-400 hover:text-red-300"
                    title="Сбросить окна"
                  >
                    Сброс
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Quick Layout Action Buttons */}
          <div className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => applyPresetLayout("grid4")}
              title="Расположить 4 окна сеткой 2x2"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all hover:text-white"
            >
              <Grid2X2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Сетка 2x2</span>
            </button>

            <button
              onClick={() => applyPresetLayout("split_engine_dtc")}
              title="Сплит 50/50: Приборы + DTC"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all hover:text-white"
            >
              <Columns className="w-3.5 h-3.5 text-cyan-400" />
              <span>50/50 Сплит</span>
            </button>

            <button
              onClick={() => applyPresetLayout("tile_open")}
              title="Равномерно расположить все открытые окна"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all hover:text-white"
            >
              <Rows className="w-3.5 h-3.5 text-purple-400" />
              <span>Авто-плитка</span>
            </button>

            <button
              onClick={() => applyPresetLayout("cascade")}
              title="Упорядочить каскадом"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all hover:text-white"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Каскад</span>
            </button>
          </div>
        </div>

        {/* Right: Window bulk actions & Tabs Mode switcher */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={restoreAll}
            title="Развернуть все окна"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={minimizeAll}
            title="Свернуть все окна"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={() => onSwitchToTabsMode(activeWindowId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all hover:text-amber-300"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Обычный вид (Вкладки)</span>
          </button>
        </div>
      </div>

      {/* Main Desktop Canvas Area for Floating Windows */}
      <div 
        ref={containerRef}
        className="flex-1 relative w-full h-full bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] overflow-hidden p-2"
        onClick={() => {
          setIsLauncherOpen(false);
          setIsPresetsMenuOpen(false);
        }}
      >
        {/* Render Open Windows */}
        {windows.map((win) => {
          if (!win.isOpen || win.isMinimized) return null;
          return (
            <FloatingWindow
              key={win.id}
              windowState={win}
              isActive={activeWindowId === win.id}
              onFocus={() => focusWindow(win.id)}
              onClose={() => closeWindow(win.id)}
              onMinimize={() => minimizeWindow(win.id)}
              onMaximizeToggle={() => toggleMaximizeWindow(win.id)}
              onSnapLeft={() => snapWindowLeft(win.id)}
              onSnapRight={() => snapWindowRight(win.id)}
              onOpenAsTab={() => onSwitchToTabsMode(win.id)}
              onUpdatePositionSize={(pos, size) => updateWindowPositionSize(win.id, pos, size)}
              iconComponent={renderWindowIcon(win.id)}
            >
              {renderWindowContent(win.id)}
            </FloatingWindow>
          );
        })}

        {/* Empty State when no windows are open */}
        {openWindows.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-4 pointer-events-none">
            <div className="w-20 h-20 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-center text-amber-400 shadow-2xl">
              <Grid2X2 className="w-10 h-10" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-base font-bold text-white">Все окна свернуты или закрыты</h3>
              <p className="text-xs text-slate-400">
                Выберите диагностический модуль на нижней панели задач или нажмите кнопку «Шаблоны экранов» вверху для быстрого запуска.
              </p>
            </div>
            <div className="flex gap-2 pointer-events-auto">
              <button
                onClick={() => applyPresetLayout("grid4")}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all"
              >
                Открыть Сетку 2x2
              </button>
              <button
                onClick={() => applyPresetLayout("split_engine_dtc")}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all"
              >
                Открыть 50/50 Сплит
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Taskbar / Dock */}
      <div className="px-3 sm:px-4 py-2 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0 select-none z-30 overflow-x-auto scrollbar-none">
        {/* Open Windows in Taskbar */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {windows.map((w) => {
            const isWinOpen = w.isOpen;
            const isWinActive = activeWindowId === w.id && isWinOpen && !w.isMinimized;

            return (
              <button
                key={w.id}
                id={`taskbar-item-${w.id}`}
                onClick={() => {
                  if (!w.isOpen) {
                    openWindow(w.id);
                  } else if (w.isMinimized) {
                    focusWindow(w.id);
                  } else if (activeWindowId === w.id) {
                    minimizeWindow(w.id);
                  } else {
                    focusWindow(w.id);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                  isWinActive
                    ? "bg-slate-800 text-amber-400 border-amber-500/50 shadow-inner"
                    : isWinOpen
                    ? "bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
                    : "opacity-40 hover:opacity-100 bg-slate-950/40 text-slate-500 border-slate-900 hover:border-slate-800"
                }`}
              >
                {renderWindowIcon(w.id)}
                <span>{w.shortTitle}</span>
                {w.id === "dtc" && activeDtcCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-600 text-white animate-pulse">
                    {activeDtcCount}
                  </span>
                )}
                {isWinOpen && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isWinActive ? "bg-amber-400" : w.isMinimized ? "bg-slate-600" : "bg-emerald-400"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick HUD Telemetry indicator on Taskbar */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 shrink-0 pl-2 border-l border-slate-800">
          <span className="hidden sm:inline text-slate-500">MC13 CAN:</span>
          <span className="font-bold text-emerald-400">{telemetry.engineRpm} rpm</span>
          <span className="font-bold text-cyan-400">{telemetry.boostPressure.toFixed(2)} Bar</span>
          <span className="font-bold text-amber-400">{telemetry.oilPressure.toFixed(1)} Bar</span>
          <span className="font-bold text-purple-400">{telemetry.batteryVoltage.toFixed(1)}V</span>
        </div>
      </div>
    </div>
  );
};

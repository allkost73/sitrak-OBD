import React from "react";
import { 
  Gauge, 
  Cpu,
  AlertTriangle, 
  Wind, 
  Zap, 
  Sparkles, 
  Bluetooth, 
  Sliders,
  Terminal,
  Activity,
  Power
} from "lucide-react";
import { AppWindowId } from "../types";

interface BottomMobileNavProps {
  activeTab: AppWindowId;
  setActiveTab: (tab: AppWindowId) => void;
  dtcCount: number;
  isConnected: boolean;
  onOpenConnectModal: () => void;
  onOpenExitModal?: () => void;
}

export const BottomMobileNav: React.FC<BottomMobileNavProps> = ({
  activeTab,
  setActiveTab,
  dtcCount,
  isConnected,
  onOpenConnectModal,
  onOpenExitModal,
}) => {
  const navItems = [
    {
      id: "dashboard" as AppWindowId,
      label: "Приборы",
      icon: Gauge,
      badge: null,
      activeColor: "text-amber-400 bg-amber-500/15",
    },
    {
      id: "ecus" as AppWindowId,
      label: "Блоки ЭБУ",
      icon: Cpu,
      badge: null,
      activeColor: "text-amber-400 bg-amber-500/15",
    },
    {
      id: "dtc" as AppWindowId,
      label: "Ошибки",
      icon: AlertTriangle,
      badge: dtcCount > 0 ? dtcCount : null,
      activeColor: "text-red-400 bg-red-500/15",
    },
    {
      id: "pneumatics" as AppWindowId,
      label: "Пневмо",
      icon: Wind,
      badge: null,
      activeColor: "text-cyan-400 bg-cyan-500/15",
    },
    {
      id: "fuses" as AppWindowId,
      label: "Предохр.",
      icon: Zap,
      badge: null,
      activeColor: "text-yellow-400 bg-yellow-500/15",
    },
    {
      id: "ai" as AppWindowId,
      label: "ИИ",
      icon: Sparkles,
      badge: null,
      activeColor: "text-emerald-400 bg-emerald-500/15",
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 px-2 py-1.5 shadow-2xl safe-area-bottom">
      <div className="flex items-center justify-around gap-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center relative transition-all active:scale-90 ${
                isActive ? item.activeColor : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""}`} />
                {item.badge !== null && (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 min-w-[16px] text-center text-[10px] font-black rounded-full bg-red-600 text-white shadow font-mono">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium mt-0.5 tracking-tight ${isActive ? "font-bold text-white" : ""}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Fast Scanner Connect Button on Mobile */}
        <button
          id="mobile-nav-connect"
          onClick={onOpenConnectModal}
          className={`py-1.5 px-2 rounded-xl flex flex-col items-center justify-center transition-all active:scale-90 ${
            isConnected 
              ? "text-emerald-400 bg-emerald-950/50 border border-emerald-500/40" 
              : "text-amber-400 bg-amber-950/40 border border-amber-500/40"
          }`}
          title="Параметры подключения сканера"
        >
          <div className="relative">
            <Bluetooth className="w-4.5 h-4.5" />
            <span className={`absolute -top-0.5 -right-1 w-2 h-2 rounded-full ${
              isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            }`} />
          </div>
          <span className="text-[10px] font-bold mt-0.5">
            {isConnected ? "ELM" : "Сканер"}
          </span>
        </button>

        {/* Fast Exit Button on Mobile */}
        {onOpenExitModal && (
          <button
            id="mobile-nav-exit"
            onClick={onOpenExitModal}
            className="py-1.5 px-2 rounded-xl flex flex-col items-center justify-center text-red-400 hover:text-red-300 bg-red-950/30 border border-red-500/30 transition-all active:scale-90"
            title="Выход из приложения"
          >
            <Power className="w-4.5 h-4.5" />
            <span className="text-[10px] font-bold mt-0.5">
              Выход
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

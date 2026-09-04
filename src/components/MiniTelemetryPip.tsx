import React, { useState } from "react";
import { 
  Gauge, 
  Activity, 
  Flame, 
  Zap, 
  Minimize2, 
  Maximize2, 
  X, 
  Move, 
  Fuel, 
  Wind,
  Layers
} from "lucide-react";
import { TelemetryData } from "../types";

interface MiniTelemetryPipProps {
  telemetry: TelemetryData;
  isConnected: boolean;
  onClose: () => void;
  onOpenDashboard?: () => void;
}

export const MiniTelemetryPip: React.FC<MiniTelemetryPipProps> = ({
  telemetry,
  isConnected,
  onClose,
  onOpenDashboard,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const pipRef = React.useRef<HTMLDivElement>(null);
  const isDraggingRef = React.useRef(false);
  const dragStartRef = React.useRef({ x: 0, y: 0 });
  const posRef = React.useRef({ x: 20, y: 80 });
  const rafRef = React.useRef<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const newX = Math.max(10, Math.min(window.innerWidth - 320, e.clientX - dragStartRef.current.x));
    const newY = Math.max(60, Math.min(window.innerHeight - 180, e.clientY - dragStartRef.current.y));
    posRef.current = { x: newX, y: newY };

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pipRef.current) {
          pipRef.current.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`;
        }
        rafRef.current = null;
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setPosition(posRef.current);
    }
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      ref={pipRef}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        zIndex: 9990,
      }}
      className="fixed top-0 left-0 w-80 sm:w-88 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-amber-500/40 shadow-2xl overflow-hidden select-none transition-shadow"
    >
      {/* Header Bar */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="px-3 py-2 bg-gradient-to-r from-slate-900 via-slate-850 to-amber-950/40 border-b border-slate-800 flex items-center justify-between cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Gauge className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white tracking-wide">
            CAN HUD: SITRAK MC13
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onOpenDashboard && (
            <button
              onClick={onOpenDashboard}
              title="Открыть панель приборов"
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Развернуть" : "Свернуть"}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Закрыть HUD"
            className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      {!isCollapsed && (
        <div className="p-3 space-y-2.5 text-xs">
          {/* Main Gauges Grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* RPM */}
            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-mono block">ТАХОМЕТР</span>
              <div className="text-sm font-black font-mono text-emerald-400">
                {telemetry.engineRpm}
              </div>
              <span className="text-[9px] text-slate-500">об/мин</span>
            </div>

            {/* Speed & Gear */}
            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-mono block">СКОРОСТЬ / КПП</span>
              <div className="text-sm font-black font-mono text-white flex items-center justify-center gap-1">
                <span>{telemetry.vehicleSpeed}</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[10px] font-black">
                  {telemetry.currentGear}
                </span>
              </div>
              <span className="text-[9px] text-slate-500">км/ч • TraXon</span>
            </div>

            {/* Boost Pressure */}
            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-mono block">ТУРБИНА VGT</span>
              <div className="text-sm font-black font-mono text-cyan-400">
                {telemetry.boostPressure.toFixed(2)}
              </div>
              <span className="text-[9px] text-slate-500">Bar</span>
            </div>
          </div>

          {/* Secondary Telemetry Strip */}
          <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
            {/* Oil Pressure */}
            <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-850">
              <span className="text-slate-500 block text-[9px]">МАСЛО</span>
              <span className={`font-bold ${telemetry.oilPressure < 1.2 ? "text-red-400" : "text-amber-300"}`}>
                {telemetry.oilPressure.toFixed(1)} Bar
              </span>
            </div>

            {/* Coolant */}
            <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-850">
              <span className="text-slate-500 block text-[9px]">ОЖ</span>
              <span className={`font-bold ${telemetry.coolantTemp > 98 ? "text-red-400" : "text-blue-300"}`}>
                {telemetry.coolantTemp}°C
              </span>
            </div>

            {/* Common Rail */}
            <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-850">
              <span className="text-slate-500 block text-[9px]">RAIL</span>
              <span className="font-bold text-purple-300">
                {telemetry.railPressure.toFixed(0)} MPa
              </span>
            </div>

            {/* Voltage */}
            <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-850">
              <span className="text-slate-500 block text-[9px]">БОРТСЕТЬ</span>
              <span className={`font-bold ${telemetry.batteryVoltage < 24.0 ? "text-red-400" : "text-emerald-300"}`}>
                {telemetry.batteryVoltage.toFixed(1)}V
              </span>
            </div>
          </div>

          {/* AdBlue & Air Level Micro-bars */}
          <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <Wind className="w-3 h-3 text-cyan-400" />
                <span>Воздух WABCO: {telemetry.airCircuit1.toFixed(1)} / {telemetry.airCircuit2.toFixed(1)} Bar</span>
              </span>
              <span className="text-emerald-400 font-bold">12.0 Bar</span>
            </div>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden flex">
              <div
                className="bg-cyan-500 h-full transition-all duration-300"
                style={{ width: `${(telemetry.airCircuit1 / 12.5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

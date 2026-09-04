import React, { useState } from "react";
import { 
  Activity, 
  Disc, 
  Thermometer, 
  Weight, 
  Gauge, 
  AlertOctagon, 
  Play, 
  RotateCcw,
  Zap,
  ArrowRightLeft
} from "lucide-react";
import { TelemetryData, TruckConfig } from "../../types";
import { elmService } from "../../services/elmAdapterService";

interface BrakeLiveTelemetryCardProps {
  telemetry: TelemetryData;
  config: TruckConfig;
  trailerLeadDelta: number;
  frontRearBalance: number;
  cfcEnabled: boolean;
}

export const BrakeLiveTelemetryCard: React.FC<BrakeLiveTelemetryCardProps> = ({
  telemetry,
  config,
  trailerLeadDelta,
  frontRearBalance,
  cfcEnabled,
}) => {
  const [pedalInput, setPedalInput] = useState<number>(telemetry.brakePedalTravel || 0);

  const handlePedalChange = (val: number) => {
    setPedalInput(val);
    elmService.updateBrakeSimulation(val, trailerLeadDelta, frontRearBalance, cfcEnabled);
  };

  const handleQuickPedalTest = (val: number) => {
    setPedalInput(val);
    elmService.updateBrakeSimulation(val, trailerLeadDelta, frontRearBalance, cfcEnabled);
  };

  // Safe color for coupling force
  const couplingForce = telemetry.couplingForceKn || 0;
  const isTensionSafe = couplingForce >= 0.5;
  const isCompressionDangerous = couplingForce < -1.0;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Фактические данные и динамический тест тормозных сил в реальном времени
            </h3>
            <p className="text-xs text-slate-400">
              Показания датчиков давления камер, усилие на сцепке ССУ, замедление и температура дисков WABCO PAN19/PAN22
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400">
            Опрос CAN: 50 Hz (20 ms)
          </span>
        </div>
      </div>

      {/* Interactive Brake Pedal Simulation Control */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-850 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white">
              Прожим педали тормоза (Электронный датчик хода педали EBS3)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-black text-amber-400">
              {pedalInput}% ({((pedalInput / 100) * 8.5).toFixed(1)} Bar)
            </span>
            {pedalInput > 0 && (
              <button
                onClick={() => handleQuickPedalTest(0)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs"
                title="Отпустить педаль"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Range Slider */}
        <input
          id="slider-live-pedal"
          type="range"
          min="0"
          max="100"
          step="1"
          value={pedalInput}
          onChange={(e) => handlePedalChange(parseInt(e.target.value))}
          className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />

        {/* Quick Test Buttons */}
        <div className="grid grid-cols-5 gap-2 pt-1">
          {[
            { label: "0% Отпущена", val: 0, color: "hover:bg-slate-800" },
            { label: "15% Касание", val: 15, color: "hover:bg-emerald-950/80" },
            { label: "35% Служебное", val: 35, color: "hover:bg-cyan-950/80" },
            { label: "70% Интенсивное", val: 70, color: "hover:bg-amber-950/80" },
            { label: "100% Экстренное", val: 100, color: "hover:bg-red-950/80" },
          ].map((btn) => (
            <button
              key={btn.val}
              onClick={() => handleQuickPedalTest(btn.val)}
              className={`py-1.5 px-1 rounded-lg text-[11px] font-bold border transition-all text-center ${
                pedalInput === btn.val
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-[1.02]"
                  : `bg-slate-900/90 text-slate-300 border-slate-800 ${btn.color}`
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Diagnostic KPI Cards: Deceleration, Coupling Force, Axle Weights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Deceleration KPI */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Замедление автопоезда</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black font-mono text-white">
              {telemetry.actualDeceleration.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 font-mono">m/s² (z={((telemetry.actualDeceleration / 9.81) * 100).toFixed(0)}%)</span>
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between font-mono">
            <span>Задано: {telemetry.demandedDeceleration.toFixed(2)} m/s²</span>
            <span className="text-emerald-400">ESC IMU OK</span>
          </div>
        </div>

        {/* Coupling Force on 5th Wheel KPI */}
        <div className={`p-3.5 rounded-xl border space-y-1 ${
          isTensionSafe 
            ? "bg-emerald-950/30 border-emerald-500/40"
            : isCompressionDangerous
            ? "bg-red-950/30 border-red-500/40"
            : "bg-slate-950/60 border-slate-800"
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Усилие на ССУ (CFC)</span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-black font-mono ${
              couplingForce > 0 ? "text-emerald-400" : couplingForce < 0 ? "text-red-400" : "text-slate-300"
            }`}>
              {couplingForce > 0 ? `+${couplingForce.toFixed(1)}` : couplingForce.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 font-mono">kN</span>
          </div>
          <p className="text-[10px] font-medium leading-tight text-slate-300">
            {couplingForce > 0 
              ? "Растяжка сцепки (Стабильно)" 
              : couplingForce < 0 
              ? "Набегание прицепа (Риск складывания)" 
              : "Нейтральное состояние"}
          </p>
        </div>

        {/* Tractor Axle Weight by ECAS */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Нагрузка на оси тягача</span>
            <Weight className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Рулевая: <strong className="text-white">{telemetry.axleLoadFrontTon} т</strong></span>
            <span className="text-slate-400">Ведущая: <strong className="text-cyan-400">{telemetry.axleLoadRearTon} т</strong></span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Седло ССУ: {telemetry.fifthWheelLoadTon} т (Сцепной вес)
          </div>
        </div>

        {/* Semi-Trailer Weight & Total Gross Weight */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Масса полуприцепа</span>
            <Weight className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black font-mono text-amber-400">
              {telemetry.trailerAxleLoadTon} т
            </span>
            <span className="text-xs text-slate-400 font-mono">3 оси TEBS</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Полная масса сцепки: {(telemetry.axleLoadFrontTon + telemetry.axleLoadRearTon + telemetry.trailerAxleLoadTon).toFixed(1)} т
          </div>
        </div>
      </div>

      {/* Wheel-by-Wheel Actual Braking Pressures & Temperature Gauges */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Disc className="w-4 h-4 text-red-400" />
            Фактическое давление в тормозных камерах колес и температура дисков
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Расчетное целевое: Тягач {telemetry.targetPressureTractor} Bar / Прицеп {telemetry.targetPressureTrailer} Bar
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Wheel FL */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-amber-400">Переднее Левое (FL)</span>
              <span className="text-[10px] font-mono text-slate-400">PAN19</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-base font-mono font-black text-white">
                {telemetry.brakePressureFL.toFixed(2)} Bar
              </span>
              <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300">
                <Thermometer className="w-3 h-3 text-amber-400" />
                <span>{telemetry.discTempFL}°C</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 flex justify-between">
              <span>Накладка: 9.8 мм</span>
              <span>Износ: {telemetry.frontBrakePadWear}%</span>
            </div>
          </div>

          {/* Wheel FR */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-amber-400">Переднее Правое (FR)</span>
              <span className="text-[10px] font-mono text-slate-400">PAN19</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-base font-mono font-black text-white">
                {telemetry.brakePressureFR.toFixed(2)} Bar
              </span>
              <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300">
                <Thermometer className="w-3 h-3 text-amber-400" />
                <span>{telemetry.discTempFR}°C</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 flex justify-between">
              <span>Накладка: 9.9 мм</span>
              <span>Износ: {telemetry.frontBrakePadWear}%</span>
            </div>
          </div>

          {/* Wheel RL */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-cyan-400">Заднее Левое (RL)</span>
              <span className="text-[10px] font-mono text-slate-400">PAN22</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-base font-mono font-black text-white">
                {telemetry.brakePressureRL.toFixed(2)} Bar
              </span>
              <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300">
                <Thermometer className="w-3 h-3 text-amber-400" />
                <span>{telemetry.discTempRL}°C</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 flex justify-between">
              <span>Энергоаккум: 24/30</span>
              <span>Износ: {telemetry.rearBrakePadWear}%</span>
            </div>
          </div>

          {/* Wheel RR */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-cyan-400">Заднее Правое (RR)</span>
              <span className="text-[10px] font-mono text-slate-400">PAN22</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-base font-mono font-black text-white">
                {telemetry.brakePressureRR.toFixed(2)} Bar
              </span>
              <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300">
                <Thermometer className="w-3 h-3 text-amber-400" />
                <span>{telemetry.discTempRR}°C</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 flex justify-between">
              <span>Энергоаккум: 24/30</span>
              <span>Износ: {telemetry.rearBrakePadWear}%</span>
            </div>
          </div>

          {/* Semi-Trailer Tridem Module */}
          <div className="p-3 rounded-lg bg-slate-900 border border-cyan-500/30 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-emerald-400">Полуприцеп (3 оси)</span>
              <span className="text-[10px] font-mono text-cyan-300">ΔP +{trailerLeadDelta}b</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-base font-mono font-black text-cyan-300">
                {telemetry.brakePressureTrailer.toFixed(2)} Bar
              </span>
              <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300">
                <Thermometer className="w-3 h-3 text-amber-400" />
                <span>{telemetry.discTempTrailer}°C</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 flex justify-between">
              <span>TEBS Modulator</span>
              <span>Износ: {telemetry.trailerBrakePadWear}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

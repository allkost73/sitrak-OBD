import React, { useState, useEffect } from "react";
import { 
  Gauge, 
  Droplets, 
  Flame, 
  Wind, 
  BatteryCharging, 
  Activity, 
  Fuel, 
  AlertOctagon, 
  ArrowUpRight, 
  Sliders, 
  RefreshCw,
  Server,
  AlertTriangle,
  PlayCircle,
  StopCircle,
  Power,
  Bluetooth,
  Radio,
  CheckCircle2,
  PlugZap
} from "lucide-react";
import { TelemetryData } from "../types";
import { elmService } from "../services/elmAdapterService";

interface DashboardViewProps {
  telemetry: TelemetryData;
  isConnected: boolean;
  onNavigateToDtc: () => void;
  onNavigateToTuning: () => void;
  onOpenConnectModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  telemetry,
  isConnected,
  onNavigateToDtc,
  onNavigateToTuning,
  onOpenConnectModal,
}) => {
  const deviceInfo = elmService.getDeviceInfo();
  const isDemoMode = isConnected && deviceInfo?.type === "simulation";
  const isRealHardware = isConnected && deviceInfo && deviceInfo.type !== "simulation";
  const isOffline = !isConnected;

  const [throttlePos, setThrottlePos] = useState<number>(telemetry.acceleratorPedalPosition || 0);
  const [selectedGear, setSelectedGear] = useState<string>(telemetry.currentGear || "N");
  const [isSweeping, setIsSweeping] = useState<boolean>(false);
  const [isStartingDemo, setIsStartingDemo] = useState<boolean>(false);
  const [isEngineRunning, setIsEngineRunning] = useState<boolean>(true);

  // Sync state with incoming telemetry
  useEffect(() => {
    if (telemetry.acceleratorPedalPosition !== undefined && Math.abs(telemetry.acceleratorPedalPosition - throttlePos) > 5) {
      setThrottlePos(telemetry.acceleratorPedalPosition);
    }
    if (telemetry.currentGear) {
      setSelectedGear(telemetry.currentGear);
    }
    if (telemetry.engineRpm > 0) {
      setIsEngineRunning(true);
    }
  }, [telemetry.acceleratorPedalPosition, telemetry.currentGear, telemetry.engineRpm]);

  // Handle throttle change (active in Demo/Standby and interactive testing)
  const handleThrottleChange = (val: number) => {
    setThrottlePos(val);
    setIsEngineRunning(true);

    const baseRpm = 600;
    const targetRpm = Math.round(baseRpm + (val / 100) * 1700);
    const targetBoost = +(0.1 + (val / 100) * 2.3).toFixed(2);
    const targetRail = +(45 + (val / 100) * 115).toFixed(1);
    const targetSpeed = selectedGear === "N" ? 0 : Math.round((val / 100) * 90);
    const targetFuel = val === 0 ? 2.1 : +(18 + (val / 100) * 24).toFixed(1);
    const targetNox = Math.round(35 + (val / 100) * 350);
    const targetLoad = Math.round(12 + (val / 100) * 78);

    elmService.setSimulatedTelemetry({
      acceleratorPedalPosition: val,
      engineRpm: targetRpm,
      boostPressure: targetBoost,
      railPressure: targetRail,
      vehicleSpeed: targetSpeed,
      fuelRate: targetFuel,
      noxInlet: targetNox + 120,
      noxOutlet: targetNox,
      engineLoad: targetLoad,
      batteryVoltage: 28.4,
      oilPressure: +(3.4 + (val / 100) * 1.8).toFixed(1),
    });
  };

  const handleGearSelect = (gear: string) => {
    setSelectedGear(gear);
    elmService.setSimulatedTelemetry({ currentGear: gear });
    if (gear === "N") {
      elmService.setSimulatedTelemetry({ vehicleSpeed: 0 });
    } else if ((isEngineRunning || isDemoMode) && throttlePos > 0) {
      elmService.setSimulatedTelemetry({ vehicleSpeed: Math.round((throttlePos / 100) * 85) });
    }
  };

  const handleToggleEngine = async () => {
    if (isEngineRunning || isDemoMode) {
      setIsEngineRunning(false);
      setThrottlePos(0);
      elmService.setSimulatedTelemetry({
        engineRpm: 0,
        vehicleSpeed: 0,
        boostPressure: 0,
        railPressure: 0,
        oilPressure: 0,
        engineLoad: 0,
        acceleratorPedalPosition: 0,
        fuelRate: 0,
        batteryVoltage: 0,
      });
    } else {
      setIsEngineRunning(true);
      if (isOffline) {
        await elmService.connectSimulator("J1939_250K");
      }
      elmService.setSimulatedTelemetry({
        engineRpm: 600,
        vehicleSpeed: 0,
        boostPressure: 0.15,
        railPressure: 45.0,
        oilPressure: 3.4,
        coolantTemp: 83,
        batteryVoltage: 28.4,
        fuelRate: 2.1,
        engineLoad: 14,
        airCircuit1: 10.4,
        airCircuit2: 10.1,
        airCircuit3: 8.5,
        airCircuit4: 9.6,
      });
    }
  };

  const handleGaugeSweep = async () => {
    if (isSweeping) return;
    setIsSweeping(true);
    try {
      await elmService.runGaugeSweepTest();
    } finally {
      setIsSweeping(false);
    }
  };

  const handleStartDemoMode = async () => {
    setIsStartingDemo(true);
    try {
      await elmService.connectSimulator("J1939_250K");
      setIsEngineRunning(true);
    } finally {
      setIsStartingDemo(false);
    }
  };

  const handleStopDemoMode = async () => {
    setIsEngineRunning(false);
    setThrottlePos(0);
    await elmService.disconnect();
  };

  // Tachometer angle calculation (-120 deg at 0 RPM to +120 deg at 3000 RPM)
  const displayRpm = telemetry.engineRpm || 0;
  const rpmAngle = -120 + (Math.min(3000, Math.max(0, displayRpm)) / 3000) * 240;

  // Boost angle calculation (-120 deg at 0.0 Bar to +120 deg at 3.0 Bar)
  const displayBoost = telemetry.boostPressure || 0;
  const boostAngle = -120 + (Math.min(3.0, Math.max(0, displayBoost)) / 3.0) * 240;

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-12">
      {/* =========================================================================
          TOP BANNER: 3 Distinct States (Offline / Demo Mode / Real Hardware Online)
         ========================================================================= */}
      {isOffline ? (
        // STATE 1: OFFLINE (ELM scanner not connected)
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-slate-400">
                <Bluetooth className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Панель приборов Sitrak S7H / C7H (MC13 MAN 24V)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    ОФФЛАЙН (ОЖИДАНИЕ ELM375)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Адаптер ELM375/ELM327 не подключен к тягачу. Для считывания реальных параметров подключите сканер через Bluetooth Classic (сопряжение с PIN 1234), BLE или USB.
                </p>
              </div>
            </div>

            {/* Actions for Offline State */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
              <button
                id="btn-dash-connect-modal"
                onClick={onOpenConnectModal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 flex-1 md:flex-initial"
              >
                <Bluetooth className="w-4 h-4" />
                <span>Подключить реальный ELM375</span>
              </button>

              <button
                id="btn-dash-start-demo"
                onClick={handleStartDemoMode}
                disabled={isStartingDemo}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs shadow transition-all active:scale-95 flex items-center justify-center gap-1.5 flex-1 md:flex-initial"
                title="Включить программную симуляцию для тестирования приложения без тягача"
              >
                <PlayCircle className="w-4 h-4 text-amber-400" />
                <span>{isStartingDemo ? "Запуск..." : "Включить ДЕМО"}</span>
              </button>

              <button
                id="btn-dash-sweep-test"
                onClick={handleGaugeSweep}
                disabled={isSweeping}
                className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold text-xs shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
                title="Проверить анимацию и движение всех стрелок на панели"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSweeping ? "animate-spin" : ""}`} />
                <span>Тест стрелок</span>
              </button>
            </div>
          </div>
        </div>
      ) : isDemoMode ? (
        // STATE 2: DEMO MODE (Virtual simulator active)
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-950/90 via-slate-900 to-slate-900 border border-amber-500/50 shadow-xl space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Панель приборов Sitrak S7H / C7H (MC13 MAN 24V)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    ДЕМО-РЕЖИМ (ЭМУЛЯТОР)
                  </span>
                </div>
                <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                  Включен режим виртуальной симуляции шины CAN J1939. Вы можете нажимать газ, переключать передачи и проверять отклик датчиков. <b>Для работы с реальным грузовиком нажмите «Подключить реальный ELM375» или отключите Демо.</b>
                </p>
              </div>
            </div>

            {/* Actions for Demo Mode */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
              <button
                id="btn-dash-connect-modal"
                onClick={onOpenConnectModal}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 flex-1 md:flex-initial"
              >
                <Bluetooth className="w-4 h-4" />
                <span>Подключить реальный ELM375</span>
              </button>

              <button
                id="btn-dash-stop-demo"
                onClick={handleStopDemoMode}
                className="px-3.5 py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/50 font-bold text-xs shadow transition-all active:scale-95 flex items-center justify-center gap-1.5 flex-1 md:flex-initial"
                title="Остановить эмулятор и вернуться в режим ожидания"
              >
                <StopCircle className="w-4 h-4 text-red-400" />
                <span>Отключить ДЕМО</span>
              </button>

              <button
                id="btn-dash-sweep-test"
                onClick={handleGaugeSweep}
                disabled={isSweeping}
                className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold text-xs shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSweeping ? "animate-spin" : ""}`} />
                <span>Тест стрелок</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        // STATE 3: REAL HARDWARE CONNECTED
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/50 shadow-xl space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Реальный адаптер ELM375 подключен к Sitrak S7H
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    ОНЛАЙН (J1939 CAN 250k)
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Прямой опрос блоков управления: <b className="text-white">{Math.round(telemetry.engineRpm)} об/мин</b> • <b className="text-white">{Math.round(telemetry.vehicleSpeed)} км/ч</b> • Бортсеть: <b className="text-emerald-300">{telemetry.batteryVoltage > 0 ? `${telemetry.batteryVoltage.toFixed(1)}V` : "28.4V"}</b>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <button
                onClick={handleGaugeSweep}
                disabled={isSweeping}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSweeping ? "animate-spin" : ""}`} />
                <span>Тест стрелок</span>
              </button>

              <button
                onClick={onOpenConnectModal}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
              >
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span>Параметры CAN</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Dial Gauges & Truck Speedometer Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* Left Dial: Tachometer (Обороты двигателя об/мин) */}
        <div className="lg:col-span-4 p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-slate-800 flex flex-col items-center justify-between shadow-xl relative overflow-hidden">
          <div className="w-full flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Gauge className="w-4 h-4" />
              ТАХОМЕТР MC13
            </span>
            <span className="font-mono text-slate-300">RPM × 100</span>
          </div>

          {/* SVG Tachometer Dial */}
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-60 md:h-60 flex items-center justify-center my-2">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
              {/* Outer track */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#1e293b"
                strokeWidth="12"
                strokeDasharray="335 170"
                strokeDashoffset="-25"
              />
              {/* Green Eco Zone (1000 - 1400 RPM) */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#10b981"
                strokeWidth="12"
                strokeDasharray="50 450"
                strokeDashoffset="-90"
                className="opacity-80"
              />
              {/* Yellow Warning Zone (1800 - 2200 RPM) */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="12"
                strokeDasharray="40 460"
                strokeDashoffset="-180"
                className="opacity-85"
              />
              {/* Red Zone (2200 - 3000 RPM) */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#ef4444"
                strokeWidth="12"
                strokeDasharray="80 420"
                strokeDashoffset="-220"
                className="opacity-90"
              />
            </svg>

            {/* Dial Needle */}
            <div
              className="absolute w-full h-full flex items-center justify-center pointer-events-none transition-transform duration-200 ease-out"
              style={{ transform: `rotate(${rpmAngle}deg)` }}
            >
              <div className="w-1.5 h-24 bg-gradient-to-t from-red-600 via-amber-400 to-amber-200 rounded-full shadow-lg shadow-amber-500/60 -translate-y-12" />
            </div>

            {/* Center Hub & Digital Readout */}
            <div className="absolute flex flex-col items-center justify-center text-center bg-slate-950/95 border border-slate-700 w-24 h-24 sm:w-28 sm:h-28 rounded-full shadow-2xl">
              <span className="text-xl sm:text-2xl md:text-3xl font-black font-mono tracking-tight text-white">
                {Math.round(displayRpm)}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                ОБ/МИН
              </span>
              <span className="text-[8px] sm:text-[9px] text-emerald-400 font-mono mt-0.5">
                ЭКО 11-14
              </span>
            </div>
          </div>

          <div className="w-full flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-400 px-2">
            <span>0</span>
            <span className="text-emerald-400 font-semibold">10-14 (ЭКО)</span>
            <span>20</span>
            <span className="text-red-400">30</span>
          </div>
        </div>

        {/* Center: Truck Central Speedometer & Gear Display */}
        <div className="lg:col-span-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 flex flex-col items-center justify-between shadow-xl">
          <div className="w-full flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span className="text-blue-400">СКОРОСТЬ & КПП TRAXON</span>
            <span className="text-slate-300 font-mono">SITRAK C7H</span>
          </div>

          {/* Speed & Gear Big Card */}
          <div className="my-auto py-3 flex flex-col items-center justify-center text-center space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl sm:text-6xl font-black font-mono tracking-tighter text-white drop-shadow-md">
                {Math.round(telemetry.vehicleSpeed)}
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-400 uppercase">
                км/ч
              </span>
            </div>

            {/* Gear Selector Pill */}
            <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 shadow-inner">
              <span className="text-xs text-slate-400 font-medium">Передача:</span>
              <span className="text-lg font-black font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                {telemetry.currentGear || selectedGear}
              </span>
              <span className="text-xs text-slate-400">
                (ZF TraXon)
              </span>
            </div>

            {/* Quick Gear buttons */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {["R", "N", "D1", "D3", "D6", "D12"].map((g) => (
                <button
                  key={g}
                  id={`btn-gear-${g}`}
                  onClick={() => handleGearSelect(g)}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all active:scale-95 ${
                    (telemetry.currentGear || selectedGear) === g
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Torque & Load Indicators */}
          <div className="w-full space-y-1.5 pt-2 border-t border-slate-800 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Нагрузка на двигатель:</span>
              <span className="font-mono font-bold text-white">
                {isEngineRunning ? telemetry.engineLoad || 14 : 0}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-red-500 transition-all duration-200"
                style={{ width: `${Math.min(100, isEngineRunning ? telemetry.engineLoad || 14 : 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Dial: Boost Turbo Pressure (Давление наддува Bar) */}
        <div className="lg:col-span-4 p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-slate-800 flex flex-col items-center justify-between shadow-xl relative overflow-hidden">
          <div className="w-full flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Wind className="w-4 h-4" />
              НАДДУВ ТУРБИНЫ VGT
            </span>
            <span className="font-mono text-slate-300">BAR (Holset)</span>
          </div>

          {/* SVG Boost Dial */}
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-60 md:h-60 flex items-center justify-center my-2">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#1e293b"
                strokeWidth="12"
                strokeDasharray="335 170"
                strokeDashoffset="-25"
              />
              {/* Working boost range (0.5 - 2.4 Bar) */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="12"
                strokeDasharray="180 320"
                strokeDashoffset="-70"
                className="opacity-80"
              />
              {/* Overboost red zone (>2.5 Bar) */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#ef4444"
                strokeWidth="12"
                strokeDasharray="60 440"
                strokeDashoffset="-250"
                className="opacity-90"
              />
            </svg>

            {/* Dial Needle */}
            <div
              className="absolute w-full h-full flex items-center justify-center pointer-events-none transition-transform duration-200 ease-out"
              style={{ transform: `rotate(${boostAngle}deg)` }}
            >
              <div className="w-1.5 h-24 bg-gradient-to-t from-cyan-600 via-cyan-400 to-cyan-200 rounded-full shadow-lg shadow-cyan-500/60 -translate-y-12" />
            </div>

            {/* Center Readout */}
            <div className="absolute flex flex-col items-center justify-center text-center bg-slate-950/95 border border-slate-700 w-24 h-24 sm:w-28 sm:h-28 rounded-full shadow-2xl">
              <span className="text-xl sm:text-2xl md:text-3xl font-black font-mono tracking-tight text-white">
                {displayBoost.toFixed(2)}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                BAR
              </span>
              <span className="text-[8px] sm:text-[9px] text-slate-400 font-mono mt-0.5">
                МАКС 2.55
              </span>
            </div>
          </div>

          <div className="w-full flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-400 px-2">
            <span>0.0</span>
            <span className="text-cyan-400">1.5 Bar</span>
            <span>2.4</span>
            <span className="text-red-400">3.0</span>
          </div>
        </div>
      </div>

      {/* Interactive Throttle & Ignition Controls */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Педаль газа (E-Gas Accelerator) & Зажигание
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-dash-toggle-engine"
              onClick={handleToggleEngine}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow ${
                isEngineRunning 
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                  : "bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/40"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isEngineRunning ? "Двигатель ВКЛ (ХХ)" : "Включить зажигание"}</span>
            </button>

            <span className="text-xs font-mono font-bold text-amber-400 px-2 py-1 bg-slate-950 rounded-lg border border-slate-800">
              Газ: {throttlePos}%
            </span>
          </div>
        </div>

        <input
          id="slider-throttle"
          type="range"
          min="0"
          max="100"
          value={throttlePos}
          onChange={(e) => handleThrottleChange(Number(e.target.value))}
          className="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
        />

        <div className="flex justify-between text-[10px] sm:text-xs font-mono text-slate-400">
          <span>Холостой ход (0%)</span>
          <span>Частичная нагрузка (50%)</span>
          <span>Kickdown 100% (2300 RPM / 2.5 Bar)</span>
        </div>
      </div>

      {/* Heavy Truck Key Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Давление масла */}
        <div className="p-3 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Давление масла</span>
            </span>
            <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded ${
              (telemetry.oilPressure || (isEngineRunning ? 3.4 : 0)) >= 1.8 ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"
            }`}>
              {(telemetry.oilPressure || (isEngineRunning ? 3.4 : 0)) >= 1.8 ? "НОРМА" : "НИЗКОЕ"}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-white">
              {(telemetry.oilPressure || (isEngineRunning ? 3.4 : 0)).toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-slate-400">Bar</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">Допуск: 1.5 – 5.5 Bar</p>
        </div>

        {/* Температура ОЖ */}
        <div className="p-3 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-400 shrink-0" />
              <span className="truncate">Температура ОЖ</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300">
              {(telemetry.coolantTemp || (isEngineRunning ? 83 : 0)) < 95 ? "НОРМА" : "ПЕРЕГРЕВ"}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-white">
              {Math.round(telemetry.coolantTemp || (isEngineRunning ? 83 : 0))}
            </span>
            <span className="text-xs font-semibold text-slate-400">°C</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">Термостат 83°C • Вент 92°C</p>
        </div>

        {/* Давление Common Rail */}
        <div className="p-3 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Fuel className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="truncate">Давление в рампе</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300">
              Bosch CR
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-white">
              {Math.round(telemetry.railPressure || (isEngineRunning ? 45 : 0))}
            </span>
            <span className="text-xs font-semibold text-slate-400">MPa</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">ТНВД CP3.4+ • Max 180 MPa</p>
        </div>

        {/* Пневмосистема (4 контура WABCO) */}
        <div className="p-3 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="truncate">Пневмо (4 Контура)</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300">
              10.4 Bar
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">К1 (Перед):</span>
              <span className="font-bold text-white">{telemetry.airCircuit1 || 10.4} b</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">К2 (Зад):</span>
              <span className="font-bold text-white">{telemetry.airCircuit2 || 10.1} b</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">К3 (Прицеп):</span>
              <span className="font-bold text-cyan-400">{telemetry.airCircuit3 || 8.5} b</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">К4 (ECAS):</span>
              <span className="font-bold text-purple-400">{telemetry.airCircuit4 || 9.6} b</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">WABCO EC-APU осушитель</p>
        </div>

        {/* Уровень AdBlue */}
        <div className="p-3 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="truncate">AdBlue (Мочевина)</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300">
              OK
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-white">
              {(telemetry.adblueLevel || 45).toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-slate-400">%</span>
            <span className="text-[10px] text-slate-400 ml-auto font-mono">
              32.5% AUS
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">Бак 45л • Подогрев DCU</p>
        </div>

        {/* Датчики NOx */}
        <div className="p-3 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">Выбросы NOx</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300">
              SCR
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <div>
              <span className="text-[10px] text-slate-400">Вход: </span>
              <span className="text-sm font-bold font-mono text-slate-300">
                {Math.round(telemetry.noxInlet || (isEngineRunning ? 380 : 0))}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Выход: </span>
              <span className="text-sm font-black font-mono text-emerald-400">
                {Math.round(telemetry.noxOutlet || (isEngineRunning ? 42 : 0))}
              </span>
            </div>
            <span className="text-xs text-slate-400">ppm</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">Эффективность SCR: 89%</p>
        </div>

        {/* Мгновенный расход топлива */}
        <div className="p-3 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Fuel className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Расход топлива</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {telemetry.vehicleSpeed > 0 ? "В пути" : "ХХ"}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-white">
              {(telemetry.fuelRate || (isEngineRunning ? 2.1 : 0)).toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {telemetry.vehicleSpeed > 0 ? "л/100км" : "л/час"}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">Бак 600+400л ДТ Евро-5</p>
        </div>

        {/* Бортовая сеть 24V */}
        <div className="p-3 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <BatteryCharging className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">Бортсеть 24V</span>
            </span>
            <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded ${
              (telemetry.batteryVoltage || (isEngineRunning ? 28.4 : 24.2)) >= 27.0
                ? "bg-emerald-950 text-emerald-300"
                : "bg-amber-950 text-amber-300"
            }`}>
              {(telemetry.batteryVoltage || (isEngineRunning ? 28.4 : 24.2)) >= 27.0 ? "ГЕНЕРАТОР" : "АКБ 24V"}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-white">
              {(telemetry.batteryVoltage || (isEngineRunning ? 28.4 : 24.2)).toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-slate-400">V</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">2×12V 225Ah • Ген. 110A</p>
        </div>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <button
          id="btn-dash-scan-dtc"
          onClick={onNavigateToDtc}
          className="p-3.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-left transition-all flex items-center justify-between shadow-md active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/30 text-red-400 flex items-center justify-center">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Диагностика ошибок (DTC)</div>
              <div className="text-[11px] text-red-300">Сканировать 7 блоков ЭБУ</div>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-red-400" />
        </button>

        <button
          id="btn-dash-tuning"
          onClick={onNavigateToTuning}
          className="p-3.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-blue-500/30 text-left transition-all flex items-center justify-between shadow-md active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Калибровка и настройки</div>
              <div className="text-[11px] text-blue-300">Ограничитель, холостые, форсунки</div>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-blue-400" />
        </button>

        <button
          id="btn-dash-connect"
          onClick={onOpenConnectModal}
          className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left transition-all flex items-center justify-between shadow-md active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Bluetooth className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Параметры адаптера ELM</div>
              <div className="text-[11px] text-slate-400">J1939 CAN / Bluetooth / USB</div>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
};

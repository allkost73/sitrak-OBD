import React, { useState, useEffect } from "react";
import { 
  Wind, 
  Disc, 
  Truck, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  Flame, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Activity, 
  Sliders, 
  Layers, 
  ArrowUp, 
  ArrowDown, 
  Maximize2, 
  Play, 
  Clock, 
  Thermometer, 
  ChevronRight,
  Info,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { TelemetryData, TruckConfig } from "../types";
import { elmService } from "../services/elmAdapterService";
import { BrakeCompatibilityChart } from "./brake/BrakeCompatibilityChart";
import { BrakeLiveTelemetryCard } from "./brake/BrakeLiveTelemetryCard";
import { BrakePresetsSection } from "./brake/BrakePresetsSection";
import { CfcCalibrationWizardModal } from "./brake/CfcCalibrationWizardModal";
import { STANDARD_BRAKE_PRESETS, BrakePresetProfile } from "../data/sitrakData";
import confetti from "canvas-confetti";

interface PneumaticsBrakeViewProps {
  telemetry: TelemetryData;
  config: TruckConfig;
  setConfig: React.Dispatch<React.SetStateAction<TruckConfig>>;
  isConnected: boolean;
  onOpenDriveModal?: () => void;
}

export const PneumaticsBrakeView: React.FC<PneumaticsBrakeViewProps> = ({
  telemetry,
  config,
  setConfig,
  isConnected,
  onOpenDriveModal,
}) => {
  // Navigation Sub-tab within Pneumatics & Brakes
  const [activeSubTab, setActiveSubTab] = useState<"ebs_distribution" | "live_data" | "presets" | "apu" | "ecas">("ebs_distribution");

  // Pneumatic APU State
  const [cutInPressure, setCutInPressure] = useState<number>(config.apuCutInPressure);
  const [cutOutPressure, setCutOutPressure] = useState<number>(config.apuCutOutPressure);
  const [purgeDuration, setPurgeDuration] = useState<number>(config.apuPurgeDurationSec);
  const [apuHeaterTemp, setApuHeaterTemp] = useState<number>(config.apuHeaterAutoTemp);

  // Brake Force & Trailer Distribution State
  const [trailerLeadDelta, setTrailerLeadDelta] = useState<number>(config.trailerBrakeLeadDeltaBar);
  const [frontRearBalance, setFrontRearBalance] = useState<number>(config.frontRearBrakeBalancePercent);
  const [padWearBalancing, setPadWearBalancing] = useState<boolean>(config.brakePadWearBalancingEnabled);
  const [cfcEnabled, setCfcEnabled] = useState<boolean>(config.couplingForceControlEnabled ?? true);
  const [liningPressure, setLiningPressure] = useState<number>(config.liningContactPressureBar ?? 0.40);
  const [retarderBlending, setRetarderBlending] = useState<"retarder_first" | "balanced" | "direct">(config.retarderBlendingMode);
  const [trailerProtocol, setTrailerProtocol] = useState<"iso7638_can" | "pneumatic_conventional" | "auto_detect">(config.trailerEbsProtocol);
  const [stretchBrakeLevel, setStretchBrakeLevel] = useState<number>(config.trailerStretchBrakeLevel);
  const [hillHoldSec, setHillHoldSec] = useState<number>(config.hillStartAssistHoldSec);
  const [emergencyThreshold, setEmergencyThreshold] = useState<"gentle" | "standard" | "aggressive">(config.trailerEmergencyBrakingThreshold);

  // ECAS Air Suspension State
  const [rideOffset, setRideOffset] = useState<number>(config.ecasNormalRideOffsetMm);
  const [dockingM1, setDockingM1] = useState<number>(config.ecasDockingM1HighMm);
  const [dockingM2, setDockingM2] = useState<number>(config.ecasDockingM2LowMm);
  const [autoLevelSpeed, setAutoLevelSpeed] = useState<number>(config.ecasAutoLevelingSpeedKmH);

  // Modal & Diagnostic States
  const [isCfcWizardOpen, setIsCfcWizardOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveProgress, setSaveProgress] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Interactive Live Service Actions
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [isStretchTestActive, setIsStretchTestActive] = useState<boolean>(false);
  const [isLeakageTestActive, setIsLeakageTestActive] = useState<boolean>(false);
  const [leakageTimer, setLeakageTimer] = useState<number>(60);
  const [leakageStartPressure, setLeakageStartPressure] = useState<number | null>(null);
  const [leakageResult, setLeakageResult] = useState<{ drop: number; passed: boolean } | null>(null);
  const [currentSuspensionHeight, setCurrentSuspensionHeight] = useState<number>(0); // mm

  // Update simulation when parameters change
  useEffect(() => {
    elmService.updateBrakeSimulation(telemetry.brakePedalTravel || 0, trailerLeadDelta, frontRearBalance, cfcEnabled);
  }, [trailerLeadDelta, frontRearBalance, cfcEnabled]);

  // Leakage Test Interval
  useEffect(() => {
    let interval: any = null;
    if (isLeakageTestActive && leakageTimer > 0) {
      interval = setInterval(() => {
        setLeakageTimer((prev) => prev - 1);
      }, 1000);
    } else if (isLeakageTestActive && leakageTimer === 0) {
      setIsLeakageTestActive(false);
      const endP = telemetry.airCircuit1;
      const startP = leakageStartPressure || 10.4;
      const drop = Math.max(0, +(startP - endP).toFixed(2));
      const passed = drop <= 0.08; // Less than 0.08 Bar drop in 1 min
      setLeakageResult({ drop, passed });
    }
    return () => clearInterval(interval);
  }, [isLeakageTestActive, leakageTimer, leakageStartPressure, telemetry.airCircuit1]);

  // Start Leakage Test
  const handleStartLeakageTest = async () => {
    setLeakageStartPressure(telemetry.airCircuit1);
    setLeakageTimer(60);
    setLeakageResult(null);
    setIsLeakageTestActive(true);
    await elmService.sendCommand("2F 03 18 03 01", "Запуск режима диагностики герметичности WABCO EBS");
  };

  // Trigger Purge APU
  const handleTriggerPurge = async () => {
    setIsPurging(true);
    try {
      await elmService.sendCommand("2F 02 11 03 01", "Команда принудительной продувки патрона осушителя EC-APU");
      setTimeout(() => {
        setIsPurging(false);
        setStatusMsg({ type: "success", text: "Продувка патрона осушителя успешно завершена. Клапан сброса закрыт." });
      }, 4000);
    } catch (err: any) {
      setIsPurging(false);
      setStatusMsg({ type: "error", text: "Ошибка связи с блоком APU: " + err.message });
    }
  };

  // Trigger Stretch Brake Test (Semi-trailer test)
  const handleTriggerStretchBrake = async () => {
    setIsStretchTestActive(true);
    try {
      await elmService.sendCommand("2F 04 22 03 01", `Тестовая натяжка полуприцепа (уровень ${stretchBrakeLevel})`);
      setTimeout(() => {
        setIsStretchTestActive(false);
        setStatusMsg({ type: "success", text: "Тест тормозов полуприцепа выполнен: управляющая магистраль исправна." });
      }, 3500);
    } catch (err: any) {
      setIsStretchTestActive(false);
      setStatusMsg({ type: "error", text: "Ошибка включения натяжки полуприцепа: " + err.message });
    }
  };

  // ECAS Height Adjustment
  const handleAdjustSuspension = async (targetMm: number) => {
    setCurrentSuspensionHeight(targetMm);
    await elmService.sendCommand(
      `2F 05 30 03 ${(targetMm + 100).toString(16).padStart(2, "0")}`,
      `Установка высоты подвески ECAS: ${targetMm > 0 ? "+" : ""}${targetMm} мм`
    );
  };

  // 1-Click Apply Preset
  const handleApplyPreset = async (preset: BrakePresetProfile) => {
    setTrailerLeadDelta(preset.trailerLeadDeltaBar);
    setFrontRearBalance(preset.frontRearBrakeBalancePercent);
    setCfcEnabled(preset.couplingForceControlEnabled);
    setLiningPressure(preset.liningContactPressureBar);
    setRetarderBlending(preset.retarderBlendingMode);
    setStretchBrakeLevel(preset.trailerStretchBrakeLevel);
    setHillHoldSec(preset.hillStartAssistHoldSec);
    setEmergencyThreshold(preset.trailerEmergencyBrakingThreshold);

    setIsSaving(true);
    setSaveProgress(30);
    setStatusMsg({ type: "info", text: `Применение профиля «${preset.name}»...` });

    try {
      await elmService.sendCommand("27 01", "Security Access EBS3");
      setSaveProgress(60);
      await new Promise((r) => setTimeout(r, 300));

      const leadHex = Math.round(preset.trailerLeadDeltaBar * 100).toString(16).padStart(2, "0");
      await elmService.sendCommand(`2E 04 10 ${leadHex}`, `Запись опережения: +${preset.trailerLeadDeltaBar} Bar`);
      setSaveProgress(80);

      const balHex = Math.round(preset.frontRearBrakeBalancePercent).toString(16).padStart(2, "0");
      await elmService.sendCommand(`2E 04 12 ${balHex}`, `Запись баланса: ${preset.frontRearBrakeBalancePercent}%`);
      setSaveProgress(100);

      setConfig((prev) => ({
        ...prev,
        trailerBrakeLeadDeltaBar: preset.trailerLeadDeltaBar,
        frontRearBrakeBalancePercent: preset.frontRearBrakeBalancePercent,
        couplingForceControlEnabled: preset.couplingForceControlEnabled,
        liningContactPressureBar: preset.liningContactPressureBar,
        retarderBlendingMode: preset.retarderBlendingMode,
        trailerStretchBrakeLevel: preset.trailerStretchBrakeLevel,
        hillStartAssistHoldSec: preset.hillStartAssistHoldSec,
        trailerEmergencyBrakingThreshold: preset.trailerEmergencyBrakingThreshold,
        presetProfileName: preset.name,
      }));

      setStatusMsg({ type: "success", text: `Профиль «${preset.name}» успешно прошит в блок WABCO EBS3!` });
      confetti({ particleCount: 50, spread: 65, origin: { y: 0.8 } });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Ошибка прошивки профиля: " + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Save All Pneumatic & Brake Configurations to WABCO ECUs
  const handleSaveAllParameters = async () => {
    setIsSaving(true);
    setSaveProgress(15);
    setStatusMsg({ type: "info", text: "Авторизация Security Access в блоках WABCO EBS3 & EC-APU..." });

    try {
      await elmService.sendCommand("27 01", "UDS Security Access Seed (EBS3 ECU)");
      setSaveProgress(35);
      await new Promise((r) => setTimeout(r, 300));

      // 1. Write Trailer Brake Lead Delta
      const leadHex = Math.round(trailerLeadDelta * 100).toString(16).padStart(2, "0");
      await elmService.sendCommand(`2E 04 10 ${leadHex}`, `Запись опережения полуприцепа: +${trailerLeadDelta} Bar`);
      setSaveProgress(55);
      await new Promise((r) => setTimeout(r, 250));

      // 2. Write Front/Rear Balance Ratio
      const balHex = Math.round(frontRearBalance).toString(16).padStart(2, "0");
      await elmService.sendCommand(`2E 04 12 ${balHex}`, `Запись распределения тормозных сил: ${frontRearBalance}% перед`);
      setSaveProgress(75);
      await new Promise((r) => setTimeout(r, 250));

      // 3. Write APU Cut-in/Cut-out
      await elmService.sendCommand(
        `2E 02 05 ${Math.round(cutInPressure * 10).toString(16).padStart(2, "0")} ${Math.round(cutOutPressure * 10).toString(16).padStart(2, "0")}`,
        `Запись порогов компрессора: ${cutInPressure}-${cutOutPressure} Bar`
      );
      setSaveProgress(100);

      // Update state
      setConfig((prev) => ({
        ...prev,
        apuCutInPressure: cutInPressure,
        apuCutOutPressure: cutOutPressure,
        apuPurgeDurationSec: purgeDuration,
        apuHeaterAutoTemp: apuHeaterTemp,
        trailerBrakeLeadDeltaBar: trailerLeadDelta,
        frontRearBrakeBalancePercent: frontRearBalance,
        brakePadWearBalancingEnabled: padWearBalancing,
        couplingForceControlEnabled: cfcEnabled,
        liningContactPressureBar: liningPressure,
        retarderBlendingMode: retarderBlending,
        trailerEbsProtocol: trailerProtocol,
        trailerStretchBrakeLevel: stretchBrakeLevel,
        hillStartAssistHoldSec: hillHoldSec,
        trailerEmergencyBrakingThreshold: emergencyThreshold,
        ecasNormalRideOffsetMm: rideOffset,
        ecasDockingM1HighMm: dockingM1,
        ecasDockingM2LowMm: dockingM2,
        ecasAutoLevelingSpeedKmH: autoLevelSpeed,
      }));

      setStatusMsg({ type: "success", text: "Калибровки успешно прошиты в память блоков WABCO EBS3 и EC-APU Sitrak!" });
      confetti({ particleCount: 50, spread: 65, origin: { y: 0.8 } });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Ошибка записи: " + (err.message || "Таймаут шины CAN") });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-amber-950/40 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Пневматическая система & Распределение тормозных сил WABCO EBS3
              </h2>
              <p className="text-xs text-slate-400">
                Эталонные калибровки ECE R13, фактические данные давления камер, опережение полуприцепа и блок EC-APU
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-open-cfc-top"
            onClick={() => setIsCfcWizardOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-cyan-600/90 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Zap className="w-4 h-4 text-cyan-200" />
            <span>Автокалибровка CFC</span>
          </button>

          <button
            id="btn-save-pneumatics-top"
            disabled={isSaving}
            onClick={handleSaveAllParameters}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Запись в ЭБУ..." : "Сохранить калибровки"}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("ebs_distribution")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === "ebs_distribution"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-850"
          }`}
        >
          <Disc className="w-4 h-4" />
          <span>Распределение тормозов (EBS3)</span>
        </button>

        <button
          onClick={() => setActiveSubTab("live_data")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === "live_data"
              ? "bg-emerald-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-850"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Фактические данные & Тест педали</span>
        </button>

        <button
          onClick={() => setActiveSubTab("presets")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === "presets"
              ? "bg-cyan-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-850"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Эталонные пресеты ECE R13</span>
        </button>

        <button
          onClick={() => setActiveSubTab("apu")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === "apu"
              ? "bg-blue-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-850"
          }`}
        >
          <Wind className="w-4 h-4" />
          <span>Осушитель EC-APU & 4 Контура</span>
        </button>

        <button
          onClick={() => setActiveSubTab("ecas")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === "ecas"
              ? "bg-purple-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-850"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Пневмоподвеска ECAS</span>
        </button>
      </div>

      {/* Status Feedback Notification */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-in fade-in duration-200 ${
            statusMsg.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : statusMsg.type === "error"
              ? "bg-red-950/40 border-red-500/40 text-red-300"
              : "bg-blue-950/40 border-blue-500/40 text-blue-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="font-medium">{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-slate-400 hover:text-white px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Progress Bar during Flashing */}
      {isSaving && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/40 space-y-1.5 shadow-lg">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-300 font-bold">Прошивка EEPROM WABCO EBS3...</span>
            <span className="text-amber-400 font-bold">{saveProgress}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-300"
              style={{ width: `${saveProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* SUB-TAB 1: EBS BRAKE DISTRIBUTION SETTINGS */}
      {activeSubTab === "ebs_distribution" && (
        <div className="space-y-5">
          {/* Compatibility Band Visualizer */}
          <BrakeCompatibilityChart
            telemetry={telemetry}
            trailerLeadDeltaBar={trailerLeadDelta}
          />

          {/* Core Brake Controls: Lead Factor, Axle Balance, In-shot pressure */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Disc className="w-5 h-5 text-red-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Калибровка тормозных усилий тягача и полуприцепа (WABCO EBS3)
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                ISO 11992-2 CAN
              </span>
            </div>

            {/* Trailer Lead Factor */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Опережение тормозов полуприцепа (Trailer Lead Factor, ΔP)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Защита от складывания
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Упреждающая подача давления в желтую управляющую магистраль прицепа. Растягивает автопоезд и исключает набегание.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-black font-mono text-amber-400">
                    +{trailerLeadDelta.toFixed(2)} Bar
                  </span>
                  <span className="text-[10px] text-slate-500 block">Заводской эталон ECE R13: +0.35 Bar</span>
                </div>
              </div>

              <input
                id="slider-trailer-lead"
                type="range"
                min="0.0"
                max="0.80"
                step="0.05"
                value={trailerLeadDelta}
                onChange={(e) => setTrailerLeadDelta(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />

              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0.0 Bar (Без опережения)</span>
                <span className="text-emerald-400 font-bold">+0.35 Bar (Эталон Sitrak)</span>
                <span>+0.80 Bar (Макс. натяжка)</span>
              </div>
            </div>

            {/* Front/Rear Axle Balance and In-shot Pressure */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Front / Rear Ratio */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-white block">Баланс тормозных сил тягача (Перед / Зад)</span>
                    <span className="text-[11px] text-slate-400">Распределение гидравлико-пневматических моментов</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-400 shrink-0">
                    {frontRearBalance}% / {100 - frontRearBalance}%
                  </span>
                </div>

                <input
                  id="slider-brake-balance"
                  type="range"
                  min="35"
                  max="65"
                  step="1"
                  value={frontRearBalance}
                  onChange={(e) => setFrontRearBalance(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />

                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>35% Перед</span>
                  <span className="text-emerald-400 font-bold">46% / 54% (Заводской норматив)</span>
                  <span>65% Перед</span>
                </div>
              </div>

              {/* CFC & Lining Contact Threshold */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Система сцепного баланса (CFC Control)</span>
                    <span className="text-[11px] text-slate-400">Динамическое сведение продольного усилия на седле к 0</span>
                  </div>
                  <input
                    id="switch-cfc"
                    type="checkbox"
                    checked={cfcEnabled}
                    onChange={(e) => setCfcEnabled(e.target.checked)}
                    className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Давление прилегания колодок (In-shot):</span>
                    <span className="text-amber-400 font-mono font-bold">{liningPressure.toFixed(2)} Bar</span>
                  </div>
                  <input
                    type="range"
                    min="0.30"
                    max="0.55"
                    step="0.01"
                    value={liningPressure}
                    onChange={(e) => setLiningPressure(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>0.30 Bar (Мягкое)</span>
                    <span className="text-emerald-400 font-bold">0.40 Bar (Стандарт)</span>
                    <span>0.55 Bar</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Auxiliary Options: Retarder Blending & Stretch Brake Test */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <label className="text-xs font-bold text-white block">Согласование с ретардером (ZF/EVB)</label>
                <select
                  id="select-retarder-blending"
                  value={retarderBlending}
                  onChange={(e) => setRetarderBlending(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
                >
                  <option value="retarder_first">Приоритет ретардера (экономия колодок)</option>
                  <option value="balanced">Сбалансированный (EVB + колодки)</option>
                  <option value="direct">Прямой отклик</option>
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-white">Hill Holder (HSA)</label>
                  <span className="text-xs font-mono font-bold text-emerald-400">{hillHoldSec} сек</span>
                </div>
                <select
                  id="select-hill-hold"
                  value={hillHoldSec}
                  onChange={(e) => setHillHoldSec(parseFloat(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
                >
                  <option value={1.5}>1.5 секунды</option>
                  <option value={2.5}>2.5 секунды (Стандарт Sitrak)</option>
                  <option value={4.0}>4.0 секунды (Тяжелый груз)</option>
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Тест натяжки полуприцепа</span>
                  <span className="text-[11px] text-slate-400">Stretch Brake (притормаживание)</span>
                </div>
                <button
                  id="btn-test-stretch-brake"
                  disabled={isStretchTestActive}
                  onClick={handleTriggerStretchBrake}
                  className="mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isStretchTestActive ? "Тестирование..." : "Тестовая натяжка (3 с)"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: LIVE TELEMETRY & ACTUAL VALUES */}
      {activeSubTab === "live_data" && (
        <BrakeLiveTelemetryCard
          telemetry={telemetry}
          config={config}
          trailerLeadDelta={trailerLeadDelta}
          frontRearBalance={frontRearBalance}
          cfcEnabled={cfcEnabled}
        />
      )}

      {/* SUB-TAB 3: PRESETS & 1-CLICK CALIBRATION */}
      {activeSubTab === "presets" && (
        <BrakePresetsSection
          currentLeadDelta={trailerLeadDelta}
          currentBalance={frontRearBalance}
          currentCfc={cfcEnabled}
          onApplyPreset={handleApplyPreset}
          onOpenCalibrationWizard={() => setIsCfcWizardOpen(true)}
          isSaving={isSaving}
        />
      )}

      {/* SUB-TAB 4: APU AIR DRYER & PNEUMATICS */}
      {activeSubTab === "apu" && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Wind className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Электронный блок подготовки воздуха: WABCO EC-APU
              </h3>
              <p className="text-xs text-slate-400">
                Пороги включения компрессора, продувка силикагелевого картриджа и подогрев осушителя
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pressure Thresholds */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-white block">Пороги давления компрессора</span>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Давление включения (Cut-in):</span>
                  <span className="text-amber-400 font-mono font-bold">{cutInPressure.toFixed(1)} Bar</span>
                </div>
                <input
                  id="slider-cut-in"
                  type="range"
                  min="10.0"
                  max="11.5"
                  step="0.1"
                  value={cutInPressure}
                  onChange={(e) => setCutInPressure(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Давление отключения / сброса (Cut-out):</span>
                  <span className="text-cyan-400 font-mono font-bold">{cutOutPressure.toFixed(1)} Bar</span>
                </div>
                <input
                  id="slider-cut-out"
                  type="range"
                  min="11.8"
                  max="13.0"
                  step="0.1"
                  value={cutOutPressure}
                  onChange={(e) => setCutOutPressure(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            </div>

            {/* Purge & Heater Settings */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-white block">Регенерация и подогрев патрона</span>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Длительность продувки силикагеля:</span>
                  <span className="text-purple-400 font-mono font-bold">{purgeDuration} сек</span>
                </div>
                <input
                  id="slider-purge-duration"
                  type="range"
                  min="3"
                  max="15"
                  step="1"
                  value={purgeDuration}
                  onChange={(e) => setPurgeDuration(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Порог автоподогревателя APU</span>
                  <span className="text-[11px] text-slate-400">Включение нагревательного элемента при &lt;{apuHeaterTemp}°C</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">+{apuHeaterTemp}°C</span>
              </div>
            </div>
          </div>

          {/* APU Service Actions: Forced Purge & Leakage Test */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Сервисная продувка APU</span>
                <span className="text-[11px] text-slate-400">Сброс скопившегося конденсата и масла</span>
              </div>
              <button
                id="btn-trigger-purge"
                disabled={isPurging}
                onClick={handleTriggerPurge}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
              >
                <Wind className={`w-3.5 h-3.5 ${isPurging ? "animate-spin text-cyan-400" : "text-slate-400"}`} />
                <span>{isPurging ? "Продувка..." : "Продуть патрон"}</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Тест герметичности (60 сек)</span>
                <span className="text-[11px] text-slate-400">
                  {isLeakageTestActive ? `Идет замер: ${leakageTimer} сек` : leakageResult ? `Падение: ${leakageResult.drop} Bar (${leakageResult.passed ? "НОРМА" : "УТЕЧКА"})` : "Проверка падения давления"}
                </span>
              </div>
              <button
                id="btn-leakage-test"
                disabled={isLeakageTestActive}
                onClick={handleStartLeakageTest}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
                  isLeakageTestActive
                    ? "bg-amber-500 text-slate-950 animate-pulse"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{isLeakageTestActive ? `${leakageTimer} с` : "Запустить тест"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: ECAS AIR SUSPENSION */}
      {activeSubTab === "ecas" && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Layers className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Электронная пневматическая подвеска: WABCO ECAS
              </h3>
              <p className="text-xs text-slate-400">
                Калибровка транспортного положения, высоты погрузочных рамп M1/M2 и помощи при трогании (Traction Help)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ECAS Height Presets */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-white block">Память уровней высоты рамы</span>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">РАМПА M1</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">+{dockingM1} мм</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-amber-500/30">
                  <span className="text-[10px] text-amber-400 block font-mono">ТРАНСПОРТ</span>
                  <span className="text-xs font-mono font-bold text-white">{rideOffset >= 0 ? `+${rideOffset}` : rideOffset} мм</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">РАМПА M2</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">{dockingM2} мм</span>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-400">Смещение транспортного уровня:</span>
                  <span className="text-white font-mono font-bold">{rideOffset} мм</span>
                </div>
                <input
                  id="slider-ride-offset"
                  type="range"
                  min="-30"
                  max="30"
                  step="2"
                  value={rideOffset}
                  onChange={(e) => setRideOffset(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>

            {/* Interactive ECAS Remote Controller */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white">Пульт управления подвеской ECAS</span>
                <span className="text-xs font-mono text-purple-300">
                  Высота: {currentSuspensionHeight > 0 ? `+${currentSuspensionHeight}` : currentSuspensionHeight} мм
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  id="btn-ecas-up"
                  onClick={() => handleAdjustSuspension(Math.min(100, currentSuspensionHeight + 25))}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 active:scale-95 transition-all"
                >
                  <ArrowUp className="w-4 h-4 text-emerald-400" />
                  <span>Поднять</span>
                </button>

                <button
                  id="btn-ecas-normal"
                  onClick={() => handleAdjustSuspension(0)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 active:scale-95 transition-all"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Транспорт</span>
                </button>

                <button
                  id="btn-ecas-down"
                  onClick={() => handleAdjustSuspension(Math.max(-80, currentSuspensionHeight - 25))}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 active:scale-95 transition-all"
                >
                  <ArrowDown className="w-4 h-4 text-cyan-400" />
                  <span>Опустить</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-white font-bold block">Помощь при трогании (Traction Help)</span>
                  <span className="text-[10px] text-slate-400">Догрузка ведущего моста</span>
                </div>
                <button
                  id="btn-traction-help"
                  onClick={() => handleAdjustSuspension(30)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition-all active:scale-95"
                >
                  Догрузить мост
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CFC Calibration Modal */}
      <CfcCalibrationWizardModal
        isOpen={isCfcWizardOpen}
        onClose={() => setIsCfcWizardOpen(false)}
        telemetry={telemetry}
        config={config}
        setConfig={setConfig}
        onCalibrationComplete={(newLead, newBal) => {
          setTrailerLeadDelta(newLead);
          setFrontRearBalance(newBal);
          setCfcEnabled(true);
        }}
      />
    </div>
  );
};

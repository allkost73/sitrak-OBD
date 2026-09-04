import React, { useState } from "react";
import { 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Thermometer, 
  Activity, 
  Sliders, 
  Settings, 
  Save, 
  Sparkles, 
  Play, 
  Zap, 
  ChevronRight,
  Disc,
  Clock
} from "lucide-react";
import { TelemetryData, TruckConfig } from "../../types";
import { elmService } from "../../services/elmAdapterService";
import confetti from "canvas-confetti";

interface AmtSelfAdaptationSectionProps {
  telemetry: TelemetryData;
  config: TruckConfig;
  setConfig: React.Dispatch<React.SetStateAction<TruckConfig>>;
  isConnected: boolean;
  onOpenWizard: () => void;
}

export const AmtSelfAdaptationSection: React.FC<AmtSelfAdaptationSectionProps> = ({
  telemetry,
  config,
  setConfig,
  isConnected,
  onOpenWizard,
}) => {
  const [isQuickCalibrating, setIsQuickCalibrating] = useState<string | null>(null);
  const [shiftMode, setShiftMode] = useState<"comfort" | "standard" | "fast_economy">(config.amtShiftSpeedMode || "standard");
  const [creepingMode, setCreepingMode] = useState<boolean>(config.amtCreepingModeEnabled ?? true);
  const [loadCompensation, setLoadCompensation] = useState<number>(config.amtLoadCompensationLevel || 75);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Run quick kiss point calibration
  const handleQuickKissPoint = async () => {
    setIsQuickCalibrating("kiss");
    setStatusMsg({ type: "info", text: "Быстрое обучение точки смыкания диска сцепления Sachs ConAct..." });

    try {
      await elmService.sendCommand("31 01 02 45", "Quick Kiss Point Routine");
      await new Promise((r) => setTimeout(r, 1200));

      const newKiss = +(18.5 + (Math.random() * 0.3 - 0.15)).toFixed(2);
      const today = new Date().toLocaleDateString("ru-RU");

      setConfig((prev) => ({
        ...prev,
        clutchKissPointLearned: true,
        clutchLastCalibrationDate: today,
        amtClutchKissPointMm: newKiss,
      }));

      elmService.setSimulatedTelemetry({ clutchKissPointMm: newKiss });

      setStatusMsg({ type: "success", text: `Точка схватывания сцепления успешно откалибрована: ${newKiss} мм!` });
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Ошибка быстрой калибровки точки сцепления." });
    } finally {
      setIsQuickCalibrating(null);
    }
  };

  // Run quick gearshift endstops calibration
  const handleQuickEndstops = async () => {
    setIsQuickCalibrating("endstops");
    setStatusMsg({ type: "info", text: "Обучение концевых упоров вилок и датчиков Холла демультипликатора..." });

    try {
      await elmService.sendCommand("31 01 02 46", "Quick Endstops Routine");
      await new Promise((r) => setTimeout(r, 1400));

      setConfig((prev) => ({
        ...prev,
        amtGearboxEndStopsLearned: true,
      }));

      setStatusMsg({ type: "success", text: "Концевые упоры делителя GV, демультипликатора GP и штоков 1-12 передач откалиброваны!" });
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Ошибка обучения концевиков передач." });
    } finally {
      setIsQuickCalibrating(null);
    }
  };

  // Run quick countershaft brake test
  const handleQuickBrakeTest = async () => {
    setIsQuickCalibrating("brake");
    setStatusMsg({ type: "info", text: "Калибровка времени срабатывания тормоза промежуточного вала..." });

    try {
      await elmService.sendCommand("31 01 02 47", "Quick Countershaft Brake Routine");
      await new Promise((r) => setTimeout(r, 1100));

      setConfig((prev) => ({
        ...prev,
        amtCountershaftBrakeLearned: true,
      }));

      setStatusMsg({ type: "success", text: "Тормоз промежуточного вала адаптирован (Время остановки: 235 мс - норма)!" });
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Ошибка адаптации тормоза промвала." });
    } finally {
      setIsQuickCalibrating(null);
    }
  };

  // Save driving preferences to TCU
  const handleSavePreferences = async () => {
    setIsQuickCalibrating("save");
    try {
      await elmService.sendCommand(`2E 02 50 ${shiftMode === "comfort" ? "01" : shiftMode === "standard" ? "02" : "03"}`, "Запись алгоритма переключения передач");
      await elmService.sendCommand(`2E 02 51 ${creepingMode ? "01" : "00"}`, "Запись режима маневрирования (Creep Mode)");
      await elmService.sendCommand(`2E 02 52 ${loadCompensation.toString(16).padStart(2, "0")}`, "Запись коэффициента компенсации массы груза");

      setConfig((prev) => ({
        ...prev,
        amtShiftSpeedMode: shiftMode,
        amtCreepingModeEnabled: creepingMode,
        amtLoadCompensationLevel: loadCompensation,
      }));

      setStatusMsg({ type: "success", text: "Параметры работы АКПП успешно сохранены в памяти блока ZF TraXon!" });
      confetti({ particleCount: 30, spread: 40 });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Сбой записи настроек АКПП." });
    } finally {
      setIsQuickCalibrating(null);
    }
  };

  const isOptimal = config.amtAdaptationHealthStatus === "optimal" || (config.clutchKissPointLearned && config.amtCountershaftBrakeLearned);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Самоадаптация и калибровка АКПП ZF TraXon / Sinotruk AMT
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded-md">
                12TX2620TD
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Обучение точки схватывания сцепления ConAct, адаптация вилок передач и тормоза промвала
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOptimal ? (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ОБУЧЕНО (ИДЕАЛЬНО)</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>ТРЕБУЕТСЯ КАЛИБРОВКА</span>
            </span>
          )}
        </div>
      </div>

      {/* Status banner */}
      {statusMsg && (
        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
          statusMsg.type === "success"
            ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
            : statusMsg.type === "error"
            ? "bg-red-950/60 border-red-500/40 text-red-200"
            : "bg-purple-950/60 border-purple-500/40 text-purple-200"
        }`}>
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : statusMsg.type === "error" ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Zap className="w-4 h-4 text-purple-400 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Primary Wizard CTA Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/70 via-slate-950/80 to-slate-900 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs sm:text-sm font-bold text-white">
              Пошаговый мастер полной самоадаптации АКПП
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Автоматически проводит полный цикл: сброс памяти, калибровку цилиндра ConAct, концевых упоров вилок 1–12, делителя и замедлителя с контролем безопасности.
          </p>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 pt-0.5">
            <span>Последнее полное обучение: <b className="text-purple-300">{config.amtLastFullAdaptationDate || config.clutchLastCalibrationDate || "2026-07-15"}</b></span>
          </div>
        </div>

        <button
          id="btn-open-amt-wizard"
          onClick={onOpenWizard}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg active:scale-95 shrink-0"
        >
          <Play className="w-4 h-4" />
          <span>Запустить мастер самоадаптации</span>
        </button>
      </div>

      {/* Live Telemetry & Calibration Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Kiss point */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Точка схватывания (Kiss Point)
            </span>
            <Disc className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-purple-300">
              {config.amtClutchKissPointMm || 18.6}
            </span>
            <span className="text-xs text-slate-400">мм</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${((config.amtClutchKissPointMm || 18.6) / 34) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">
            Заводской допуск: 16.5 – 21.0 мм
          </span>
        </div>

        {/* Clutch wear */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Износ диска сцепления
            </span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-cyan-400">
              {telemetry.clutchWear || 18}%
            </span>
            <span className="text-xs text-slate-400">износа</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyan-500 rounded-full"
              style={{ width: `${telemetry.clutchWear || 18}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">
            Остаточный ресурс: ~280 000 км
          </span>
        </div>

        {/* Transmission Oil Temp */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Температура масла АКПП
            </span>
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-amber-400">
              {telemetry.transmissionOilTemp || 68}
            </span>
            <span className="text-xs text-slate-400">°C</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 rounded-full"
              style={{ width: `${Math.min(100, ((telemetry.transmissionOilTemp || 68) / 110) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">
            Рабочий диапазон: 50 – 90°C
          </span>
        </div>

        {/* Countershaft Brake & Gearbox State */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Тормоз промвала & Вилки
            </span>
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold font-mono text-emerald-300">
              240 мс (Обучен)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 pt-0.5">
            <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-emerald-400">GV: LOW</span>
            <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-emerald-400">GP: LOW</span>
            <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-purple-300">N</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">
            Синхронизация без рывков
          </span>
        </div>
      </div>

      {/* Quick Calibration Buttons */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-200">
            Быстрые сервисные калибровки отдельных узлов АКПП:
          </label>
          <span className="text-[11px] text-slate-400">Без полного перезапуска цикла</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            id="btn-quick-kiss-point"
            disabled={isQuickCalibrating !== null}
            onClick={handleQuickKissPoint}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 text-left transition-all active:scale-98 disabled:opacity-50"
          >
            <div>
              <span className="text-xs font-bold text-white block">Обучить сцепление</span>
              <span className="text-[10px] text-slate-400">Kiss point ConAct</span>
            </div>
            <RotateCcw className={`w-4 h-4 text-purple-400 ${isQuickCalibrating === "kiss" ? "animate-spin" : ""}`} />
          </button>

          <button
            id="btn-quick-endstops"
            disabled={isQuickCalibrating !== null}
            onClick={handleQuickEndstops}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 text-left transition-all active:scale-98 disabled:opacity-50"
          >
            <div>
              <span className="text-xs font-bold text-white block">Обучить вилки передач</span>
              <span className="text-[10px] text-slate-400">Упоры 1-12, GV, GP</span>
            </div>
            <RotateCcw className={`w-4 h-4 text-purple-400 ${isQuickCalibrating === "endstops" ? "animate-spin" : ""}`} />
          </button>

          <button
            id="btn-quick-brake-test"
            disabled={isQuickCalibrating !== null}
            onClick={handleQuickBrakeTest}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 text-left transition-all active:scale-98 disabled:opacity-50"
          >
            <div>
              <span className="text-xs font-bold text-white block">Тормоз промвала</span>
              <span className="text-[10px] text-slate-400">Тест замедлителя</span>
            </div>
            <RotateCcw className={`w-4 h-4 text-purple-400 ${isQuickCalibrating === "brake" ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Fine-Tuning & Driving Style Preferences */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-slate-200">
              Пользовательская настройка алгоритмов переключения ZF TraXon
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">EEPROM 0x0250</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Shift speed profile */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 block">
              Режим скорости переключения передач:
            </label>
            <div className="space-y-1.5">
              {[
                { id: "comfort", label: "Комфортный", desc: "Максимально плавное смыкание без толчков" },
                { id: "standard", label: "Стандартный", desc: "Заводской сбалансированный режим Sitrak" },
                { id: "fast_economy", label: "Быстрый / Эко", desc: "Минимальный разрыв мощности на подъемах" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setShiftMode(m.id as any)}
                  className={`w-full p-2.5 rounded-lg text-left border transition-all ${
                    shiftMode === m.id
                      ? "bg-purple-950/60 border-purple-500/50 text-white shadow-sm"
                      : "bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{m.label}</span>
                    {shiftMode === m.id && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Creep mode */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-200 block">
              Режим маневрирования (Creep Mode / Малый ход):
            </label>
            <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Ползущий режим</span>
                <input
                  id="switch-creep-mode"
                  type="checkbox"
                  checked={creepingMode}
                  onChange={(e) => setCreepingMode(e.target.checked)}
                  className="w-5 h-5 accent-purple-500 rounded cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Автоматическое плавное трогание при отпускании педали тормоза на 1–2 передачах без нажатия на газ. Незаменимо при подаче под рампу и сцепке с полуприцепом.
              </p>
            </div>
          </div>

          {/* Load compensation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200">
                Компенсация массы груза при старте:
              </label>
              <span className="text-xs font-mono font-bold text-purple-400">{loadCompensation}%</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2">
              <input
                id="slider-amt-load-comp"
                type="range"
                min="0"
                max="100"
                step="5"
                value={loadCompensation}
                onChange={(e) => setLoadCompensation(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0% (Одиночка)</span>
                <span>50% (20т)</span>
                <span>100% (44т Трал)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Повышает преднатяг крутящего момента двигателя при трогании на крутых подъемах по датчикам угла наклона и нагрузки на седло ССУ.
              </p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-1">
          <button
            id="btn-save-amt-preferences"
            disabled={isQuickCalibrating !== null}
            onClick={handleSavePreferences}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isQuickCalibrating === "save" ? "Запись в TCU..." : "Сохранить алгоритмы в TCU ZF TraXon"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

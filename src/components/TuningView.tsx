import React, { useState } from "react";
import { 
  Sliders, 
  Cpu, 
  Zap, 
  Gauge, 
  Fuel, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Save, 
  Download, 
  Upload, 
  Wrench,
  ShieldCheck,
  Sparkles,
  Layers,
  Settings,
  HardDrive
} from "lucide-react";
import { TruckConfig } from "../types";
import { elmService } from "../services/elmAdapterService";
import confetti from "canvas-confetti";

interface TuningViewProps {
  config: TruckConfig;
  setConfig: React.Dispatch<React.SetStateAction<TruckConfig>>;
  isConnected: boolean;
  onOpenDriveModal: () => void;
}

export const TuningView: React.FC<TuningViewProps> = ({
  config,
  setConfig,
  isConnected,
  onOpenDriveModal,
}) => {
  const [speedLimit, setSpeedLimit] = useState<number>(config.speedLimiterKmH);
  const [idleRpm, setIdleRpm] = useState<number>(config.idleRpm);
  const [cruiseStep, setCruiseStep] = useState<1 | 2>(config.cruiseControlStep);
  const [eGasCurve, setEGasCurve] = useState<"economic" | "standard" | "dynamic" | "heavy_load">(config.eGasCurve);
  const [injectorCodes, setInjectorCodes] = useState<string[]>([...config.injectorCodes]);
  const [seatbeltBuzzer, setSeatbeltBuzzer] = useState<boolean>(config.seatbeltBuzzer);
  const [drl, setDrl] = useState<boolean>(config.daytimeRunningLights);

  // States for long operations
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // DPF Regen state
  const [isDpfRegenActive, setIsDpfRegenActive] = useState(false);
  const [dpfTemp, setDpfTemp] = useState(180);
  const [dpfProgress, setDpfProgress] = useState(0);

  // Clutch adaptation reset state
  const [isClutchCalibrating, setIsClutchCalibrating] = useState(false);

  // Write Speed Limiter & Idle RPM to EDC17
  const handleApplyEngineParameters = async () => {
    setIsFlashing(true);
    setFlashProgress(15);
    setStatusMessage({ type: "info", text: "Установка сессии калибровки Bosch EDC17 (Security Access)..." });

    try {
      await elmService.sendCommand("27 01", "Запрос ключа доступа UDS Security Seed");
      setFlashProgress(45);
      await new Promise((r) => setTimeout(r, 400));

      await elmService.sendCommand(`2E 01 20 ${speedLimit.toString(16).padStart(2, "0")}`, `Запись ограничения скорости: ${speedLimit} км/ч`);
      setFlashProgress(70);
      await new Promise((r) => setTimeout(r, 400));

      await elmService.sendCommand(`2E 01 24 ${(idleRpm).toString(16).padStart(4, "0")}`, `Запись оборотов холостого хода: ${idleRpm} RPM`);
      setFlashProgress(100);

      // Update local and simulated state
      setConfig((prev) => ({
        ...prev,
        speedLimiterKmH: speedLimit,
        idleRpm: idleRpm,
        cruiseControlStep: cruiseStep,
        eGasCurve: eGasCurve,
      }));

      elmService.setSimulatedTelemetry({ engineRpm: idleRpm });

      setStatusMessage({ type: "success", text: "Параметры успешно прошиты в память ЭБУ EDC17CV44!" });
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Ошибка записи в ЭБУ" });
    } finally {
      setIsFlashing(false);
    }
  };

  // Write Injector IQA Codes
  const handleWriteInjectors = async () => {
    setIsFlashing(true);
    setStatusMessage({ type: "info", text: "Программирование IQA/IMA кодов форсунок Bosch CRIN3 (Цилиндры 1-6)..." });

    try {
      for (let i = 0; i < 6; i++) {
        await elmService.sendCommand(`2E 11 0${i + 1} ${injectorCodes[i]}`, `Кодирование форсунки №${i + 1}`);
        await new Promise((r) => setTimeout(r, 200));
      }

      setConfig((prev) => ({ ...prev, injectorCodes: [...injectorCodes] }));
      setStatusMessage({ type: "success", text: "Все 6 кодов форсунок успешно запрограммированы и сохранены в EEPROM!" });
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Ошибка прописки форсунок." });
    } finally {
      setIsFlashing(false);
    }
  };

  // Run ZF TraXon Clutch Adaptation Calibration
  const handleClutchKissPointReset = async () => {
    setIsClutchCalibrating(true);
    setStatusMessage({ type: "info", text: "Обучение точки схватывания сцепления ZF TraXon (Clutch Kiss Point)..." });

    try {
      await elmService.sendCommand("31 01 02 45", "Запуск процедуры калибровки сцепления TraXon");
      await new Promise((r) => setTimeout(r, 1200));
      await elmService.sendCommand("31 03 02 45", "Чтение статуса калибровки");

      const today = new Date().toISOString().split("T")[0];
      setConfig((prev) => ({
        ...prev,
        clutchKissPointLearned: true,
        clutchLastCalibrationDate: today,
      }));

      setStatusMessage({ type: "success", text: `Калибровка сцепления ZF TraXon успешно завершена! (${today})` });
      confetti({ particleCount: 45, spread: 60 });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Ошибка калибровки сцепления." });
    } finally {
      setIsClutchCalibrating(false);
    }
  };

  // Run Forced Service DPF Regeneration
  const handleStartDpfRegen = async () => {
    setIsDpfRegenActive(true);
    setDpfProgress(10);
    setDpfTemp(220);
    setStatusMessage({ type: "info", text: "Запуск сервисной регенерации сажевого фильтра DPF (Подъем оборотов до 1100 RPM)..." });

    try {
      await elmService.sendCommand("31 01 D0 01", "Команда принудительного прожига DPF");
      elmService.setSimulatedTelemetry({ engineRpm: 1100, boostPressure: 0.6 });

      // Step 1: Heat up
      await new Promise((r) => setTimeout(r, 1000));
      setDpfProgress(40);
      setDpfTemp(480);

      // Step 2: High temp burn
      await new Promise((r) => setTimeout(r, 1200));
      setDpfProgress(75);
      setDpfTemp(620);
      elmService.setSimulatedTelemetry({ dpfDifferentialPressure: 6 });

      // Step 3: Cool down
      await new Promise((r) => setTimeout(r, 1000));
      setDpfProgress(100);
      setDpfTemp(340);
      elmService.setSimulatedTelemetry({ engineRpm: config.idleRpm, boostPressure: 0.1 });

      setStatusMessage({ type: "success", text: "Прожиг сажевого фильтра завершен! Перепад давления снизился до 6 mbar (Норма)." });
      confetti({ particleCount: 60, spread: 70 });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Сбой регенерации DPF." });
    } finally {
      setIsDpfRegenActive(false);
    }
  };

  // Write CBCU Settings
  const handleSaveCbcu = async () => {
    setIsFlashing(true);
    try {
      await elmService.sendCommand(`2E 05 01 ${seatbeltBuzzer ? "01" : "00"}`, "Запись состояния зуммера ремня CBCU");
      await elmService.sendCommand(`2E 05 02 ${drl ? "01" : "00"}`, "Запись режима ДХО CBCU");
      
      setConfig((prev) => ({
        ...prev,
        seatbeltBuzzer,
        daytimeRunningLights: drl,
      }));

      setStatusMessage({ type: "success", text: "Настройки кузовного контроллера CBCU-V3 успешно обновлены!" });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Ошибка записи параметров CBCU" });
    } finally {
      setIsFlashing(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Настройки, калибровка и конфигурирование ЭБУ Sitrak
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Безопасная правка заводских параметров Bosch EDC17CV44, ZF TraXon и кузовного блока CBCU
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-tuning-drive-backup"
            onClick={onOpenDriveModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md active:scale-95"
          >
            <HardDrive className="w-4 h-4" />
            <span>Бэкап в Drive</span>
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
          statusMessage.type === "success"
            ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
            : statusMessage.type === "error"
            ? "bg-red-950/60 border-red-500/40 text-red-200"
            : "bg-blue-950/60 border-blue-500/40 text-blue-200"
        }`}>
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : statusMessage.type === "error" ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          ) : (
            <Zap className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Section 1: Engine & Speed Limiter Tuning (EDC17) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Двигатель: Скоростной лимит и Холостой ход
              </h3>
              <p className="text-xs text-slate-400">ЭБУ Bosch EDC17CV44 (Sinotruk MC13.48-50)</p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg">
            EEPROM 0x0120
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Speed Limiter */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200">
                Ограничитель скорости тягача:
              </label>
              <span className="text-base font-black font-mono text-amber-400">
                {speedLimit >= 125 ? "БЕЗ ОГРАНИЧЕНИЯ" : `${speedLimit} км/ч`}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {[85, 90, 100, 110, 125].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSpeedLimit(val)}
                  className={`py-2 text-xs font-mono font-bold rounded-lg transition-all ${
                    speedLimit === val
                      ? "bg-amber-500 text-slate-950 shadow-md scale-102"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {val === 125 ? "125+" : `${val}`}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Стандарт для автопоездов РФ/ЕС: 90 км/ч. Для негабаритных грузов: 85 км/ч.
            </p>
          </div>

          {/* Idle RPM */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200">
                Обороты холостого хода:
              </label>
              <span className="text-base font-black font-mono text-emerald-400">
                {idleRpm} об/мин
              </span>
            </div>

            <input
              id="slider-idle-rpm"
              type="range"
              min="550"
              max="750"
              step="25"
              value={idleRpm}
              onChange={(e) => setIdleRpm(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>550 (Экономия)</span>
              <span>600 (Завод)</span>
              <span>650</span>
              <span>750 (Зима/КОМ)</span>
            </div>
          </div>
        </div>

        {/* E-Gas Accelerator Response Curve */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-slate-200">
              Характеристика отклика электронной педали газа (E-Gas):
            </label>
            <select
              id="select-egas-curve"
              value={eGasCurve}
              onChange={(e) => setEGasCurve(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="standard">Стандартная заводская (Сбалансированная)</option>
              <option value="economic">Экономичная (Плавное нарастание момента -2.5 л/100км)</option>
              <option value="dynamic">Динамичная (Быстрый отклик на малых углах педали)</option>
              <option value="heavy_load">Тяжелый автопоезд (Максимальный момент с 1000 RPM)</option>
            </select>
          </div>

          {/* Cruise Control Step */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-slate-200">
              Шаг кнопок круиз-контроля на руле (+ / -):
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCruiseStep(1)}
                className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg transition-all ${
                  cruiseStep === 1
                    ? "bg-blue-600 text-white shadow"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                1 км/ч (Плавный шаг)
              </button>
              <button
                type="button"
                onClick={() => setCruiseStep(2)}
                className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg transition-all ${
                  cruiseStep === 2
                    ? "bg-blue-600 text-white shadow"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                2 км/ч (Быстрый шаг)
              </button>
            </div>
          </div>
        </div>

        {/* Save button for Engine params */}
        <div className="flex justify-end pt-1">
          <button
            id="btn-apply-engine-params"
            disabled={isFlashing}
            onClick={handleApplyEngineParameters}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isFlashing ? "Запись в ЭБУ..." : "Записать параметры в EDC17"}</span>
          </button>
        </div>
      </div>

      {/* Section 2: Injector IQA/IMA Coding (Bosch Common Rail) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Прописка кодов форсунок (IQA / IMA Coding)
              </h3>
              <p className="text-xs text-slate-400">Форсунки Bosch CRIN3-18 (6 цилиндров MC13)</p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded-lg">
            7-значные коды
          </span>
        </div>

        <p className="text-xs text-slate-300">
          При замене форсунки необходимо внести 7-значный буквенно-цифровой калибровочный код с корпуса новой форсунки для точной поцилиндровой балансировки подачи.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {injectorCodes.map((code, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400">
                Цилиндр №{idx + 1}:
              </label>
              <input
                type="text"
                maxLength={7}
                value={code}
                onChange={(e) => {
                  const updated = [...injectorCodes];
                  updated[idx] = e.target.value.toUpperCase();
                  setInjectorCodes(updated);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-center text-amber-300 uppercase tracking-widest focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-1">
          <button
            id="btn-apply-injectors"
            disabled={isFlashing}
            onClick={handleWriteInjectors}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            <Cpu className="w-4 h-4" />
            <span>Запрограммировать коды форсунок</span>
          </button>
        </div>
      </div>

      {/* Section 3: ZF TraXon Transmission & DPF Maintenance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ZF TraXon Clutch Adaptation */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <RotateCcw className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white">
                Сцепление АКПП ZF TraXon
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Сброс накопленных адаптаций и принудительное обучение точки схватывания (Kiss Point) диска сцепления Sachs / ZF. Устраняет рывки и пинки при трогании и переключениях 1–4 передач.
            </p>
            <div className="text-[11px] font-mono text-slate-400 mt-2">
              Последнее обучение: <b className="text-slate-200">{config.clutchLastCalibrationDate}</b>
            </div>
          </div>

          <button
            id="btn-clutch-calibrate"
            disabled={isClutchCalibrating}
            onClick={handleClutchKissPointReset}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${isClutchCalibrating ? "animate-spin" : ""}`} />
            <span>{isClutchCalibrating ? "Обучение сцепления..." : "Калибровать сцепление TraXon"}</span>
          </button>
        </div>

        {/* Forced DPF Service Regeneration */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-red-400" />
              <h3 className="text-sm font-bold text-white">
                Сервисный прожиг сажевого фильтра (DPF)
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Принудительный стационарный прожиг сажевого фильтра на месте. Двигатель поднимает обороты до 1100 об/мин и разогревает выхлоп до 600°C для выжигания сажи.
            </p>
            {isDpfRegenActive && (
              <div className="mt-2 space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Температура DPF:</span>
                  <span className="text-red-400 font-bold">{dpfTemp}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Прогресс:</span>
                  <span className="text-amber-400 font-bold">{dpfProgress}%</span>
                </div>
              </div>
            )}
          </div>

          <button
            id="btn-dpf-regen-start"
            disabled={isDpfRegenActive}
            onClick={handleStartDpfRegen}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Flame className={`w-4 h-4 ${isDpfRegenActive ? "animate-pulse" : ""}`} />
            <span>{isDpfRegenActive ? "Идет прожиг фильтра..." : "Запустить сервисный прожиг DPF"}</span>
          </button>
        </div>
      </div>

      {/* Section 4: CBCU Cabin Electronics Settings */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Settings className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Комфорт кабины: Блок кузовной электроники CBCU-V3
            </h3>
            <p className="text-xs text-slate-400">Настройки зуммера, ДХО и освещения тягача Sitrak</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Дневные ходовые огни (ДХО)</span>
              <span className="text-[11px] text-slate-400">Автоматическое включение при отпускании ручника</span>
            </div>
            <input
              id="switch-drl"
              type="checkbox"
              checked={drl}
              onChange={(e) => setDrl(e.target.checked)}
              className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Зуммер непристегнутого ремня</span>
              <span className="text-[11px] text-slate-400">Звуковой сигнал при движении &gt;15 км/ч</span>
            </div>
            <input
              id="switch-seatbelt"
              type="checkbox"
              checked={seatbeltBuzzer}
              onChange={(e) => setSeatbeltBuzzer(e.target.checked)}
              className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            id="btn-save-cbcu"
            disabled={isFlashing}
            onClick={handleSaveCbcu}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
          >
            <Save className="w-4 h-4 text-cyan-400" />
            <span>Сохранить настройки CBCU</span>
          </button>
        </div>
      </div>
    </div>
  );
};

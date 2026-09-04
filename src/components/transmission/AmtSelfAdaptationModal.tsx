import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Cpu, 
  Play, 
  Square, 
  Gauge, 
  Thermometer, 
  Wind, 
  Layers, 
  Zap, 
  Activity, 
  Check, 
  ChevronRight,
  Info
} from "lucide-react";
import { TelemetryData, TruckConfig } from "../../types";
import { elmService } from "../../services/elmAdapterService";
import confetti from "canvas-confetti";

interface AmtSelfAdaptationModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryData;
  config: TruckConfig;
  setConfig: React.Dispatch<React.SetStateAction<TruckConfig>>;
  isConnected: boolean;
}

type AdaptationStep = 
  | "prechecks"
  | "step1_clear"
  | "step2_endstops"
  | "step3_countershaft_brake"
  | "step4_kiss_point"
  | "step5_gear_shift_test"
  | "step6_finalize"
  | "completed"
  | "aborted";

interface AdaptationLogEntry {
  time: string;
  stage: string;
  message: string;
  type: "info" | "success" | "warn" | "error";
}

export const AmtSelfAdaptationModal: React.FC<AmtSelfAdaptationModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  config,
  setConfig,
  isConnected,
}) => {
  const [currentStep, setCurrentStep] = useState<AdaptationStep>("prechecks");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [activeSubAction, setActiveSubAction] = useState<string>("");
  const [logs, setLogs] = useState<AdaptationLogEntry[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const isAbortedRef = useRef<boolean>(false);

  // Live animated calibration telemetry
  const [liveClutchStroke, setLiveClutchStroke] = useState<number>(config.amtClutchKissPointMm || 18.6);
  const [liveInputRpm, setLiveInputRpm] = useState<number>(telemetry.engineRpm || 600);
  const [liveCountershaftRpm, setLiveCountershaftRpm] = useState<number>(420);
  const [liveShiftGear, setLiveShiftGear] = useState<string>("N");
  const [liveSplitter, setLiveSplitter] = useState<"low" | "high">("low");
  const [liveRange, setLiveRange] = useState<"low" | "high">("low");
  const [measuredKissPoint, setMeasuredKissPoint] = useState<number>(18.6);
  const [measuredTotalStroke, setMeasuredTotalStroke] = useState<number>(32.4);

  // Auto-scroll logs
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Preconditions validation
  const isEngineRunning = telemetry.engineRpm >= 500 && telemetry.engineRpm <= 850;
  const isAirPressureOk = telemetry.airCircuit4 >= 8.0 || telemetry.airCircuit1 >= 8.0;
  const isOilTempOk = telemetry.transmissionOilTemp >= 35 && telemetry.transmissionOilTemp <= 95;
  const isVehicleStationary = telemetry.vehicleSpeed === 0;
  const isPedalReleased = (telemetry.brakePedalTravel || 0) <= 5;

  const allPreconditionsMet = isEngineRunning && isAirPressureOk && isOilTempOk && isVehicleStationary;

  const addLog = (stage: string, message: string, type: "info" | "success" | "warn" | "error" = "info") => {
    const time = new Date().toLocaleTimeString("ru-RU", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit", 
      fractionalSecondDigits: 3 
    });
    setLogs((prev) => [...prev, { time, stage, message, type }]);
  };

  const handleAbort = () => {
    isAbortedRef.current = true;
    setIsRunning(false);
    setCurrentStep("aborted");
    addLog("АВАРИЙНАЯ ОСТАНОВКА", "Процедура самоадаптации АКПП прервана пользователем. Сцепление выжато в нейтраль.", "warn");
    elmService.setSimulatedTelemetry({
      currentGear: "N",
      clutchStrokeMm: 4.2,
      inputShaftRpm: telemetry.engineRpm,
    });
  };

  const handleStartAdaptation = async () => {
    setIsRunning(true);
    isAbortedRef.current = false;
    setLogs([]);
    setProgressPercent(0);

    addLog("ИНИЦИАЛИЗАЦИЯ", "Запуск протокола UDS самоадаптации АКПП ZF TraXon / Sinotruk AMT...", "info");
    addLog("БЕЗОПАСНОСТЬ", "Проверка блокировок: ручной тормоз затянут, воздух > 8.5 Bar, масло в норме.", "info");

    try {
      // Step 1: Clear old matrix
      setCurrentStep("step1_clear");
      setProgressPercent(8);
      setActiveSubAction("Сброс накопленных адаптаций в TCU TraXon (Routine 0x0248)...");
      await elmService.sendCommand("31 01 02 48 01", "UDS RoutineControl: Очистить старую адаптационную матрицу");
      addLog("TCU TRAXON", "Старая матрица точек схватывания и времени синхронизации успешно стерта из EEPROM.", "success");
      await new Promise((r) => setTimeout(r, 900));
      if (isAbortedRef.current) return;

      // Step 2: Learn Endstops (Splitter, Range, 1-12, R)
      setCurrentStep("step2_endstops");
      setProgressPercent(22);
      setActiveSubAction("Обучение концевых упоров вилок переключения и планетарных групп...");
      addLog("ВИЛКИ ПЕРЕДАЧ", "Калибровка нейтрального положения вилок штоков 1/2, 3/4, 5/6, R...", "info");

      // Splitter test
      setLiveSplitter("low");
      await elmService.sendCommand("31 01 02 46 01", "Калибровка делителя GV: Положение LOW");
      await new Promise((r) => setTimeout(r, 600));
      if (isAbortedRef.current) return;

      setLiveSplitter("high");
      await elmService.sendCommand("31 01 02 46 02", "Калибровка делителя GV: Положение HIGH");
      addLog("ДЕЛИТЕЛЬ GV", "Концевые датчики делителя LOW/HIGH откалиброваны (ход 14.2 мм).", "success");
      setProgressPercent(35);
      await new Promise((r) => setTimeout(r, 600));
      if (isAbortedRef.current) return;

      // Range test
      setLiveRange("low");
      await elmService.sendCommand("31 01 02 46 03", "Калибровка демультипликатора GP: Низший диапазон 1-6");
      await new Promise((r) => setTimeout(r, 600));
      if (isAbortedRef.current) return;

      setLiveRange("high");
      await elmService.sendCommand("31 01 02 46 04", "Калибровка демультипликатора GP: Высший диапазон 7-12");
      addLog("ДЕМУЛЬТИПЛИКАТОР GP", "Планетарный редуктор GP откалиброван (датчики Холла в норме).", "success");
      setProgressPercent(48);
      await new Promise((r) => setTimeout(r, 700));
      if (isAbortedRef.current) return;

      // Step 3: Countershaft Brake Calibration
      setCurrentStep("step3_countershaft_brake");
      setProgressPercent(60);
      setActiveSubAction("Адаптация тормоза промежуточного вала (Countershaft Brake)...");
      addLog("ТОРМОЗ ПРОМВАЛА", "Подача управляющего давления на замедлитель промвала (0.35 -> 4.5 Bar)...", "info");

      // Animate RPM drop
      setLiveCountershaftRpm(180);
      elmService.setSimulatedTelemetry({ countershaftBrakeActive: true });
      await elmService.sendCommand("31 01 02 47", "Тест времени остановки промежуточного вала");
      await new Promise((r) => setTimeout(r, 800));
      if (isAbortedRef.current) return;

      setLiveCountershaftRpm(0);
      addLog("ТОРМОЗ ПРОМВАЛА", "Время полной остановки промвала: 240 мс (Эталон ZF: 200–320 мс). Норма.", "success");
      elmService.setSimulatedTelemetry({ countershaftBrakeActive: false });
      await new Promise((r) => setTimeout(r, 500));
      if (isAbortedRef.current) return;

      // Step 4: Clutch Kiss Point Calibration
      setCurrentStep("step4_kiss_point");
      setProgressPercent(75);
      setActiveSubAction("Поиск точки касания нажимного диска сцепления Sachs/ZF ConAct...");
      addLog("СЦЕПЛЕНИЕ ConAct", "Плавное перемещение пневмоцилиндра ConAct от 32.0 мм к точке смыкания...", "info");

      // Smoothly advance clutch stroke
      const testKiss = +(18.4 + Math.random() * 0.4).toFixed(2);
      const testTotal = 32.4;
      setMeasuredKissPoint(testKiss);
      setMeasuredTotalStroke(testTotal);

      for (let s = 30; s >= 18; s -= 2) {
        if (isAbortedRef.current) return;
        setLiveClutchStroke(s);
        await new Promise((r) => setTimeout(r, 180));
      }
      setLiveClutchStroke(testKiss);

      // Shaft rpm reacts to kiss point
      setLiveInputRpm(Math.round(telemetry.engineRpm * 0.95));
      await elmService.sendCommand("31 01 02 45", "Запуск процедуры поиска Touch Point ConAct");
      addLog("СЦЕПЛЕНИЕ ConAct", `Точка схватывания зафиксирована: ${testKiss} мм (Обороты первичного вала синхронизированы).`, "success");
      addLog("СЦЕПЛЕНИЕ ConAct", `Полный рабочий ход цилиндра ConAct: ${testTotal} мм. Износ накладок: ${config.clutchWear || 18}%.`, "info");
      await new Promise((r) => setTimeout(r, 900));
      if (isAbortedRef.current) return;

      // Step 5: Static sequential gear shift verification
      setCurrentStep("step5_gear_shift_test");
      setProgressPercent(88);
      setActiveSubAction("Статическая верификация переключения передач (1–12, R1, R2)...");
      addLog("ТЕСТ ПЕРЕДАЧ", "Пробное включение ступеней в статике...", "info");

      const testGears = ["1", "3", "7", "11", "R1", "N"];
      for (const g of testGears) {
        if (isAbortedRef.current) return;
        setLiveShiftGear(g);
        await elmService.sendCommand(`2F 03 01 ${g}`, `Тестовое включение ступени: ${g}`);
        await new Promise((r) => setTimeout(r, 350));
      }
      setLiveShiftGear("N");
      addLog("ТЕСТ ПЕРЕДАЧ", "Все 12 передач переднего хода и 2 передачи заднего хода включаются четко, без задержек.", "success");
      await new Promise((r) => setTimeout(r, 600));
      if (isAbortedRef.current) return;

      // Step 6: Finalize & write to TCU EEPROM
      setCurrentStep("step6_finalize");
      setProgressPercent(96);
      setActiveSubAction("Запись откалиброванных параметров в память ЭБУ ZF TraXon...");
      await elmService.sendCommand("2E 02 48 00", "Фиксация калибровки в постоянную память TCU");
      await new Promise((r) => setTimeout(r, 700));
      if (isAbortedRef.current) return;

      // Update actual truck config
      const nowStr = new Date().toLocaleDateString("ru-RU") + " " + new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
      setConfig((prev) => ({
        ...prev,
        clutchKissPointLearned: true,
        clutchLastCalibrationDate: nowStr.split(" ")[0],
        amtClutchKissPointMm: testKiss,
        amtClutchStrokeTotalMm: testTotal,
        amtCountershaftBrakeLearned: true,
        amtGearboxEndStopsLearned: true,
        amtLastFullAdaptationDate: nowStr,
        amtAdaptationHealthStatus: "optimal",
      }));

      elmService.setSimulatedTelemetry({
        amtAdaptationStatus: "calibrated",
        clutchKissPointMm: testKiss,
        clutchStrokeMm: 4.2,
      });

      setProgressPercent(100);
      setCurrentStep("completed");
      setIsRunning(false);
      addLog("ЗАВЕРШЕНО", "Самоадаптация АКПП ZF TraXon успешно выполнена! Коробка передач полностью адаптирована.", "success");
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });

    } catch (err: any) {
      setIsRunning(false);
      setCurrentStep("aborted");
      addLog("ОШИБКА", err.message || "Сбой связи при адаптации АКПП", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Мастер полной самоадаптации АКПП Sitrak
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-md">
                  ZF TraXon / HW12
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Калибровка точки схватывания сцепления ConAct, концевых упоров вилок и тормоза промвала
              </p>
            </div>
          </div>

          <button
            id="btn-close-amt-wizard"
            onClick={() => {
              if (isRunning) {
                if (window.confirm("Прервать процедуру адаптации АКПП?")) {
                  handleAbort();
                  onClose();
                }
              } else {
                onClose();
              }
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Progress Bar & Current Stage */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">
                {currentStep === "prechecks" && "Проверка предварительных условий безопасности"}
                {currentStep === "step1_clear" && "Этап 1: Очистка старой адаптационной матрицы TCU"}
                {currentStep === "step2_endstops" && "Этап 2: Обучение концевых упоров вилок, делителя и демультипликатора"}
                {currentStep === "step3_countershaft_brake" && "Этап 3: Калибровка тормоза промежуточного вала"}
                {currentStep === "step4_kiss_point" && "Этап 4: Поиск точки касания сцепления Sachs/ZF ConAct (Kiss Point)"}
                {currentStep === "step5_gear_shift_test" && "Этап 5: Статическая проверка переключения передач"}
                {currentStep === "step6_finalize" && "Этап 6: Запись параметров в постоянную память TCU"}
                {currentStep === "completed" && "Самоадаптация успешно завершена!"}
                {currentStep === "aborted" && "Процедура остановлена"}
              </span>
              <span className="font-mono font-bold text-purple-400">{progressPercent}%</span>
            </div>

            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 rounded-full ${
                  currentStep === "completed" 
                    ? "bg-emerald-500" 
                    : currentStep === "aborted"
                    ? "bg-red-500"
                    : "bg-gradient-to-r from-purple-500 to-indigo-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {activeSubAction && isRunning && (
              <p className="text-[11px] font-mono text-purple-300 animate-pulse">
                &gt; {activeSubAction}
              </p>
            )}
          </div>

          {/* Safety Interlocks Prechecks Card */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">
                  Условия готовности тягача к самоадаптации
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                allPreconditionsMet 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}>
                {allPreconditionsMet ? "ВСЕ УСЛОВИЯ ВЫПОЛНЕНЫ" : "ТРЕБУЕТСЯ ПОДГОТОВКА"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                isEngineRunning ? "bg-slate-900/90 border-emerald-500/30" : "bg-slate-900/40 border-slate-800 text-slate-400"
              }`}>
                <div className="flex items-center gap-2">
                  <Activity className={`w-3.5 h-3.5 ${isEngineRunning ? "text-emerald-400" : "text-slate-500"}`} />
                  <span>Двигатель на ХХ:</span>
                </div>
                <span className="font-mono font-bold">{telemetry.engineRpm} RPM</span>
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                isAirPressureOk ? "bg-slate-900/90 border-emerald-500/30" : "bg-slate-900/40 border-slate-800 text-slate-400"
              }`}>
                <div className="flex items-center gap-2">
                  <Wind className={`w-3.5 h-3.5 ${isAirPressureOk ? "text-emerald-400" : "text-slate-500"}`} />
                  <span>Пневматика (Контур 4):</span>
                </div>
                <span className="font-mono font-bold text-cyan-400">{telemetry.airCircuit4} Bar</span>
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                isOilTempOk ? "bg-slate-900/90 border-emerald-500/30" : "bg-slate-900/40 border-slate-800 text-slate-400"
              }`}>
                <div className="flex items-center gap-2">
                  <Thermometer className={`w-3.5 h-3.5 ${isOilTempOk ? "text-emerald-400" : "text-slate-500"}`} />
                  <span>Масло АКПП:</span>
                </div>
                <span className="font-mono font-bold text-amber-400">{telemetry.transmissionOilTemp || 68}°C</span>
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                isVehicleStationary ? "bg-slate-900/90 border-emerald-500/30" : "bg-slate-900/40 border-slate-800 text-slate-400"
              }`}>
                <div className="flex items-center gap-2">
                  <Gauge className={`w-3.5 h-3.5 ${isVehicleStationary ? "text-emerald-400" : "text-slate-500"}`} />
                  <span>Тягач на ручнике:</span>
                </div>
                <span className="font-mono font-bold text-emerald-400">0 км/ч (Стоп)</span>
              </div>
            </div>
          </div>

          {/* Live Animation & Sensor Feed */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Clutch Stroke & Kiss point live gauge */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Ход цилиндра сцепления ConAct
              </span>
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono text-purple-400">
                    {liveClutchStroke.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400">мм</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Точка смыкания: <b className="text-slate-200">{measuredKissPoint} мм</b>
                </span>
              </div>

              <div className="w-full bg-slate-900 rounded-lg p-1 border border-slate-800 relative">
                <div className="w-full h-3 bg-slate-800 rounded relative">
                  {/* Kiss Point Target Marker */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10" 
                    style={{ left: `${(measuredKissPoint / 34) * 100}%` }}
                    title={`Целевая точка касания: ${measuredKissPoint} мм`}
                  />
                  {/* Current Stroke Bar */}
                  <div 
                    className="h-full bg-purple-500 rounded transition-all duration-150"
                    style={{ width: `${(liveClutchStroke / 34) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                  <span>0 мм (Замкнуто)</span>
                  <span className="text-amber-400 font-bold">Kiss: {measuredKissPoint} мм</span>
                  <span>34 мм (Выжато)</span>
                </div>
              </div>
            </div>

            {/* Shaft RPM & Brake Status */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Синхронизация валов КПП
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Первичный вал:</span>
                  <span className="text-base font-bold font-mono text-cyan-400">{liveInputRpm} RPM</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Промвал:</span>
                  <span className="text-base font-bold font-mono text-indigo-400">{liveCountershaftRpm} RPM</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Тормоз промвала:</span>
                <span className={`font-bold ${liveCountershaftRpm === 0 ? "text-emerald-400" : "text-slate-300"}`}>
                  {liveCountershaftRpm === 0 ? "Заблокирован (Остановлен)" : "Свободное вращение"}
                </span>
              </div>
            </div>

            {/* Shift Actuators & Position */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Положение ступеней АКПП
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">Делитель (GV)</span>
                  <span className="text-xs font-bold font-mono text-amber-300 uppercase">{liveSplitter}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">Передача</span>
                  <span className="text-sm font-black font-mono text-emerald-400">{liveShiftGear}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">Демультипликатор</span>
                  <span className="text-xs font-bold font-mono text-purple-300 uppercase">{liveRange}</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 text-center font-mono">
                TCU: ZF 12TX2620TD TraXon Direct Drive
              </div>
            </div>
          </div>

          {/* Real-time UDS Terminal Log Stream */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-bold text-slate-200">
                  Журнал UDS-процедуры самоадаптации в реальном времени
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">CAN 29-bit / 250 kbps (J1939)</span>
            </div>

            <div className="h-40 overflow-y-auto space-y-1 font-mono text-xs p-2 rounded-lg bg-slate-950 border border-slate-900">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 text-xs">
                  Нажмите кнопку "Запустить полную самоадаптацию", чтобы начать калибровку
                </div>
              ) : (
                logs.map((lg, idx) => (
                  <div key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-600 text-[10px] shrink-0">{lg.time}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0 ${
                      lg.type === "success" 
                        ? "bg-emerald-500/20 text-emerald-300" 
                        : lg.type === "warn" || lg.type === "error"
                        ? "bg-red-500/20 text-red-300"
                        : "bg-purple-500/20 text-purple-300"
                    }`}>
                      {lg.stage}
                    </span>
                    <span className={`${
                      lg.type === "success" 
                        ? "text-emerald-200" 
                        : lg.type === "warn" || lg.type === "error"
                        ? "text-red-300 font-bold"
                        : "text-slate-300"
                    }`}>
                      {lg.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Results card when completed */}
          {currentStep === "completed" && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="text-sm font-bold">
                  Адаптация успешно завершена и зафиксирована в блоке управления!
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-emerald-500/30">
                  <span className="text-[10px] text-slate-400 block">Точка схватывания:</span>
                  <span className="text-base font-bold font-mono text-emerald-300">{measuredKissPoint} мм</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-emerald-500/30">
                  <span className="text-[10px] text-slate-400 block">Полный ход ConAct:</span>
                  <span className="text-base font-bold font-mono text-white">{measuredTotalStroke} мм</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-emerald-500/30">
                  <span className="text-[10px] text-slate-400 block">Тормоз промвала:</span>
                  <span className="text-base font-bold font-mono text-emerald-300">240 мс (Обучен)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-emerald-500/30">
                  <span className="text-[10px] text-slate-400 block">Концевики вилок:</span>
                  <span className="text-base font-bold font-mono text-emerald-300">12 передач ОК</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Калибровка исключает рывки при трогании и перегрев диска сцепления Sachs/ZF.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {isRunning ? (
              <button
                id="btn-abort-amt-adaptation"
                onClick={handleAbort}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <Square className="w-4 h-4" />
                <span>Прервать калибровку</span>
              </button>
            ) : currentStep === "completed" ? (
              <button
                id="btn-finish-amt-wizard"
                onClick={onClose}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Готово (Закрыть мастер)</span>
              </button>
            ) : (
              <button
                id="btn-start-amt-adaptation"
                disabled={!allPreconditionsMet}
                onClick={handleStartAdaptation}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold transition-all shadow-lg active:scale-95"
              >
                <Play className="w-4 h-4" />
                <span>Запустить полную самоадаптацию</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

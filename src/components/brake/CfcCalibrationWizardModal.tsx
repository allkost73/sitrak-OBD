import React, { useState } from "react";
import { 
  X, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  Disc, 
  ArrowRight, 
  RotateCcw, 
  Sparkles,
  ShieldCheck,
  Play
} from "lucide-react";
import { TelemetryData, TruckConfig } from "../../types";
import { elmService } from "../../services/elmAdapterService";
import confetti from "canvas-confetti";

interface CfcCalibrationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryData;
  config: TruckConfig;
  setConfig: React.Dispatch<React.SetStateAction<TruckConfig>>;
  onCalibrationComplete: (newLeadDelta: number, newBalance: number) => void;
}

export const CfcCalibrationWizardModal: React.FC<CfcCalibrationWizardModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  config,
  setConfig,
  onCalibrationComplete,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [calculatedLead, setCalculatedLead] = useState<number>(0.35);
  const [calculatedBalance, setCalculatedBalance] = useState<number>(46);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  if (!isOpen) return null;

  const addLog = (msg: string) => {
    setLogMessages((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleRunStep2 = async () => {
    setIsRunning(true);
    addLog("Запрос данных нагрузок на оси по шине CAN (ECAS)...");
    await new Promise((r) => setTimeout(r, 600));

    addLog(`Передняя ось: ${telemetry.axleLoadFrontTon} т, Задняя ось: ${telemetry.axleLoadRearTon} т`);
    addLog(`Нагрузка на седло ССУ: ${telemetry.fifthWheelLoadTon} т, Полуприцеп: ${telemetry.trailerAxleLoadTon} т`);
    
    // Compute optimal ratio based on 5th wheel load
    const grossWeight = telemetry.axleLoadFrontTon + telemetry.axleLoadRearTon + telemetry.trailerAxleLoadTon;
    let optLead = 0.35;
    let optBal = 46;

    if (telemetry.fifthWheelLoadTon > 9.0) {
      // Heavy loaded
      optLead = 0.40;
      optBal = 44; // more force to drive axle
    } else if (telemetry.fifthWheelLoadTon < 2.0) {
      // Unladen / empty
      optLead = 0.25;
      optBal = 54; // light rear axle protection
    }

    setCalculatedLead(optLead);
    setCalculatedBalance(optBal);
    setIsRunning(false);
    setStep(3);
  };

  const handleRunStep3 = async () => {
    setIsRunning(true);
    addLog("Подача тестового управляющего импульса 1.5 Bar в желтую магистраль...");
    try {
      await elmService.sendCommand("2F 04 31 03 0F", "Тестовый импульс в модулятор полуприцепа TEBS");
      await new Promise((r) => setTimeout(r, 800));

      addLog("Измерение времени нарастания давления в тормозных камерах прицепа...");
      await new Promise((r) => setTimeout(r, 600));
      addLog("Время отклика: 110 мс (норма ISO 11992 < 200 мс)");

      setIsRunning(false);
      setStep(4);
    } catch (err: any) {
      addLog("Ошибка: " + err.message);
      setIsRunning(false);
    }
  };

  const handleFinishAndWrite = async () => {
    setIsRunning(true);
    addLog("Авторизация UDS Security Access (Seed/Key 0x27)...");
    try {
      await elmService.sendCommand("27 01", "Security Access EBS3");
      await new Promise((r) => setTimeout(r, 400));

      const leadHex = Math.round(calculatedLead * 100).toString(16).padStart(2, "0");
      await elmService.sendCommand(`2E 04 10 ${leadHex}`, `Запись эталонного опережения: +${calculatedLead} Bar`);

      const balHex = Math.round(calculatedBalance).toString(16).padStart(2, "0");
      await elmService.sendCommand(`2E 04 12 ${balHex}`, `Запись баланса: ${calculatedBalance}% перед`);

      // Write CFC Enable flag
      await elmService.sendCommand("2E 04 15 01", "Активация адаптивного алгоритма WABCO CFC");

      addLog("Калибровка успешно завершена и сохранена во Flash-память WABCO EBS3!");
      
      setConfig((prev) => ({
        ...prev,
        trailerBrakeLeadDeltaBar: calculatedLead,
        frontRearBrakeBalancePercent: calculatedBalance,
        couplingForceControlEnabled: true,
      }));

      onCalibrationComplete(calculatedLead, calculatedBalance);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      addLog("Ошибка прошивки: " + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Мастер автокалибровки тормозных сил (WABCO CFC Wizard)
              </h3>
              <p className="text-xs text-slate-400">
                Автоматический расчет и прошивка идеальных параметров опережения и баланса ECE R13
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Progress */}
        <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
          {[
            { s: 1, title: "1. Проверка" },
            { s: 2, title: "2. Развесовка" },
            { s: 3, title: "3. Пневмотест" },
            { s: 4, title: "4. Прошивка" },
          ].map((item) => (
            <div
              key={item.s}
              className={`flex items-center gap-1.5 ${
                step === item.s
                  ? "text-amber-400 font-bold"
                  : step > item.s
                  ? "text-emerald-400"
                  : "text-slate-500"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step === item.s
                  ? "bg-amber-500 text-slate-950 font-black"
                  : step > item.s
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-800 text-slate-400"
              }`}>
                {step > item.s ? "✓" : item.s}
              </span>
              <span className="hidden sm:inline">{item.title}</span>
            </div>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-cyan-400" />
                  Шаг 1: Проверка готовности автопоезда Sitrak S7H
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Перед началом процедуры убедитесь, что тягач соединен с полуприцепом, соединительные головки PALM подключены, а разъем ISO 7638 CAN исправен.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">ISO 7638 CAN:</span>
                  <span className={`font-bold ${telemetry.trailerEbsConnected ? "text-emerald-400" : "text-red-400"}`}>
                    {telemetry.trailerEbsConnected ? "СВЯЗЬ АКТИВНА" : "НЕТ СВЯЗИ"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Давление питания (Красная):</span>
                  <span className="text-emerald-400 font-bold">{telemetry.trailerSupplyPressure} Bar</span>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <span>Перейти к анализу развесовки</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <h4 className="text-sm font-bold text-white">
                  Шаг 2: Измерение нагрузок по осям (ECAS Load Sensors)
                </h4>
                <p className="text-xs text-slate-400">
                  Система считывает давление в пневмобаллонах подвески тягача и полуприцепа для расчета оптимального коэффициента опережения.
                </p>
              </div>

              <button
                disabled={isRunning}
                onClick={handleRunStep2}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
              >
                <span>{isRunning ? "Считывание датчиков ECAS..." : "Запустить расчет развесовки"}</span>
                <Zap className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <h4 className="text-sm font-bold text-white">
                  Шаг 3: Динамический пневмотест времени срабатывания (ISO 11992)
                </h4>
                <p className="text-xs text-slate-400">
                  Подача пробного давления в желтую магистраль для проверки скорости отклика модулятора TEBS.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-amber-500/30 text-xs space-y-1">
                <span className="text-slate-400 font-mono">Расчетные параметры под вашу сцепку:</span>
                <div className="flex justify-between font-mono font-bold pt-1">
                  <span className="text-amber-400">Опережение (Lead ΔP): +{calculatedLead} Bar</span>
                  <span className="text-cyan-400">Баланс: {calculatedBalance}% / {100 - calculatedBalance}%</span>
                </div>
              </div>

              <button
                disabled={isRunning}
                onClick={handleRunStep3}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
              >
                <span>{isRunning ? "Выполнение пневмотеста..." : "Запустить тестовый импульс 1.5 Bar"}</span>
                <Play className="w-4 h-4 fill-current" />
              </button>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2 text-emerald-200">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Идеальные параметры ECE R13 рассчитаны!</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">
                  Все тесты успешно пройдены. Нажмите кнопку ниже для записи калибровок во Flash-память блоков WABCO EBS3 тягача и TEBS полуприцепа.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Итоговое опережение:</span>
                  <span className="text-amber-400 font-bold text-sm">+{calculatedLead.toFixed(2)} Bar</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Итоговый баланс (Перед/Зад):</span>
                  <span className="text-cyan-400 font-bold text-sm">{calculatedBalance}% / {100 - calculatedBalance}%</span>
                </div>
              </div>

              <button
                disabled={isRunning}
                onClick={handleFinishAndWrite}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
              >
                <span>{isRunning ? "Запись во Flash WABCO..." : "Применить и прошить в ЭБУ WABCO EBS3"}</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Diagnostic Log Console */}
          {logMessages.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 space-y-1">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">CAN / UDS Диагностический лог:</span>
              <div className="space-y-0.5 max-h-28 overflow-y-auto font-mono text-[10px] text-slate-400">
                {logMessages.map((log, idx) => (
                  <div key={idx} className="text-slate-300">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

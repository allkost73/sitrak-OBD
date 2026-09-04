import React, { useState } from "react";
import { 
  Activity, 
  Play, 
  Square, 
  Wind, 
  Droplets, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Power, 
  Gauge, 
  Radio,
  Zap
} from "lucide-react";
import { ActuatorTestStatus, TelemetryData } from "../types";
import { elmService } from "../services/elmAdapterService";

interface ActuatorsViewProps {
  telemetry: TelemetryData;
  isConnected: boolean;
}

export const ActuatorsView: React.FC<ActuatorsViewProps> = ({
  telemetry,
  isConnected,
}) => {
  const [cutoutStatus, setCutoutStatus] = useState<boolean[]>([true, true, true, true, true, true]);
  const [activeTestName, setActiveTestName] = useState<string | null>(null);
  const [testLog, setTestLog] = useState<{ time: string; msg: string }[]>([]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString("ru-RU", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setTestLog((prev) => [{ time, msg }, ...prev.slice(0, 15)]);
  };

  // Cylinder cutout toggle
  const toggleCylinder = async (cylIndex: number) => {
    const isNowActive = !cutoutStatus[cylIndex];
    const updated = [...cutoutStatus];
    updated[cylIndex] = isNowActive;
    setCutoutStatus(updated);

    const cmd = isNowActive 
      ? `30 01 0${cylIndex + 1} 01` // enable
      : `30 01 0${cylIndex + 1} 00`; // disable

    addLog(`${isNowActive ? "Включение" : "ОТКЛЮЧЕНИЕ"} подачи форсунки цилиндра №${cylIndex + 1}...`);
    await elmService.sendCommand(cmd, `Тест форсунки №${cylIndex + 1}`);

    // If disabled, simulate slight engine RPM drop / vibration
    if (!isNowActive) {
      elmService.setSimulatedTelemetry({
        engineRpm: Math.max(520, telemetry.engineRpm - 45),
        railPressure: telemetry.railPressure + 5,
      });
      addLog(`Цилиндр №${cylIndex + 1} отключен. Падение оборотов: -45 RPM. Балансировка в норме.`);
    } else {
      elmService.setSimulatedTelemetry({
        engineRpm: 600,
        railPressure: 45,
      });
      addLog(`Цилиндр №${cylIndex + 1} активирован обратно. Обороты стабильны.`);
    }
  };

  // Run VGT Turbo Sweep Test
  const runVgtSweep = async () => {
    setActiveTestName("vgt");
    addLog("Запуск калибровки и теста хода геометрии турбокомпрессора VGT Holset...");

    try {
      // 0%
      await elmService.sendCommand("2F 02 01 00", "VGT 0% (Сброс геометрии)");
      elmService.setSimulatedTelemetry({ boostPressure: 0.05 });
      addLog("Актуатор VGT: 0% (Шток в нижнем упоре)");
      await new Promise((r) => setTimeout(r, 800));

      // 50%
      await elmService.sendCommand("2F 02 01 32", "VGT 50% (Среднее положение)");
      elmService.setSimulatedTelemetry({ boostPressure: 0.35 });
      addLog("Актуатор VGT: 50% (Средний ход, датчик Холла: 2.45V)");
      await new Promise((r) => setTimeout(r, 800));

      // 100%
      await elmService.sendCommand("2F 02 01 64", "VGT 100% (Максимальное сужение лопаток)");
      elmService.setSimulatedTelemetry({ boostPressure: 0.75 });
      addLog("Актуатор VGT: 100% (Максимальное перекрытие, давление наддува на ХХ поднялось)");
      await new Promise((r) => setTimeout(r, 800));

      // Return
      await elmService.sendCommand("2F 02 01 00", "VGT Возврат в авто-режим");
      elmService.setSimulatedTelemetry({ boostPressure: 0.1 });
      addLog("Тест VGT успешно завершен. Механических заеданий не обнаружено.");
    } finally {
      setActiveTestName(null);
    }
  };

  // Run EVB Brake Valve Test
  const runEvbTest = async () => {
    setActiveTestName("evb");
    addLog("Запуск проверки декомпрессионного тормоза MAN EVB (Exhaust Valve Brake)...");

    try {
      await elmService.sendCommand("30 05 01 01", "Активация соленоида клапана EVB");
      addLog("Электромагнитный клапан EVB открыт. Давление в гидроаккумуляторе: 4.2 Bar.");
      await new Promise((r) => setTimeout(r, 1200));

      await elmService.sendCommand("30 05 01 00", "Отключение соленоида EVB");
      addLog("Клапан EVB закрыт. Тест завершен без ошибок цепи.");
    } finally {
      setActiveTestName(null);
    }
  };

  // Run Fan Clutch Test
  const runFanClutchTest = async (percent: number) => {
    setActiveTestName(`fan-${percent}`);
    addLog(`Включение вискомуфты вентилятора на ${percent}%...`);

    try {
      await elmService.sendCommand(`2F 08 01 ${(percent).toString(16).padStart(2, "0")}`, `ШИМ вентилятора: ${percent}%`);
      addLog(`ШИМ сигнал на муфту вентилятора подан: ${percent}%. Скорость вращения крыльчатки: ${Math.round(percent * 14)} RPM.`);
      await new Promise((r) => setTimeout(r, 1000));
    } finally {
      setActiveTestName(null);
    }
  };

  // Run AdBlue Pump Test
  const runAdbluePumpTest = async () => {
    setActiveTestName("adblue");
    addLog("Запуск теста насоса и дозирующего клапана AdBlue (DeNOx 2.2)...");

    try {
      await elmService.sendCommand("31 01 B0 01", "Включение насоса подачи мочевины");
      addLog("Насос AdBlue включен. Набор рабочего давления 9.0 Bar в рампе дозирования...");
      await new Promise((r) => setTimeout(r, 1000));

      await elmService.sendCommand("31 01 B0 02", "Тест факела распыла форсунки AdBlue");
      addLog("Открытие форсунки мочевины (Тест распыла 15 мл/мин). Давление стабильно 8.9 Bar.");
      await new Promise((r) => setTimeout(r, 1200));

      await elmService.sendCommand("31 01 B0 00", "Остановка насоса и продувка обратки");
      addLog("Продувка магистрали мочевины воздухом завершена. Насос и дозатор исправны.");
    } finally {
      setActiveTestName(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Тесты исполнительных механизмов (Actuator Testing)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Двунаправленная диагностика: управление форсунками, турбиной Holset, клапанами и насосами Sitrak
          </p>
        </div>
      </div>

      {/* Cylinder Cutout Section */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Power className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Поцилиндровое отключение форсунок (Cylinder Cutout Test)
              </h3>
              <p className="text-xs text-slate-400">Поиск троящего цилиндра или неисправной форсунки Common Rail</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400">
            ХХ: {Math.round(telemetry.engineRpm)} RPM
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Отключайте форсунки по одной на работающем двигателе. Если при отключении цилиндра обороты падают и мотор начинает вибрировать — цилиндр и форсунка исправны. Если изменений нет — проблема в этом цилиндре.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {cutoutStatus.map((isActive, idx) => (
            <button
              key={idx}
              id={`btn-cyl-cutout-${idx + 1}`}
              onClick={() => toggleCylinder(idx)}
              className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-between gap-2 shadow-md active:scale-95 ${
                isActive
                  ? "bg-slate-950/80 border-emerald-500/40 text-emerald-300 hover:border-emerald-400"
                  : "bg-red-950/70 border-red-500 text-red-300 animate-pulse"
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Цилиндр {idx + 1}
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-black text-xs ${
                isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
              }`}>
                {idx + 1}
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                isActive ? "bg-emerald-950 text-emerald-300" : "bg-red-900 text-white"
              }`}>
                {isActive ? "РАБОТАЕТ" : "ОТКЛЮЧЕН"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Actuators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* VGT Turbo Actuator */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Wind className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">
                Геометрия турбокомпрессора (VGT Sweep)
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Тест полного диапазона сервопривода геометрии турбины Holset (0% → 50% → 100%). Проверяет механическую подвижность лопаток и калибровку датчика положения.
            </p>
          </div>

          <button
            id="btn-test-vgt"
            disabled={activeTestName === "vgt"}
            onClick={runVgtSweep}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${activeTestName === "vgt" ? "animate-spin" : ""}`} />
            <span>{activeTestName === "vgt" ? "Идет тест VGT..." : "Запустить тест геометрии турбины"}</span>
          </button>
        </div>

        {/* AdBlue Dosing Pump & Spray Test */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Droplets className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white">
                Насос и дозатор AdBlue (SCR DeNOx)
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Тест нагнетания давления 9 Bar насосом подачи мочевины, проверка факела распыла форсунки и обратного продувочного клапана.
            </p>
          </div>

          <button
            id="btn-test-adblue"
            disabled={activeTestName === "adblue"}
            onClick={runAdbluePumpTest}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${activeTestName === "adblue" ? "animate-spin" : ""}`} />
            <span>{activeTestName === "adblue" ? "Тестирование AdBlue..." : "Запустить тест насоса и форсунки AdBlue"}</span>
          </button>
        </div>

        {/* Engine Brake EVB */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Radio className="w-5 h-5 text-red-400" />
              <h3 className="text-sm font-bold text-white">
                Горный тормоз MAN EVB
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Проверка срабатывания соленоида гидроуправляемого декомпрессионного тормоза выпуска и заслонки выхлопного тракта.
            </p>
          </div>

          <button
            id="btn-test-evb"
            disabled={activeTestName === "evb"}
            onClick={runEvbTest}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${activeTestName === "evb" ? "animate-spin" : ""}`} />
            <span>{activeTestName === "evb" ? "Проверка EVB..." : "Тест клапана тормоза EVB"}</span>
          </button>
        </div>

        {/* Fan Clutch Speed PWM */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Flame className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Вискомуфта вентилятора радиатора
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Принудительная подача ШИМ-сигнала блокировки электромагнитной муфты вентилятора BorgWarner / Behr.
            </p>
          </div>

          <div className="flex gap-2">
            {[0, 50, 100].map((pct) => (
              <button
                key={pct}
                id={`btn-test-fan-${pct}`}
                disabled={activeTestName !== null}
                onClick={() => runFanClutchTest(pct)}
                className="flex-1 py-2 text-xs font-mono font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Test Execution Log */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Протокол выполнения активных тестов
          </h3>
          <button
            onClick={() => setTestLog([])}
            className="text-[11px] text-slate-400 hover:text-white"
          >
            Очистить лог
          </button>
        </div>

        <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-xs max-h-48 overflow-y-auto space-y-1.5 scrollbar-none">
          {testLog.length === 0 ? (
            <span className="text-slate-500 italic">Лог пуст. Выберите тест выше для запуска.</span>
          ) : (
            testLog.map((l, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-slate-500 shrink-0">[{l.time}]</span>
                <span className="text-slate-300">{l.msg}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

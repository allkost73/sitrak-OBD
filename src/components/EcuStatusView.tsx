import React, { useState, useEffect } from "react";
import { 
  Cpu, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  Radio, 
  ShieldCheck, 
  Zap, 
  Sliders, 
  Terminal, 
  AlertTriangle,
  Info,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { elmService } from "../services/elmAdapterService";
import { EcuNodeScanResult, ElmDeviceInfo } from "../types";

interface EcuStatusViewProps {
  isConnected: boolean;
  device: ElmDeviceInfo | null;
  onOpenConnectModal: () => void;
  onNavigateToTerminal?: () => void;
  onNavigateToDtc?: () => void;
}

export const EcuStatusView: React.FC<EcuStatusViewProps> = ({
  isConnected,
  device,
  onOpenConnectModal,
  onNavigateToTerminal,
  onNavigateToDtc
}) => {
  const [ecus, setEcus] = useState<EcuNodeScanResult[]>(elmService.getEcuResults());
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<{ percent: number; currentName: string }>({ percent: 0, currentName: "" });
  const [selectedEcu, setSelectedEcu] = useState<EcuNodeScanResult | null>(null);
  const [probingEcuId, setProbingEcuId] = useState<string | null>(null);
  const [activeHeader, setActiveHeader] = useState<string>(device?.activeHeader || "18DB33F1");

  useEffect(() => {
    const unsub = elmService.onEcuScan((results, scanning) => {
      setEcus(results);
      setIsScanning(scanning);
      if (!selectedEcu && results.length > 0) {
        setSelectedEcu(results[0]);
      }
    });

    // Initial select
    const initial = elmService.getEcuResults();
    setEcus(initial);
    if (initial.length > 0) {
      setSelectedEcu(initial[0]);
    }

    return () => unsub();
  }, []);

  const handleFullScan = async () => {
    setIsScanning(true);
    setScanProgress({ percent: 0, currentName: "Инициализация CAN..." });
    try {
      await elmService.scanAllEcus((pct, name) => {
        setScanProgress({ percent: pct, currentName: name });
      });
    } catch (e) {
      console.error("ECU Scan failed", e);
    } finally {
      setIsScanning(false);
      setScanProgress({ percent: 100, currentName: "Сканирование завершено" });
    }
  };

  const handleWakeUpAndScan = async () => {
    setIsScanning(true);
    setScanProgress({ percent: 5, currentName: "Отправка импульса пробуждения CAN..." });
    try {
      await elmService.wakeUpCanBus();
      await elmService.scanAllEcus((pct, name) => {
        setScanProgress({ percent: pct, currentName: name });
      });
    } catch (e) {
      console.error("Wake-Up & Scan failed", e);
    } finally {
      setIsScanning(false);
      setScanProgress({ percent: 100, currentName: "Пробуждение и опрос завершены" });
    }
  };

  const handleProbeSingle = async (ecu: EcuNodeScanResult) => {
    setProbingEcuId(ecu.id);
    try {
      const res = await elmService.probeSingleEcu(ecu.code);
      if (res) {
        setSelectedEcu(res);
      }
    } catch (e) {
      console.error("Single probe error", e);
    } finally {
      setProbingEcuId(null);
    }
  };

  const handleSelectEcuHeader = async (ecu: EcuNodeScanResult) => {
    try {
      await elmService.setEcuHeader(ecu.headerHex);
      setActiveHeader(ecu.headerHex);
      setSelectedEcu(ecu);
    } catch (e) {
      console.error("Set header error", e);
    }
  };

  const onlineCount = ecus.filter(e => e.status === "online").length;
  const totalCount = ecus.length;

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  Блоки Управления Sitrak C7H / S7H
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                    7 ЭБУ
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Прямой мониторинг состояния, адресации и диагностических ответов блоков по CAN-шине (SAE J1939 / ISO 15765-4)
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons & Status Summary */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-400">Статус шины:</span>
              <span className={`font-bold flex items-center gap-1.5 ${
                onlineCount > 0 ? "text-emerald-400" : "text-red-400"
              }`}>
                <span className={`w-2 h-2 rounded-full ${onlineCount > 0 ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                {onlineCount} из {totalCount} на связи
              </span>
            </div>

            <button
              id="btn-wake-up-can"
              onClick={handleWakeUpAndScan}
              disabled={isScanning}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 shadow transition-all active:scale-95 disabled:opacity-50"
              title="Отправить импульс пробуждения CAN и сбросить фильтры адаптера"
            >
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Разбудить CAN шину</span>
              <span className="sm:hidden">Wake-Up</span>
            </button>

            <button
              id="btn-scan-all-ecus"
              onClick={handleFullScan}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-950/40 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
              <span>{isScanning ? "Сканирование блоков..." : "Опросить все 7 блоков"}</span>
            </button>
          </div>
        </div>

        {/* Diagnostic Helper Banner if 0 blocks online */}
        {onlineCount === 0 && !isScanning && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200 shadow-md">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 text-sm">Блоки управления не отвечают?</span>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  1. Убедитесь, что зажигание Sitrak ВКЛЮЧЕНО (Клемма 15, питание 24V на пине 16 OBD).<br />
                  2. Попробуйте сменить протокол на <b>ISO 15765-4 (29-bit 250k)</b> или <b>SAE J1939 (250k)</b>.<br />
                  3. Для проверки приложения без подключения к тягачу включите эмулятор.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                id="btn-ecu-connect-modal"
                onClick={onOpenConnectModal}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-all active:scale-95 text-center"
              >
                Подбор протокола
              </button>
              <button
                id="btn-ecu-start-demo"
                onClick={async () => {
                  await elmService.connectSimulator();
                }}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-bold text-xs shadow transition-all active:scale-95 text-center"
              >
                Включить ДЕМО
              </button>
            </div>
          </div>
        )}

        {/* Scan Progress Bar if Active */}
        {isScanning && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-mono flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Опрос: <b>{scanProgress.currentName || "Подготовка CAN пакета..."}</b>
              </span>
              <span className="font-bold text-amber-400">{scanProgress.percent}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div 
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${scanProgress.percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Grid: ECU Cards + Selected Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* List of 7 Sitrak ECUs */}
        <div className="lg:col-span-7 space-y-2.5">
          {ecus.map((ecu) => {
            const isOnline = ecu.status === "online";
            const isScanningThis = ecu.status === "scanning" || probingEcuId === ecu.id;
            const isSelected = selectedEcu?.id === ecu.id;

            return (
              <div
                key={ecu.id}
                id={`ecu-card-${ecu.id}`}
                onClick={() => setSelectedEcu(ecu)}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30"
                    : "bg-slate-900/80 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-mono font-bold text-xs border ${
                      isOnline
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : isScanningThis
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                        : "bg-slate-800 border-slate-700 text-slate-400"
                    }`}>
                      {ecu.code}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-sm sm:text-base text-white tracking-tight">
                          {ecu.name}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {ecu.diagnosticNotes}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-2 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          CAN: <b className="text-amber-400">{ecu.addressHex}</b>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          Header: <b className="text-cyan-400">0x{ecu.headerHex}</b>
                        </span>
                        {ecu.pingMs && (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-bold">
                            {ecu.pingMs}мс
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Action */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      isOnline
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        : isScanningThis
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                        : "bg-slate-800/80 border-slate-700 text-slate-400"
                    }`}>
                      {isOnline ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>ОНЛАЙН</span>
                        </>
                      ) : isScanningThis ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                          <span>ОПРОС...</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span>ОФФЛАЙН</span>
                        </>
                      )}
                    </div>

                    <button
                      id={`btn-probe-${ecu.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProbeSingle(ecu);
                      }}
                      disabled={isScanning || probingEcuId === ecu.id}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium border border-slate-700 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                      title="Опросить только этот блок"
                    >
                      Опросить
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected ECU Details & Direct Control Panel */}
        <div className="lg:col-span-5">
          {selectedEcu ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 sticky top-20">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-mono font-bold text-xs text-amber-400">
                    {selectedEcu.code}
                  </span>
                  <h3 className="font-bold text-base text-white">
                    Паспорт & Диагностика
                  </h3>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  selectedEcu.status === "online"
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                    : "bg-slate-800 border-slate-700 text-slate-400"
                }`}>
                  {selectedEcu.status === "online" ? "Блок отвечает" : "Нет отклика"}
                </span>
              </div>

              {/* General info */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Полное наименование:</span>
                  <p className="font-semibold text-slate-200 mt-0.5">{selectedEcu.name}</p>
                </div>
                <div>
                  <span className="text-slate-400">Назначение в тягаче:</span>
                  <p className="text-slate-300 mt-0.5">{selectedEcu.diagnosticNotes}</p>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Физический CAN ID:</span>
                  <span className="font-bold text-amber-400">{selectedEcu.addressHex}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Диагностический Header:</span>
                  <span className="font-bold text-cyan-400">0x{selectedEcu.headerHex}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Прошивка / Идентификатор:</span>
                  <span className="font-bold text-emerald-400 truncate max-w-[180px]">
                    {selectedEcu.swVersion || (selectedEcu.status === "online" ? "Определена" : "—")}
                  </span>
                </div>
                {selectedEcu.vin && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Считанный VIN:</span>
                    <span className="font-bold text-purple-400">{selectedEcu.vin}</span>
                  </div>
                )}
                {selectedEcu.pingMs && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Задержка шины (CAN Ping):</span>
                    <span className="font-bold text-slate-200">{selectedEcu.pingMs} мс</span>
                  </div>
                )}
              </div>

              {/* Actions for this specific ECU */}
              <div className="space-y-2 pt-2">
                <button
                  id="btn-set-ecu-active"
                  onClick={() => handleSelectEcuHeader(selectedEcu)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
                    activeHeader === selectedEcu.headerHex
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-cyan-500/40"
                  }`}
                >
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>
                    {activeHeader === selectedEcu.headerHex
                      ? `Активен заголовок 0x${selectedEcu.headerHex}`
                      : `Установить заголовок 0x${selectedEcu.headerHex}`}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-ecu-dtc"
                    onClick={() => onNavigateToDtc && onNavigateToDtc()}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span>Ошибки DTC</span>
                  </button>

                  <button
                    id="btn-ecu-terminal"
                    onClick={() => onNavigateToTerminal && onNavigateToTerminal()}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                  >
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    <span>CAN-Терминал</span>
                  </button>
                </div>
              </div>

              {/* Troubleshooting Tips if offline */}
              {selectedEcu.status !== "online" && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <Info className="w-3.5 h-3.5" />
                    <span>Если блок не выходит на связь:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                    <li>Проверьте включение зажигания (Клемма 15).</li>
                    <li>Проверьте предохранитель питания блока в блоке реле.</li>
                    <li>Сопротивление CAN-шины (CAN-H к CAN-L) должно быть 60 Ом.</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
              Выберите блок управления для подробной информации
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

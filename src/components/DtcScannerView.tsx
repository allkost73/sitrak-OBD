import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Cpu, 
  Sparkles, 
  Clock, 
  Wrench, 
  ShieldAlert,
  HelpCircle,
  PlusCircle,
  Radio,
  Server,
  Activity,
  Zap,
  Info
} from "lucide-react";
import { DtcFault, EcuType, EcuNodeScanResult } from "../types";
import { elmService } from "../services/elmAdapterService";
import { INITIAL_DTC_LIST, COMMON_DTC_DATABASE } from "../data/sitrakData";

interface DtcScannerViewProps {
  dtcs: DtcFault[];
  setDtcs: React.Dispatch<React.SetStateAction<DtcFault[]>>;
  onAskAi: (fault: DtcFault) => void;
  isConnected: boolean;
  onOpenConnectModal?: () => void;
}

export const DtcScannerView: React.FC<DtcScannerViewProps> = ({
  dtcs,
  setDtcs,
  onAskAi,
  isConnected,
  onOpenConnectModal,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState("Инициализация...");
  const [activeTabFilter, setActiveTabFilter] = useState<"all" | "active" | "stored" | "pending">("all");
  const [selectedEcu, setSelectedEcu] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDtcId, setExpandedDtcId] = useState<string | null>(dtcs[0]?.id || null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showAddMockModal, setShowAddMockModal] = useState(false);
  const [ecuNodes, setEcuNodes] = useState<EcuNodeScanResult[]>(elmService.getEcuResults());

  useEffect(() => {
    const unsub = elmService.onEcuScan((results) => {
      setEcuNodes(results);
    });
    return () => unsub();
  }, []);

  // Scan action across all ECUs via ELM327 J1939 DM1 commands
  const handleScanAll = async () => {
    setIsScanning(true);
    setScanProgress(5);
    setScanStatusText("Подготовка сканера шины CAN J1939...");

    try {
      if (!elmService.getIsConnected()) {
        setScanStatusText("Включение эмулятора Sitrak S7H CAN...");
        await elmService.connectSimulator("J1939_250K");
      }

      // Step 1: Scan ECU nodes on 29-bit CAN bus (0% - 50%)
      await elmService.scanAllEcus((pct, name) => {
        setScanProgress(Math.min(50, Math.round(5 + pct * 0.45)));
        setScanStatusText(`Опрос блока: ${name}...`);
      });
      
      // Step 2: Query J1939 DM1 Active Faults (50% - 65%)
      setScanProgress(60);
      setScanStatusText("Чтение активных кодов ошибок DM1 (Двигатель Bosch EDC17)...");
      await elmService.sendCommand("AT SH 18EA00F1", "Запрос DM1 Двигателя EDC17 (0x00)", 800);
      await elmService.sendCommand("CAFE00", "Запрос PGN 65226 DM1", 900);
      
      // Step 3: АКПП TraXon (65% - 80%)
      setScanProgress(75);
      setScanStatusText("Чтение ошибок АКПП ZF TraXon...");
      await elmService.sendCommand("AT SH 18EA03F1", "Запрос DM1 АКПП ZF TraXon (0x03)", 800);
      await elmService.sendCommand("CAFE00", "Запрос PGN 65226 DM1 TraXon", 900);

      // Step 4: Тормоза WABCO EBS3 (80% - 90%)
      setScanProgress(88);
      setScanStatusText("Чтение кодов тормозной системы WABCO EBS3...");
      await elmService.sendCommand("AT SH 18EA0BF1", "Запрос DM1 WABCO EBS3 (0x0B)", 800);
      await elmService.sendCommand("CAFE00", "Запрос PGN 65226 DM1 EBS3", 900);

      // Step 5: CBCU & SCR (90% - 98%)
      setScanProgress(95);
      setScanStatusText("Опрос CBCU и блока впрыска мочевины SCR DeNOx 2.2...");
      await elmService.sendCommand("AT SH 18EA21F1", "Запрос DM1 CBCU3 (0x21)", 800);
      await elmService.sendCommand("CAFE00", "Запрос PGN 65226 DM1 CBCU", 900);
      await elmService.sendCommand("AT SH 18EA3DF1", "Запрос DM1 SCR DCU (0x3D)", 800);
      await elmService.sendCommand("CAFE00", "Запрос PGN 65226 DM1 SCR", 900);

      // Restore broadcast header
      await elmService.sendCommand("AT SH 18DB33F1", "Возврат широковещательного заголовка", 600);

      // In simulation mode, ensure common demo DTCs are present if empty
      if (dtcs.length === 0) {
        setDtcs(INITIAL_DTC_LIST.slice(0, 4));
      }

      setScanProgress(100);
      setScanStatusText("Опрос всех 6 блоков управления завершен!");
    } catch (err: any) {
      console.error("Scan error:", err);
      setScanStatusText(`Ошибка сканирования: ${err?.message || err}`);
    } finally {
      setTimeout(() => {
        setIsScanning(false);
      }, 500);
    }
  };

  // Clear DTCs
  const handleClearAllDtcs = async () => {
    try {
      await elmService.sendCommand("04", "Очистка кодов неисправностей (Mode 04 / DM11)");
      await elmService.sendCommand("18FED300", "Сброс диагностической информации J1939 DM11");
      setDtcs([]);
      setShowClearConfirm(false);
    } catch (err) {
      console.error("Clear error:", err);
    }
  };

  // Filtered DTCs
  const filteredDtcs = dtcs.filter((d) => {
    if (activeTabFilter !== "all" && d.status !== activeTabFilter) return false;
    if (selectedEcu !== "all" && d.ecu !== selectedEcu) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.code.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        (d.obdCode && d.obdCode.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const activeCount = dtcs.filter((d) => d.status === "active").length;
  const storedCount = dtcs.filter((d) => d.status === "stored").length;

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Top Header & Action Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Диагностический сканер DTC (SAE J1939 & OBD-II)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Чтение и сброс активных/сохраненных кодов неисправностей по 5 электронным блокам Sitrak
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Scan Button */}
          <button
            id="btn-dtc-scan-all"
            disabled={isScanning}
            onClick={handleScanAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
            <span>{isScanning ? `Сканирование (${scanProgress}%)...` : "Сканировать все ЭБУ"}</span>
          </button>

          {/* Clear DTC Button */}
          {dtcs.length > 0 && (
            <button
              id="btn-dtc-clear-open"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 text-xs font-semibold transition-all active:scale-95 shadow"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>Сбросить ошибки</span>
            </button>
          )}

          {/* Test inject button */}
          <button
            id="btn-dtc-inject-mock"
            onClick={() => setShowAddMockModal(true)}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
            title="Добавить тестовую ошибку для проверки"
          >
            <PlusCircle className="w-4 h-4 text-slate-400" />
            <span className="hidden xs:inline">Тест DTC</span>
          </button>
        </div>
      </div>

      {/* Progress Bar when scanning */}
      {isScanning && (
        <div className="w-full bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-1.5 animate-in fade-in">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium truncate pr-2 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
              <span>{scanStatusText}</span>
            </span>
            <span className="font-mono font-bold text-amber-400 shrink-0">{scanProgress}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 via-cyan-500 to-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Summary & Filter Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Всего ошибок</div>
            <div className="text-xl font-bold text-white font-mono">{dtcs.length}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
            <Cpu className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center justify-between">
          <div>
            <div className="text-xs text-red-300">Активные (Текущие)</div>
            <div className="text-xl font-bold text-red-400 font-mono">{activeCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-300">Сохраненные (Архив)</div>
            <div className="text-xl font-bold text-amber-400 font-mono">{storedCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-600/20 flex items-center justify-center text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ECU Bus Connectivity Strip */}
      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <Server className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Связь с блоками CAN J1939:</span>
          <div className="flex flex-wrap gap-1.5 ml-1 font-mono text-[11px]">
            {ecuNodes.map((ecu) => (
              <span
                key={ecu.id}
                title={`${ecu.name} (${ecu.addressHex}) - ${ecu.status === "online" ? "Онлайн" : "Нет ответа"}`}
                className={`px-2 py-0.5 rounded flex items-center gap-1 font-bold ${
                  ecu.status === "online"
                    ? "bg-emerald-950/90 text-emerald-300 border border-emerald-500/50"
                    : ecu.status === "scanning"
                    ? "bg-amber-950/90 text-amber-300 border border-amber-500/50 animate-pulse"
                    : "bg-slate-900 text-slate-500 border border-slate-800"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${ecu.status === "online" ? "bg-emerald-400" : "bg-slate-600"}`} />
                <span>{ecu.shortCode}</span>
              </span>
            ))}
          </div>
        </div>

        {onOpenConnectModal && (
          <button
            onClick={onOpenConnectModal}
            className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline flex items-center gap-1 text-xs shrink-0"
          >
            <span>Диагностика связи (ECU Doctor)</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </button>
        )}
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-dtc-search"
            type="text"
            placeholder="Поиск по коду (3226, P2201), блоку или названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* ECU Selector */}
        <select
          id="select-dtc-ecu-filter"
          value={selectedEcu}
          onChange={(e) => setSelectedEcu(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-500"
        >
          <option value="all">Все блоки ЭБУ</option>
          <option value="EDC17">Двигатель (Bosch EDC17)</option>
          <option value="TRAXON">АКПП (ZF TraXon)</option>
          <option value="EBS3">Тормоза (WABCO EBS3)</option>
          <option value="CBCU">Кузовной (CBCU-V3)</option>
          <option value="SCR_DCU">Мочевина (SCR DeNOx)</option>
        </select>

        {/* Status Tab Toggle */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(["all", "active", "stored"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTabFilter(tab)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all capitalize ${
                activeTabFilter === tab
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab === "all" ? "Все" : tab === "active" ? "Активные" : "Сохраненные"}
            </button>
          ))}
        </div>
      </div>

      {/* DTC List */}
      <div className="space-y-3">
        {filteredDtcs.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Ошибок не обнаружено
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Все блоки управления Sitrak S7H функционируют в штатном режиме. Параметры CAN J1939 в норме.
              </p>
            </div>
          </div>
        ) : (
          filteredDtcs.map((dtc) => {
            const isExpanded = expandedDtcId === dtc.id;

            return (
              <div
                key={dtc.id}
                id={`dtc-card-${dtc.id}`}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg ${
                  dtc.severity === "critical"
                    ? "bg-slate-900/95 border-red-500/40 hover:border-red-500/70"
                    : dtc.severity === "warning"
                    ? "bg-slate-900/95 border-amber-500/40 hover:border-amber-500/70"
                    : "bg-slate-900/95 border-slate-700 hover:border-slate-600"
                }`}
              >
                {/* Collapsible Header */}
                <div
                  onClick={() => setExpandedDtcId(isExpanded ? null : dtc.id)}
                  className="p-4 flex items-start justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      dtc.severity === "critical"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : dtc.severity === "warning"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    }`}>
                      <AlertOctagon className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-black font-mono tracking-tight text-white">
                          {dtc.code}
                        </span>
                        {dtc.obdCode && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                            {dtc.obdCode}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          dtc.status === "active"
                            ? "bg-red-950 text-red-400 border border-red-800"
                            : "bg-amber-950 text-amber-400 border border-amber-800"
                        }`}>
                          {dtc.status === "active" ? "Активная" : "В памяти"}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          • {dtc.ecuName}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-semibold text-slate-200 mt-1 leading-snug">
                        {dtc.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAskAi(dtc);
                      }}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all active:scale-95"
                      title="Спросить совет AI-автомастера"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>AI Решение</span>
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 space-y-3.5 bg-slate-950/40">
                    {/* Description */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Описание неисправности:
                      </span>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {dtc.description}
                      </p>
                    </div>

                    {/* Symptoms */}
                    {dtc.symptoms && dtc.symptoms.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                          Симптомы на тягаче Sitrak:
                        </span>
                        <ul className="mt-1 space-y-1 text-xs text-slate-300 list-disc list-inside">
                          {dtc.symptoms.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Repair instructions */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <Wrench className="w-4 h-4" />
                        <span>План проверки и устранения:</span>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                        {dtc.recommendedFix}
                      </p>
                    </div>

                    {/* Pinout info */}
                    {dtc.pinoutCheck && (
                      <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs space-y-1">
                        <span className="font-bold text-blue-300">
                          Замеры мультиметром / Распиновка:
                        </span>
                        <p className="text-slate-300 font-mono text-[11px]">
                          {dtc.pinoutCheck}
                        </p>
                      </div>
                    )}

                    {/* Freeze Frame Data Snapshot */}
                    {dtc.freezeFrame && (
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                          <span>Стоп-кадр (Freeze Frame в момент фиксации):</span>
                          <span className="font-mono text-[11px] text-slate-400">{dtc.freezeFrame.timestamp}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                          <div className="bg-slate-950 p-2 rounded border border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Обороты:</span>
                            <span className="text-white font-bold">{dtc.freezeFrame.engineRpm} RPM</span>
                          </div>
                          <div className="bg-slate-950 p-2 rounded border border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Скорость:</span>
                            <span className="text-white font-bold">{dtc.freezeFrame.vehicleSpeed} км/ч</span>
                          </div>
                          <div className="bg-slate-950 p-2 rounded border border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Температура ОЖ:</span>
                            <span className="text-white font-bold">{dtc.freezeFrame.coolantTemp}°C</span>
                          </div>
                          <div className="bg-slate-950 p-2 rounded border border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Давление рампы:</span>
                            <span className="text-white font-bold">{dtc.freezeFrame.railPressure} MPa</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mobile AI button */}
                    <div className="sm:hidden pt-1">
                      <button
                        onClick={() => onAskAi(dtc)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow"
                      >
                        <Sparkles className="w-4 h-4 text-emerald-200" />
                        <span>Спросить детальный разбор у AI</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal for Clearing DTCs */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Сброс кодов неисправностей</h3>
                <p className="text-xs text-slate-400">Команда J1939 DM11 / Mode 04</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Вы уверены, что хотите стереть все ошибки во всех 5 блоках управления Sitrak? 
              <br />
              <b className="text-amber-400">Внимание:</b> Если физическая причина неисправности не устранена, ошибка появится снова после включения зажигания или тестовой поездки.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                id="btn-confirm-clear-dtc"
                onClick={handleClearAllDtcs}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Стереть все ошибки
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mock DTC Injector Modal (Useful for testing) */}
      {showAddMockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Добавить диагностическую ошибку для проверки
              </h3>
              <button onClick={() => setShowAddMockModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(COMMON_DTC_DATABASE).map(([key, item]) => (
                <div
                  key={key}
                  onClick={() => {
                    const newDtc: DtcFault = {
                      id: "dtc-" + Date.now(),
                      code: key,
                      ecu: item.ecu,
                      ecuName: item.ecu === "EDC17" ? "ЭБУ Двигателя Bosch EDC17" : item.ecu === "SCR_DCU" ? "Блок AdBlue SCR" : "WABCO EBS3",
                      title: item.title,
                      description: item.desc,
                      status: "active",
                      severity: "warning",
                      symptoms: ["Индикация на приборной панели Sitrak"],
                      recommendedFix: item.fix,
                      occurrenceCount: 1,
                    };
                    setDtcs((prev) => [newDtc, ...prev]);
                    setShowAddMockModal(false);
                  }}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 cursor-pointer transition-colors text-xs"
                >
                  <div className="font-bold text-amber-400 font-mono">{key}</div>
                  <div className="text-slate-200">{item.title}</div>
                  <div className="text-slate-400 text-[11px]">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

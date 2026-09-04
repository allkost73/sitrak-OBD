import React, { useState, useEffect } from "react";
import { 
  X, 
  Bluetooth, 
  Usb, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Smartphone,
  Layers,
  Settings,
  HelpCircle,
  Terminal,
  Radio,
  ExternalLink,
  ChevronRight,
  Send,
  Sliders,
  KeyRound,
  Download,
  Info,
  Activity,
  Server,
  Gauge,
  CheckCircle,
  XCircle,
  Truck,
  Wrench
} from "lucide-react";
import { elmService } from "../services/elmAdapterService";
import { ElmDeviceInfo, ElmVersion, ProtocolType, EcuNodeScanResult, ProtocolScanCandidate, ProtocolScanProgress } from "../types";

interface BluetoothConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  device: ElmDeviceInfo | null;
}

export const BluetoothConnectModal: React.FC<BluetoothConnectModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  device,
}) => {
  const [activeTab, setActiveTab] = useState<"connect" | "protocol_scan" | "ecu_doctor" | "classic_guide" | "troubleshoot" | "terminal">("connect");
  const [protocol, setProtocol] = useState<ProtocolType>("J1939_250K");
  const [baudRate, setBaudRate] = useState<number>(38400);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customAtCmd, setCustomAtCmd] = useState<string>("AT Z");
  const [lastCmdResponse, setLastCmdResponse] = useState<string | null>(null);
  const [ecuScanResults, setEcuScanResults] = useState<EcuNodeScanResult[]>(elmService.getEcuResults());
  const [isScanningEcus, setIsScanningEcus] = useState(false);
  const [negotiationResult, setNegotiationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [scanModeFilter, setScanModeFilter] = useState<"all" | "truck_can" | "k_line">("all");
  const [protocolScanProgress, setProtocolScanProgress] = useState<ProtocolScanProgress>(elmService.getProtocolScanState());
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [applyingProtocolId, setApplyingProtocolId] = useState<string | null>(null);
  const [chipTestResult, setChipTestResult] = useState<{
    tested: boolean;
    isV15: boolean;
    chipName: string;
    j1939Compatible: boolean;
    details: string;
  } | null>(null);

  useEffect(() => {
    const unsubEcu = elmService.onEcuScan((results, isScanning) => {
      setEcuScanResults(results);
      setIsScanningEcus(isScanning);
    });

    const unsubProto = elmService.onProtocolScan((progress) => {
      setProtocolScanProgress(progress);
    });

    return () => {
      unsubEcu();
      unsubProto();
    };
  }, []);

  if (!isOpen) return null;

  const handleScanEcus = async () => {
    setErrorMsg(null);
    try {
      await elmService.scanAllEcus();
    } catch (err: any) {
      setErrorMsg("Ошибка сканирования ЭБУ: " + err.message);
    }
  };

  const handleRunProtocolScan = async (mode: "all" | "truck_can" | "k_line" = scanModeFilter) => {
    setErrorMsg(null);
    setSuccessToast(null);
    try {
      await elmService.runProtocolBruteForceScan(mode);
    } catch (err: any) {
      setErrorMsg("Ошибка перебора протоколов: " + err.message);
    }
  };

  const handleCancelScan = () => {
    elmService.cancelProtocolScan();
  };

  const handleApplyProtocol = async (candidate: ProtocolScanCandidate) => {
    setErrorMsg(null);
    setSuccessToast(null);
    setApplyingProtocolId(candidate.id);
    setIsConnecting(true);
    try {
      const res = await elmService.applyScannedProtocol(candidate);
      setProtocol(candidate.code);
      if (res.success) {
        setNegotiationResult({ success: true, message: res.message });
        setSuccessToast(`Протокол «${candidate.name}» успешно применен! Опрос 6 блоков завершен.`);
        setTimeout(() => setSuccessToast(null), 6000);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg("Ошибка активации протокола: " + (err?.message || err));
    } finally {
      setIsConnecting(false);
      setApplyingProtocolId(null);
    }
  };

  const handleAutoNegotiate = async (targetProto?: ProtocolType) => {
    setIsConnecting(true);
    setErrorMsg(null);
    setNegotiationResult(null);
    try {
      const res = await elmService.negotiateEcuProtocol(targetProto);
      setNegotiationResult({ success: res.success, message: res.message });
      if (res.success) {
        // Automatically scan ECUs after successful negotiation
        await elmService.scanAllEcus();
      }
    } catch (err: any) {
      setErrorMsg("Ошибка согласования протокола: " + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSetHeader = async (header: string) => {
    setIsConnecting(true);
    try {
      await elmService.setEcuHeader(header);
      await elmService.scanAllEcus();
    } catch (err: any) {
      setErrorMsg("Ошибка установки CAN-заголовка: " + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleProbeSingleEcu = async (ecuCode: string) => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      const res = await elmService.probeSingleEcu(ecuCode);
      if (res && res.status === "online") {
        setSuccessToast(`Блок «${res.name}» онлайн! Отклик: ${res.pingMs}мс`);
        setTimeout(() => setSuccessToast(null), 4500);
      } else {
        setErrorMsg(`Блок ${ecuCode} не ответил. Проверьте зажигание и подключение.`);
      }
    } catch (err: any) {
      setErrorMsg(`Ошибка опроса ${ecuCode}: ${err?.message || err}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRunGaugeSweep = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      await elmService.runGaugeSweepTest();
      setSuccessToast("Тест стрелок приборной панели (Gauge Sweep) успешно выполнен!");
      setTimeout(() => setSuccessToast(null), 4500);
    } catch (err: any) {
      setErrorMsg("Ошибка теста стрелок: " + (err?.message || err));
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  const handleConnectSmartAuto = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      await elmService.connectSmartAuto(baudRate, protocol);
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.message || 
        "Не удалось обнаружить или подключить адаптер. Проверьте сопряжение в телефоне (PIN 1234), включенный Bluetooth и зажигание тягача."
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectClassic = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      await elmService.connectBluetoothClassic(baudRate, protocol);
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.message || 
        "Не удалось подключить Bluetooth Classic. Убедитесь, что выполнили сопряжение с PIN 1234 в настройках телефона."
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectBle = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      await elmService.connectBluetoothBle(protocol);
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.message || 
        "Не удалось подключиться к Bluetooth BLE адаптеру. Если у вас адаптер с PIN 1234/0000 — выберите режим «Bluetooth Classic»."
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectSerial = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      await elmService.connectSerial(baudRate, protocol);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка USB / COM-порта.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectSimulator = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      await elmService.connectSimulator(protocol);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка виртуального CAN-шлюза.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await elmService.disconnect();
    setChipTestResult(null);
    setLastCmdResponse(null);
  };

  const handleSendCustomAt = async (cmd: string) => {
    if (!cmd.trim()) return;
    setIsConnecting(true);
    try {
      const resp = await elmService.sendCommand(cmd.trim(), "Ручная AT-команда");
      setLastCmdResponse(resp);
    } catch (err: any) {
      setLastCmdResponse("Ошибка: " + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const runChipAuthenticityTest = async () => {
    if (!isConnected) return;
    setIsConnecting(true);
    try {
      await elmService.sendCommand("ATI");
      await elmService.sendCommand("AT @1");
      await elmService.sendCommand("AT DP");
      await elmService.sendCommand("AT RV");

      const isGenuine = device?.version === "v1.5" || device?.version === "ELM375" || device?.isGenuine;
      setChipTestResult({
        tested: true,
        isV15: !!isGenuine,
        chipName: isGenuine ? "ELM375 / Microchip PIC18F25K80 (Оригинал)" : "ELM327 Clone v2.1",
        j1939Compatible: !!isGenuine,
        details: isGenuine 
          ? "Чип полноценно поддерживает 29-битные J1939 PGN кадры, скорость 250k baud и расширенную диагностику блоков Bosch EDC17 и WABCO EBS3."
          : "Клон v2.1 поддерживает только базовые легковые OBD-II команды и не может прочитать специфичные грузовые блоки Sitrak.",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="modal-bluetooth-connect"
        className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Подключение адаптера ELM375 / ELM327
              </h2>
              <p className="text-xs text-slate-400">
                Диагностика Sitrak S7H / C7H по CAN-шине SAE J1939 (29 bit, 250k)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 bg-slate-950/40 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("connect")}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "connect"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bluetooth className="w-4 h-4" />
            <span>Подключение</span>
          </button>

          <button
            id="tab-protocol-scan"
            onClick={() => setActiveTab("protocol_scan")}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "protocol_scan"
                ? "border-amber-500 text-amber-400 bg-amber-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Перебор протоколов</span>
            {protocolScanProgress.isScanning ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500 text-slate-950 font-bold animate-pulse">
                ПОИСК...
              </span>
            ) : protocolScanProgress.foundWorkingProtocol ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab("ecu_doctor")}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "ecu_doctor"
                ? "border-emerald-400 text-emerald-400 bg-emerald-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Связь с ЭБУ (Doctor)</span>
            <span className={`w-2 h-2 rounded-full ${ecuScanResults.some(r => r.status === "online") ? "bg-emerald-400" : "bg-amber-400 animate-ping"}`} />
          </button>

          <button
            onClick={() => setActiveTab("classic_guide")}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "classic_guide"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <span>Инструкция Bluetooth Classic (1234)</span>
          </button>

          <button
            onClick={() => setActiveTab("troubleshoot")}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "troubleshoot"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>Частые вопросы</span>
          </button>

          <button
            onClick={() => setActiveTab("terminal")}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "terminal"
                ? "border-purple-400 text-purple-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>AT-команды</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Active Connection Status Banner */}
          {isConnected && device && (
            <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span>{device.name}</span>
                    <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-emerald-800/80 text-emerald-200 rounded">
                      {device.version}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-300/80 mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono">
                    <span>Питание: <b>{device.voltage}V (24V CAN)</b></span>
                    <span>Протокол: <b>{device.protocol}</b></span>
                    <span>Скорость: <b>{device.baudRate} bps</b></span>
                    <span>Задержка: <b>{device.pingMs} мс</b></span>
                  </div>
                </div>
              </div>
              <button
                id="btn-disconnect-elm"
                onClick={handleDisconnect}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all active:scale-95 shadow"
              >
                Отключить
              </button>
            </div>
          )}

          {successToast && (
            <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-semibold text-white">{successToast}</span>
              </div>
              <button
                onClick={() => setSuccessToast(null)}
                className="text-emerald-400 hover:text-emerald-300 text-xs font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-start gap-3 shadow-lg">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-white">Ошибка:</div>
                <div>{errorMsg}</div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => setActiveTab("classic_guide")}
                    className="text-cyan-400 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <span>Как подключить Bluetooth Classic (PIN 1234)</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: CONNECT */}
          {activeTab === "connect" && (
            <div className="space-y-5">
              {/* Highlight box for Bluetooth Classic */}
              <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-cyan-200">
                <div className="flex items-start gap-2.5">
                  <KeyRound className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block sm:inline mr-1">
                      Для адаптеров Bluetooth Classic (PIN 1234 / 0000):
                    </span>
                    Сначала выполните сопряжение в Bluetooth-настройках телефона, затем нажмите синюю кнопку <b>«Bluetooth Classic (SPP)»</b> ниже.
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("classic_guide")}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold border border-cyan-500/50 shrink-0 transition-colors"
                >
                  Инструкция 1-2-3
                </button>
              </div>

              {/* Protocol & Baudrate Selector */}
              <div className="grid grid-cols-1 gap-3.5">
                {/* Protocol Selector with Quick Presets */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-amber-400" />
                        <span>Протокол CAN грузовика Sitrak / Sinotruk</span>
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Выберите протокол и нажмите «Применить», чтобы настроить фильтры и заголовок ELM375.
                      </p>
                    </div>

                    <button
                      id="btn-apply-selected-protocol"
                      disabled={isConnecting}
                      onClick={async () => {
                        const candidates = elmService.getProtocolCandidates();
                        const match = candidates.find(c => c.code === protocol) || {
                          id: protocol.toLowerCase(),
                          name: protocol,
                          elmCommand: protocol === "J1939_250K" ? "AT SP B" : protocol === "ISO15765_29BIT_250K" ? "AT SP 9" : "AT SP 0",
                          code: protocol,
                          busType: "CAN 29-bit",
                          baudRate: "250 kbps",
                          description: "Выбранный протокол",
                          recommendedHeader: "18DB33F1",
                          targetSystems: "Все ЭБУ",
                          status: "pending" as const
                        };
                        await handleApplyProtocol(match);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0"
                    >
                      {isConnecting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Применение...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-slate-950" />
                          <span>Применить к адаптеру</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 1-Click Quick Protocol Presets */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        setProtocol("J1939_250K");
                        const candidates = elmService.getProtocolCandidates();
                        const match = candidates.find(c => c.code === "J1939_250K");
                        if (match) await handleApplyProtocol(match);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        protocol === "J1939_250K"
                          ? "bg-amber-500/20 border-amber-500 text-amber-200 shadow-sm ring-1 ring-amber-500"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-[10px] uppercase font-mono font-bold text-amber-400">J1939 250k (AT SP B)</div>
                      <div className="text-xs font-bold text-white mt-0.5">Sitrak S7H / C7H</div>
                      <div className="text-[10px] text-slate-400">MC11/13, TraXon</div>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setProtocol("ISO15765_29BIT_250K");
                        const candidates = elmService.getProtocolCandidates();
                        const match = candidates.find(c => c.code === "ISO15765_29BIT_250K");
                        if (match) await handleApplyProtocol(match);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        protocol === "ISO15765_29BIT_250K"
                          ? "bg-cyan-500/20 border-cyan-500 text-cyan-200 shadow-sm ring-1 ring-cyan-500"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-[10px] uppercase font-mono font-bold text-cyan-400">ISO 15765 29b 250k (SP 9)</div>
                      <div className="text-xs font-bold text-white mt-0.5">Резервный CAN</div>
                      <div className="text-[10px] text-slate-400">UDS / Sinotruk HOWO</div>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setProtocol("ISO15765_29BIT_500K");
                        const candidates = elmService.getProtocolCandidates();
                        const match = candidates.find(c => c.code === "ISO15765_29BIT_500K");
                        if (match) await handleApplyProtocol(match);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        protocol === "ISO15765_29BIT_500K"
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-sm ring-1 ring-emerald-500"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-[10px] uppercase font-mono font-bold text-emerald-400">ISO 15765 29b 500k (SP 7)</div>
                      <div className="text-xs font-bold text-white mt-0.5">CAN 29/500 ★</div>
                      <div className="text-[10px] text-slate-400">VCU, Shacman X6000</div>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setProtocol("J1939_500K");
                        const candidates = elmService.getProtocolCandidates();
                        const match = candidates.find(c => c.code === "J1939_500K");
                        if (match) await handleApplyProtocol(match);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        protocol === "J1939_500K"
                          ? "bg-purple-500/20 border-purple-500 text-purple-200 shadow-sm ring-1 ring-purple-500"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-[10px] uppercase font-mono font-bold text-purple-400">J1939 500k (AT SP C)</div>
                      <div className="text-xs font-bold text-white mt-0.5">Sitrak C9H / G7H</div>
                      <div className="text-[10px] text-slate-400">Euro-6, FAST AMT</div>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setProtocol("AUTO");
                        const candidates = elmService.getProtocolCandidates();
                        const match = candidates.find(c => c.code === "AUTO");
                        if (match) await handleApplyProtocol(match);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        protocol === "AUTO"
                          ? "bg-amber-500/20 border-amber-500 text-amber-200 shadow-sm ring-1 ring-amber-500"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-[10px] uppercase font-mono font-bold text-amber-400">Автопоиск (AT SP 0)</div>
                      <div className="text-xs font-bold text-white mt-0.5">Авто-определение</div>
                      <div className="text-[10px] text-slate-400">Поиск чипом ELM</div>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Все доступные протоколы (12 шт):
                      </label>
                      <select
                        id="select-protocol"
                        value={protocol}
                        onChange={(e) => setProtocol(e.target.value as ProtocolType)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:border-amber-500"
                      >
                        <option value="J1939_250K">SAE J1939 (CAN 29-bit, 250 kbps) ★ Основной Sitrak S7H / C7H (AT SP B)</option>
                        <option value="ISO15765_29BIT_250K">ISO 15765-4 CAN (29-bit, 250 kbps) ★ Резервный CAN (AT SP 9)</option>
                        <option value="ISO15765_29BIT_500K">ISO 15765-4 CAN (29-bit, 500 kbps) ★ Скоростной CAN 29/500 (AT SP 7)</option>
                        <option value="J1939_500K">SAE J1939 (CAN 29-bit, 500 kbps) Euro-6 / C9H / G7H (AT SP C)</option>
                        <option value="ISO15765_11BIT_500K">ISO 15765-4 CAN (11-bit, 500 kbps) Стандарт OBD (AT SP 6)</option>
                        <option value="ISO15765_11BIT_250K">ISO 15765-4 CAN (11-bit, 250 kbps) (AT SP 8)</option>
                        <option value="KWP2000_FAST">ISO 14230-4 KWP Fast (K-Line 10.4k) Отопители Webasto (AT SP 5)</option>
                        <option value="KWP2000_5BAUD">ISO 14230-4 KWP 5-Baud (K-Line 10.4k) (AT SP 4)</option>
                        <option value="ISO9141_2">ISO 9141-2 (K-Line 10.4k) (AT SP 3)</option>
                        <option value="J1850_PWM">SAE J1850 PWM (41.6 kbps) (AT SP 1)</option>
                        <option value="J1850_VPW">SAE J1850 VPW (10.4 kbps) (AT SP 2)</option>
                        <option value="AUTO">Автоопределение протокола (AT SP 0)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Скорость порта адаптера (Baud Rate):
                      </label>
                      <select
                        id="select-baudrate"
                        value={baudRate}
                        onChange={(e) => setBaudRate(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                      >
                        <option value={38400}>38 400 bps (Стандарт Bluetooth Classic ELM327 / ELM375)</option>
                        <option value={115200}>115 200 bps (Скоростные адаптеры ELM375 / STN / vLinker)</option>
                        <option value={9600}>9 600 bps (Медленные адаптеры)</option>
                        <option value={500000}>500 000 bps (OBDLink MX+ / USB FTDI)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

                {/* Connection Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Выберите тип вашего адаптера:
                  </h3>
                  <span className="text-[11px] text-cyan-400 font-semibold">
                    Совместимо с ELM327 v1.5 / ELM375 / vLinker
                  </span>
                </div>

                {/* 1-Click Smart Auto Connect */}
                <button
                  id="btn-connect-smart-auto"
                  disabled={isConnecting}
                  onClick={handleConnectSmartAuto}
                  className="w-full p-4 rounded-xl bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 hover:from-cyan-900 hover:to-blue-900 border-2 border-cyan-400 text-left transition-all group flex items-center justify-between gap-3 shadow-xl active:scale-98 relative overflow-hidden"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 border border-cyan-400/40">
                      <Zap className="w-6 h-6 text-cyan-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-200">
                          Умное авто-подключение (Classic / BLE / USB)
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500 text-slate-950 animate-pulse">
                          Рекомендуется
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Автоматически определяет тип адаптера (Bluetooth Classic SPP PIN 1234, BLE 4.0/5.0 или USB) и согласовывает скорость.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-cyan-400 shrink-0 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Bluetooth Classic Card (Primary) */}
                  <button
                    id="btn-connect-classic"
                    disabled={isConnecting}
                    onClick={handleConnectClassic}
                    className="p-4 rounded-xl bg-gradient-to-b from-cyan-950/60 to-slate-900 hover:from-cyan-900/60 hover:to-slate-800 border border-cyan-500/70 hover:border-cyan-400 text-left transition-all group flex flex-col justify-between gap-3 shadow-lg active:scale-98 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-900/80 text-cyan-200 border border-cyan-500/60">
                        PIN 1234 / 0000 ★ Classic SPP
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 flex items-center gap-1.5">
                        <span>Bluetooth Classic (SPP)</span>
                      </h4>
                      <p className="text-xs text-slate-300 mt-1">
                        Для стандартных адаптеров ELM327 / ELM375 Bluetooth 2.1/3.0. Требуется предварительное сопряжение в телефоне.
                      </p>
                    </div>
                  </button>

                  {/* Bluetooth BLE Button */}
                  <button
                    id="btn-connect-ble"
                    disabled={isConnecting}
                    onClick={handleConnectBle}
                    className="p-4 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 hover:from-blue-600/20 hover:to-slate-800 border border-slate-700 hover:border-blue-500/60 text-left transition-all group flex flex-col justify-between gap-3 shadow-md active:scale-98"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Bluetooth className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-700/50">
                        BLE 4.0 / 5.0 (Без PIN)
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-300">
                        Bluetooth BLE адаптер
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Vgate iCar Pro BLE, Kingbolen, Konnwei, Viecar, vLinker FD+
                      </p>
                    </div>
                  </button>

                  {/* USB OTG / Classic SPP COM Serial */}
                  <button
                    id="btn-connect-serial"
                    disabled={isConnecting}
                    onClick={handleConnectSerial}
                    className="p-4 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-slate-700 text-left transition-all group flex flex-col justify-between gap-3 shadow-md active:scale-98"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Usb className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        USB-OTG Кабель
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-slate-200">
                        USB / FTDI / CH340
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Проводные адаптеры через OTG-переходник Type-C
                      </p>
                    </div>
                  </button>

                  {/* Sitrak Simulator Mode */}
                  <button
                    id="btn-connect-simulator"
                    disabled={isConnecting}
                    onClick={handleConnectSimulator}
                    className="p-4 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 hover:from-emerald-600/20 hover:to-slate-800 border border-slate-700 hover:border-emerald-500/60 text-left transition-all group flex flex-col justify-between gap-3 shadow-md active:scale-98"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Zap className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
                        Эмулятор CAN
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-300">
                        Виртуальный Sitrak S7H
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Ознакомление с меню без физического адаптера
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Chip Authenticity Test Section */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-bold text-slate-200">
                      Проверка чипа ELM375 / Microchip PIC18F25K80
                    </h4>
                  </div>
                  {isConnected && (
                    <button
                      id="btn-test-chip"
                      onClick={runChipAuthenticityTest}
                      disabled={isConnecting}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-all shadow"
                    >
                      {isConnecting ? "Проверка..." : "Тест команд"}
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Адаптер <b>ELM375</b> и оригинальный <b>ELM327 v1.5</b> на микроконтроллере <b>PIC18F25K80</b> поддерживают длинные 29-битные J1939 пакеты и калибровки блоков Bosch EDC17 / WABCO EBS3.
                </p>

                {chipTestResult && (
                  <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    chipTestResult.isV15 
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200" 
                      : "bg-amber-950/60 border-amber-500/40 text-amber-200"
                  }`}>
                    <div className="font-bold flex items-center gap-1.5">
                      {chipTestResult.isV15 ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
                      <span>{chipTestResult.chipName}</span>
                    </div>
                    <p>{chipTestResult.details}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: PROTOCOL BRUTE-FORCE & ITERATION SCANNER */}
          {activeTab === "protocol_scan" && (
            <div className="space-y-4 animate-in fade-in">
              {/* Header Control Banner */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-amber-400" />
                    <h3 className="font-bold text-base text-white">
                      Перебор всех протоколов для подключения к ЭБУ
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Автоматический перебор и пинг 12 протоколов (J1939, ISO 15765-4 29/11-bit, KWP2000, K-Line) с поиском активного ответа блоков тягача
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Активный протокол: <b>{device?.protocol || protocol}</b>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-cyan-900/60">
                      CAN Заголовок: <b>{device?.activeHeader || "18DB33F1"}</b>
                    </span>
                    {protocolScanProgress.foundWorkingProtocol && (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Найден: {protocolScanProgress.foundWorkingProtocol.code}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Scan Filter and Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                  {/* Mode Selector */}
                  <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setScanModeFilter("all")}
                      disabled={protocolScanProgress.isScanning}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                        scanModeFilter === "all" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Все (12)
                    </button>
                    <button
                      onClick={() => setScanModeFilter("truck_can")}
                      disabled={protocolScanProgress.isScanning}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                        scanModeFilter === "truck_can" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Грузовой CAN (6)
                    </button>
                    <button
                      onClick={() => setScanModeFilter("k_line")}
                      disabled={protocolScanProgress.isScanning}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                        scanModeFilter === "k_line" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      K-Line (4)
                    </button>
                  </div>

                  {protocolScanProgress.isScanning ? (
                    <button
                      id="btn-cancel-scan"
                      onClick={handleCancelScan}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Остановить перебор</span>
                    </button>
                  ) : (
                    <button
                      id="btn-start-protocol-bruteforce"
                      onClick={() => handleRunProtocolScan(scanModeFilter)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                    >
                      <Zap className="w-4 h-4 text-slate-950" />
                      <span>{isConnected ? "Запустить перебор протоколов" : "Запустить перебор (Демо / Тест)"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Disconnected Notice with Fast-Connect Options */}
              {!isConnected && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Для перебора реального адаптера в автомобиле подключитесь по Bluetooth:</span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleConnectBle}
                      disabled={isConnecting}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] flex items-center gap-1 shadow"
                    >
                      <Bluetooth className="w-3.5 h-3.5" />
                      <span>Bluetooth BLE</span>
                    </button>
                    <button
                      onClick={handleConnectSimulator}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px]"
                    >
                      Эмулятор Sitrak
                    </button>
                  </div>
                </div>
              )}

              {/* Real-Time Progress Bar */}
              {protocolScanProgress.isScanning && (
                <div className="p-4 rounded-xl bg-slate-950/90 border border-amber-500/50 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Идет опрос протокола {protocolScanProgress.currentStepIndex} из {protocolScanProgress.total}...</span>
                    </div>
                    <span className="font-mono text-slate-300 font-bold">
                      {Math.round((protocolScanProgress.currentStepIndex / Math.max(1, protocolScanProgress.total)) * 100)}%
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${(protocolScanProgress.currentStepIndex / Math.max(1, protocolScanProgress.total)) * 100}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono">
                    {protocolScanProgress.summaryMessage}
                  </p>
                </div>
              )}

              {/* Found Match Banner */}
              {protocolScanProgress.foundWorkingProtocol && !protocolScanProgress.isScanning && (
                <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/60 text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>НАЙДЕН РАБОЧИЙ ПРОТОКОЛ: {protocolScanProgress.foundWorkingProtocol.name}</span>
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-900 text-emerald-200 rounded border border-emerald-500/50">
                          {protocolScanProgress.foundWorkingProtocol.elmCommand}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-300/90 mt-1">
                        Блок ЭБУ ответил за <b>{protocolScanProgress.foundWorkingProtocol.pingMs}мс</b> на заголовке <b>{protocolScanProgress.foundWorkingProtocol.recommendedHeader}</b>. Данные ответа: <span className="font-mono bg-emerald-950 px-1 py-0.5 rounded text-emerald-200">{protocolScanProgress.foundWorkingProtocol.ecuReplySnippet}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    id="btn-apply-matched-protocol"
                    onClick={() => handleApplyProtocol(protocolScanProgress.foundWorkingProtocol!)}
                    disabled={isConnecting}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all active:scale-95 shadow flex items-center justify-center gap-2"
                  >
                    {isConnecting && applyingProtocolId === protocolScanProgress.foundWorkingProtocol.id ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Применение и опрос блоков...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Применить и опросить ЭБУ</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Protocol Candidate Cards */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                  <span>Список поддерживаемых протоколов CAN / K-Line ({protocolScanProgress.candidates.length || 12}):</span>
                  <span>Нажмите «Применить» для ручного переключения</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(protocolScanProgress.candidates.length > 0 ? protocolScanProgress.candidates : elmService.getProtocolScanState().candidates.length > 0 ? elmService.getProtocolScanState().candidates : [
                    { id: "j1939_250k", name: "SAE J1939 CAN (29 bit, 250 kbps)", elmCommand: "AT SP B", code: "J1939_250K", busType: "CAN 29-bit", baudRate: "250 kbps", description: "Основной грузовой стандарт SAE J1939. Прямой опрос всех блоков Sitrak S7H / C7H.", recommendedHeader: "18DB33F1", targetSystems: "Bosch EDC17CV44, ZF TraXon, WABCO EBS3, CBCU3", status: "pending" },
                    { id: "iso15765_29_250k", name: "ISO 15765-4 CAN (29 bit, 250 kbps)", elmCommand: "AT SP 9", code: "ISO15765_29BIT_250K", busType: "CAN 29-bit", baudRate: "250 kbps", description: "Дизельный коммерческий стандарт ISO 15765-4. Совместим со всеми версиями чипов ELM.", recommendedHeader: "18DB33F1", targetSystems: "Sinotruk / Sitrak / Shacman / FAW / MAN", status: "pending" },
                    { id: "j1939_500k", name: "SAE J1939 CAN (29 bit, 500 kbps)", elmCommand: "AT SP C", code: "J1939_500K", busType: "CAN 29-bit", baudRate: "500 kbps", description: "Высокоскоростная грузовая шина J1939. Для тягачей Euro-6 и Sitrak C9H.", recommendedHeader: "18DB33F1", targetSystems: "Sitrak C9H, FAST AMT, Scania Euro 6", status: "pending" },
                    { id: "iso15765_29_500k", name: "ISO 15765-4 CAN (29 bit, 500 kbps)", elmCommand: "AT SP 7", code: "ISO15765_29BIT_500K", busType: "CAN 29-bit", baudRate: "500 kbps", description: "Высокоскоростной диагностический протокол UDS over CAN 29-bit.", recommendedHeader: "18DB33F1", targetSystems: "Sinotruk VCU шлюзы", status: "pending" },
                    { id: "iso15765_11_500k", name: "ISO 15765-4 CAN (11 bit, 500 kbps)", elmCommand: "AT SP 6", code: "ISO15765_11BIT_500K", busType: "CAN 11-bit", baudRate: "500 kbps", description: "Стандартный легковой и LCV протокол OBD-II CAN (11-битный ID).", recommendedHeader: "7DF", targetSystems: "Легковые и коммерческие автомобили", status: "pending" },
                    { id: "iso15765_11_250k", name: "ISO 15765-4 CAN (11 bit, 250 kbps)", elmCommand: "AT SP 8", code: "ISO15765_11BIT_250K", busType: "CAN 11-bit", baudRate: "250 kbps", description: "Низкоскоростной 11-битный CAN протокол OBD-II.", recommendedHeader: "7DF", targetSystems: "Вспомогательное оборудование", status: "pending" },
                    { id: "kwp2000_fast", name: "ISO 14230-4 KWP (Fast Init, 10.4 kbps)", elmCommand: "AT SP 5", code: "KWP2000_FAST", busType: "K-Line", baudRate: "10.4 kbps", description: "Диагностика по K-Line (пин 7 OBD). Опрос автономных отопителей.", recommendedHeader: "C133F1", targetSystems: "Webasto Thermo Pro 90, Eberspacher", status: "pending" },
                    { id: "kwp2000_5baud", name: "ISO 14230-4 KWP (5 Baud Init, 10.4 kbps)", elmCommand: "AT SP 4", code: "KWP2000_5BAUD", busType: "K-Line", baudRate: "10.4 kbps", description: "KWP2000 с медленной 5-бодовой инициализацией по K-Line.", recommendedHeader: "C133F1", targetSystems: "Сервисные блоки дополнительного оборудования", status: "pending" },
                    { id: "iso9141_2", name: "ISO 9141-2 (5 Baud Init, 10.4 kbps)", elmCommand: "AT SP 3", code: "ISO9141_2", busType: "K-Line", baudRate: "10.4 kbps", description: "Классический протокол ISO 9141-2 по K/L-линии.", recommendedHeader: "686AF1", targetSystems: "Устаревшие блоки и тахографы", status: "pending" },
                    { id: "j1850_pwm", name: "SAE J1850 PWM (41.6 kbps)", elmCommand: "AT SP 1", code: "J1850_PWM", busType: "J1850", baudRate: "41.6 kbps", description: "Американский стандарт импульсной модуляции.", recommendedHeader: "616AF1", targetSystems: "Шасси Freightliner / International", status: "pending" },
                    { id: "j1850_vpw", name: "SAE J1850 VPW (10.4 kbps)", elmCommand: "AT SP 2", code: "J1850_VPW", busType: "J1850", baudRate: "10.4 kbps", description: "Американский протокол GM / Detroit Diesel.", recommendedHeader: "686AF1", targetSystems: "Detroit Diesel DDEC, Allison", status: "pending" },
                    { id: "auto", name: "ELM327 Auto Protocol Search", elmCommand: "AT SP 0", code: "AUTO", busType: "AUTO", baudRate: "Adaptive", description: "Автоматический поиск протоколов чипом адаптера.", recommendedHeader: "18DB33F1", targetSystems: "Универсальный автоподбор", status: "pending" },
                  ] as ProtocolScanCandidate[]).map((cand) => {
                    const isCurrentActive = (device?.protocol === cand.code || protocol === cand.code);
                    const isApplyingThis = isConnecting && applyingProtocolId === cand.id;
                    return (
                      <div
                        key={cand.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                          cand.status === "matched"
                            ? "bg-emerald-950/40 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30"
                            : cand.status === "testing"
                            ? "bg-amber-950/40 border-amber-500/60 animate-pulse"
                            : cand.status === "unsupported"
                            ? "bg-slate-950/40 border-purple-900/40 opacity-70"
                            : cand.status === "no_response"
                            ? "bg-slate-950/40 border-slate-800 opacity-80"
                            : isCurrentActive
                            ? "bg-slate-950/80 border-cyan-500/50"
                            : "bg-slate-950/60 border-slate-800"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-700">
                                {cand.elmCommand}
                              </span>
                              <span className="font-bold text-xs sm:text-sm text-white">
                                {cand.name}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              {cand.description}
                            </p>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Блоки: <span className="text-slate-400">{cand.targetSystems}</span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0">
                            {cand.status === "matched" ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>ОТВЕТ {cand.pingMs}мс</span>
                              </span>
                            ) : cand.status === "testing" ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1">
                                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                                <span>ТЕСТ...</span>
                              </span>
                            ) : cand.status === "unsupported" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-950/80 text-purple-300 border border-purple-800 flex items-center gap-1">
                                <span>НЕ ПОДДЕРЖАН</span>
                              </span>
                            ) : cand.status === "no_response" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                                <span>НЕТ ОТВЕТА</span>
                              </span>
                            ) : isCurrentActive ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-700 flex items-center gap-1">
                                <span>АКТИВЕН</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-900 text-slate-500 border border-slate-800">
                                ОЖИДАНИЕ
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Extra Snippet / Diagnostics Details */}
                        {cand.ecuReplySnippet && (
                          <div className="p-2 rounded bg-slate-900/90 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 flex items-center justify-between">
                            <span>Ответ ЭБУ: {cand.ecuReplySnippet}</span>
                            <span className="text-[10px] text-slate-400">Header: {cand.recommendedHeader}</span>
                          </div>
                        )}

                        {/* Bottom Actions */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                            <span>Тип: <b className="text-slate-300">{cand.busType}</b></span>
                            <span>Скорость: <b className="text-cyan-400">{cand.baudRate}</b></span>
                          </div>

                          <button
                            id={`btn-apply-${cand.id}`}
                            onClick={() => handleApplyProtocol(cand)}
                            disabled={isConnecting || protocolScanProgress.isScanning}
                            className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 active:scale-95 ${
                              isApplyingThis
                                ? "bg-amber-500 text-slate-950 animate-pulse font-bold"
                                : isCurrentActive
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/30"
                                : cand.status === "matched"
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow"
                                : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                            }`}
                          >
                            {isApplyingThis ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Применение...</span>
                              </>
                            ) : isCurrentActive ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                                <span>Активен (Применить снова)</span>
                              </>
                            ) : (
                              <span>Применить</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Educational Help / Sitrak Tips */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs text-slate-300">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-400" />
                  <span>Рекомендации по протоколам для тягачей Sitrak S7H / C7H:</span>
                </div>
                <ul className="space-y-1.5 list-disc pl-5 text-slate-400 leading-relaxed">
                  <li>
                    <b>SAE J1939 (AT SP B)</b> — основной протокол тягачей Sinotruk / MAN. Все 6 блоков (Bosch EDC17CV44, ZF TraXon 12TX, WABCO EBS3, CBCU3, Приборная панель ICU и SCR DeNOx) обмениваются 29-битными пакетами на скорости 250 kbps.
                  </li>
                  <li>
                    <b>ISO 15765-4 (AT SP 9)</b> — резервный протокол для недорогих адаптеров ELM327, у которых прошивка не знает команду <code className="text-amber-300">AT SP B</code>. Позволяет опрашивать блоки по той же 29-битной шине 250k.
                  </li>
                  <li>
                    <b>K-Line (AT SP 5)</b> — используется для прямой диагностики автономного отопителя кабины (Webasto Thermo Pro 90 / Eberspacher) через пин 7 диагностической колодки OBD.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB: ECU CONNECTION DOCTOR & AUTO-SYNC */}
          {activeTab === "ecu_doctor" && (
            <div className="space-y-4 animate-in fade-in">
              {/* Header Status Banner */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-sm sm:text-base text-white">
                      Мастер согласования и статус связи с ЭБУ Sitrak
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Прямой опрос блоков управления тягача по 29-битной CAN-шине (SAE J1939 / ISO 15765-4)
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Протокол: <b>{device?.protocol || protocol}</b>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-cyan-900/60">
                      CAN Заголовок: <b>{device?.activeHeader || "18DB33F1 (Heavy Duty)"}</b>
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      ecuScanResults.some(r => r.status === "online")
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/50"
                        : "bg-red-950/80 text-red-300 border border-red-500/50"
                    }`}>
                      Онлайн: {ecuScanResults.filter(r => r.status === "online").length} из {ecuScanResults.length}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    id="btn-scan-all-ecus"
                    onClick={handleScanEcus}
                    disabled={isScanningEcus || isConnecting}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningEcus ? "animate-spin" : ""}`} />
                    <span>{isScanningEcus ? "Опрос шины CAN..." : "Опросить все блоки"}</span>
                  </button>

                  <button
                    id="btn-auto-negotiate-protocol"
                    onClick={() => handleAutoNegotiate()}
                    disabled={isScanningEcus || isConnecting}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Авто-подбор протокола</span>
                  </button>
                </div>
              </div>

              {negotiationResult && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  negotiationResult.success
                    ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-200"
                    : "bg-amber-950/60 border-amber-500/50 text-amber-200"
                }`}>
                  {negotiationResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">{negotiationResult.success ? "Успешно: " : "Внимание: "}</span>
                    <span>{negotiationResult.message}</span>
                  </div>
                </div>
              )}

              {/* ECU Node Cards */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                  <span>Блоки управления тягача (ECU List):</span>
                  <span>Нажмите «Пинг» для точечного теста адреса</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {ecuScanResults.map((ecu) => (
                    <div
                      key={ecu.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                        ecu.status === "online"
                          ? "bg-slate-950/80 border-emerald-500/50 shadow-sm"
                          : ecu.status === "scanning"
                          ? "bg-slate-950/80 border-amber-500/50 animate-pulse"
                          : "bg-slate-950/50 border-slate-800 opacity-90"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                            <span>{ecu.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {ecu.diagnosticNotes}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {ecu.status === "online" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>ОНЛАЙН {ecu.pingMs ? `(${ecu.pingMs}мс)` : ""}</span>
                            </span>
                          ) : ecu.status === "scanning" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                              <span>ОПРОС...</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-slate-500" />
                              <span>НЕТ ОТВЕТА</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details & VIN */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                        <div className="text-slate-400">
                          <span>Адрес: <b className="text-slate-300">{ecu.addressHex}</b></span>
                          <span className="ml-2">Header: <b className="text-cyan-400">{ecu.headerHex}</b></span>
                          {ecu.vin && (
                            <div className="text-emerald-400 font-bold text-[10px] mt-0.5">
                              VIN: {ecu.vin}
                            </div>
                          )}
                          {ecu.swVersion && (
                            <div className="text-slate-400 text-[10px]">
                              ПО: {ecu.swVersion}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleProbeSingleEcu(ecu.code)}
                            disabled={isScanningEcus || isConnecting}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-sans text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <Radio className="w-3 h-3 text-emerald-400" />
                            <span>Опросить</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gauge Sweep Diagnostic Test */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span>Тест стрелок и индикаторов приборной панели (Gauge Sweep)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Отправка тестового цикла по шине ICU (тахометр, спидометр, давление контуров от 0 до максимума).
                  </p>
                </div>
                <button
                  id="btn-gauge-sweep-modal"
                  onClick={handleRunGaugeSweep}
                  disabled={isConnecting}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow shrink-0 active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Запуск теста стрелок</span>
                </button>
              </div>

              {/* Quick CAN Diagnostic Header Switcher */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Быстрое переключение диагностических заголовков CAN (AT SH):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleSetHeader("18DB33F1")}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-left text-xs transition-colors"
                  >
                    <div className="font-bold text-cyan-300 font-mono">18DB33F1</div>
                    <div className="text-[10px] text-slate-400">Broadcast J1939 (Все ЭБУ)</div>
                  </button>

                  <button
                    onClick={() => handleSetHeader("18DA00F1")}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left text-xs transition-colors"
                  >
                    <div className="font-bold text-amber-300 font-mono">18DA00F1</div>
                    <div className="text-[10px] text-slate-400">Bosch EDC17 (Двигатель)</div>
                  </button>

                  <button
                    onClick={() => handleSetHeader("18DA03F1")}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left text-xs transition-colors"
                  >
                    <div className="font-bold text-purple-300 font-mono">18DA03F1</div>
                    <div className="text-[10px] text-slate-400">ZF TraXon (АКПП)</div>
                  </button>

                  <button
                    onClick={() => handleSetHeader("18DA0BF1")}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left text-xs transition-colors"
                  >
                    <div className="font-bold text-emerald-300 font-mono">18DA0BF1</div>
                    <div className="text-[10px] text-slate-400">WABCO EBS3 (Тормоза)</div>
                  </button>
                </div>
              </div>

              {/* Troubleshooting Guide for ECU communication */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4" />
                  <span>Почему приложение не связывается с блоками Sitrak:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">1</span>
                      <span>Зажигание тягача выключено</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      При выключенном ключе зажигания питание 24V поступает на разъем OBD (диод адаптера горит), но сами блоки управления обесточены. <b>Поверните ключ в положение ON</b>.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">2</span>
                      <span>Чип ELM327 v2.1 (Клон)</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Урезанные чипы v2.1 не умеют работать с 29-битными CAN-пакетами и скоростью 250k. Для Sitrak требуется адаптер с чипом <b>Microchip PIC18F25K80 (v1.5 / ELM375)</b>.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">3</span>
                      <span>Предохранитель разъема OBD (F12 / F24)</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Проверьте предохранитель <b>F12 (10A)</b> в блоке предохранителей кабины. Если он перегорел, в разъеме отсутствует напряжение 24V.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">4</span>
                      <span>Неправильный протокол CAN</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Нажмите кнопку <b>«Авто-подбор протокола»</b> вверху, чтобы приложение поочередно протестировало SAE J1939 250k, ISO 15765-4 29-bit и ISO 15765-4 11-bit.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DETAILED BLUETOOTH CLASSIC GUIDE */}
          {activeTab === "classic_guide" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs">
                <div className="font-bold text-sm text-white flex items-center gap-2 mb-1">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  Пошаговая инструкция для адаптеров Bluetooth Classic (ELM327 / ELM375)
                </div>
                Bluetooth Classic использует профиль SPP (Serial Port Profile) с защитным PIN-кодом. Выполните 3 простых шага:
              </div>

              {/* Step 1 */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-xs font-black">1</span>
                  <span>Подключение питания и зажигание Sitrak</span>
                </div>
                <div className="pl-8 space-y-1.5 text-xs text-slate-300">
                  <p>
                    Вставьте адаптер в диагностический 16-пиновый разъем OBD2 Sitrak (справа под рулевой колонкой или в лючке предохранителей).
                  </p>
                  <p className="text-amber-300 font-semibold">
                    &bull; Убедитесь, что загорелся красный светодиод <b>POWER (24V)</b> на адаптере.
                  </p>
                  <p className="text-emerald-300 font-semibold">
                    &bull; Поверните ключ зажигания Sitrak в положение <b>ON</b> (приборная панель включена), чтобы ЭБУ двигателя и КПП вышли на связь.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-xs font-black">2</span>
                  <span>Сопряжение в настройках телефона (Bluetooth)</span>
                </div>
                <div className="pl-8 space-y-2 text-xs text-slate-300">
                  <p>
                    Откройте <b>Настройки телефона &rarr; Bluetooth</b> и включите поиск новых устройств.
                  </p>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-700/80 space-y-1">
                    <div className="font-semibold text-white">Имя устройства в списке:</div>
                    <div className="font-mono text-cyan-300 font-bold">OBDII / ELM327 / Viecar / SPP-Dev</div>
                    <div className="font-semibold text-white mt-2">Пароль сопряжения (PIN):</div>
                    <div className="font-mono text-amber-300 font-bold text-sm">1234 <span className="text-slate-400 font-normal text-xs">(или 0000)</span></div>
                  </div>
                  <p className="text-slate-400">
                    После сопряжения устройство переместится в раздел <i>«Сохраненные / Сопряженные устройства»</i>.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-xs font-black">3</span>
                  <span>Подключение в приложении Sitrak</span>
                </div>
                <div className="pl-8 space-y-3 text-xs text-slate-300">
                  <p>
                    Нажмите кнопку <b>«Подключить Bluetooth Classic»</b> ниже. В системном диалоге Chrome выберите сопряженный адаптер <b>OBDII</b>.
                  </p>
                  <button
                    onClick={handleConnectClassic}
                    disabled={isConnecting}
                    className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isConnecting ? "Подключение..." : "Подключить Bluetooth Classic сейчас"}</span>
                  </button>
                </div>
              </div>

              {/* Note on Android APK / PWA for Classic Bluetooth */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <b className="text-slate-200">Совет для смартфонов Android:</b> Вы также можете скачать и установить приложение как автономный <b>APK / PWA</b> (кнопка <i>«Скачать APK»</i> в верхней панели) для прямого доступа к сопряженным Bluetooth Classic устройствам без браузерных диалогов.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TROUBLESHOOTING GUIDE */}
          {activeTab === "troubleshoot" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                <div className="font-bold text-sm text-white flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Почему ELM может не соединяться и как это исправить:
                </div>
                Проверьте следующие пункты:
              </div>

              {/* Point 1: Classic Bluetooth vs BLE */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black">1</span>
                  <span>Classic Bluetooth против BLE</span>
                </div>
                <div className="pl-8 space-y-2 text-xs text-slate-300">
                  <p>
                    Если ваш адаптер требует PIN-код при сопряжении в телефоне (1234) — это <b>Bluetooth Classic</b>. Для него используйте режим <b>«Bluetooth Classic (SPP)»</b>. Кнопка «Bluetooth BLE» предназначена только для новых чипов BLE 4.0/5.0 без PIN-кода.
                  </p>
                </div>
              </div>

              {/* Point 2: 24V OBD2 Power & Ignition */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black">2</span>
                  <span>Питание 24V в разъеме OBD2 Sitrak и зажигание</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside pl-8">
                  <li>На тягаче Sitrak S7H / C7H диагностический разъем находится под заглушкой справа от рулевой колонки.</li>
                  <li>Убедитесь, что на адаптере <b>горит красный светодиод POWER</b> (в разъеме OBD Sitrak напряжение 24 Вольта — пин 16 = +24V, пины 4, 5 = Земля).</li>
                  <li><b>Обязательно включите зажигание (положение ключа ON)</b> или запустите двигатель, иначе блоки управления EDC17 и WABCO обесточены и не отвечают на CAN-запросы.</li>
                </ul>
              </div>

              {/* Point 3: Baud Rate */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black">3</span>
                  <span>Скорость передачи (Baud Rate)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  Стандартные Classic адаптеры работают на скорости <b>38 400 bps</b>, а скоростные ELM375 / STN — на <b>115 200 bps</b>.
                  Если при подключении возникает ошибка тайм-аута, переключите скорость в выпадающем списке на первой вкладке.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: DIRECT AT COMMANDS */}
          {activeTab === "terminal" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Быстрые команды для проверки отклика ELM375:</span>
                </label>

                {/* Quick AT buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleSendCustomAt("AT Z")}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-amber-300 text-left transition-colors"
                  >
                    <div className="font-bold">AT Z</div>
                    <div className="text-[10px] text-slate-400">Сброс чипа</div>
                  </button>

                  <button
                    onClick={() => handleSendCustomAt("AT RV")}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-300 text-left transition-colors"
                  >
                    <div className="font-bold">AT RV</div>
                    <div className="text-[10px] text-slate-400">Замер 24V</div>
                  </button>

                  <button
                    onClick={() => handleSendCustomAt("ATI")}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-emerald-300 text-left transition-colors"
                  >
                    <div className="font-bold">ATI</div>
                    <div className="text-[10px] text-slate-400">Версия ELM</div>
                  </button>

                  <button
                    onClick={() => handleSendCustomAt("AT SP B")}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-purple-300 text-left transition-colors"
                  >
                    <div className="font-bold">AT SP B</div>
                    <div className="text-[10px] text-slate-400">J1939 250k</div>
                  </button>
                </div>

                {/* Input box */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={customAtCmd}
                    onChange={(e) => setCustomAtCmd(e.target.value)}
                    placeholder="Введите AT команду (например ATE0, AT DP, 010C)..."
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendCustomAt(customAtCmd);
                    }}
                  />
                  <button
                    onClick={() => handleSendCustomAt(customAtCmd)}
                    disabled={isConnecting}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Отправить</span>
                  </button>
                </div>

                {/* Response preview */}
                {lastCmdResponse && (
                  <div className="p-3 bg-black/60 border border-slate-800 rounded-lg font-mono text-xs text-emerald-400 space-y-1">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Ответ адаптера:</div>
                    <div className="whitespace-pre-wrap">{lastCmdResponse}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Поддержка Bluetooth Classic (SPP 1234) и BLE 4.0/5.0</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal as TerminalIcon, 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  Zap, 
  ArrowDown, 
  HelpCircle,
  Layers,
  Code
} from "lucide-react";
import { TerminalMessage } from "../types";
import { elmService } from "../services/elmAdapterService";

interface TerminalViewProps {
  isConnected: boolean;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ isConnected }) => {
  const [messages, setMessages] = useState<TerminalMessage[]>([]);
  const [inputCmd, setInputCmd] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = elmService.onTerminal((msg) => {
      setMessages((prev) => [...prev.slice(-150), msg]);
    });
    return unsub;
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (cmdToSend?: string) => {
    const target = (cmdToSend || inputCmd).trim();
    if (!target) return;

    setIsSending(true);
    try {
      await elmService.sendCommand(target);
      if (!cmdToSend) setInputCmd("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLog = () => {
    const text = messages.map((m) => `[${m.timestamp}] ${m.direction.toUpperCase()}: ${m.text}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const QUICK_MACROS = [
    { label: "AT Z", desc: "Сброс ELM327", cmd: "AT Z" },
    { label: "AT SP B", desc: "J1939 250k (Sitrak)", cmd: "AT SP B" },
    { label: "AT RV", desc: "Вольтаж сети 24V", cmd: "AT RV" },
    { label: "AT DP", desc: "Текущий протокол", cmd: "AT DP" },
    { label: "18FECA00", desc: "DTC Двигателя (DM1)", cmd: "18FECA00" },
    { label: "18FEEE00", desc: "Температура ОЖ/Масла", cmd: "18FEEE00" },
    { label: "18FEF200", desc: "Расход топлива J1939", cmd: "18FEF200" },
    { label: "010C", desc: "Обороты RPM (OBD2)", cmd: "010C" },
    { label: "0100", desc: "Тест PIDs (Mode 01)", cmd: "0100" },
    { label: "04", desc: "Сброс ошибок DTC", cmd: "04" },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 pb-12">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Консоль AT/CAN команд ELM327 / ELM375
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Прямой обмен шестнадцатеричными кадрами с шиной CAN J1939 тягача Sitrak
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLog}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
            title="Скопировать лог в буфер обмена"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Скопировано!" : "Копировать"}</span>
          </button>
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
            title="Очистить экран"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Очистить</span>
          </button>
        </div>
      </div>

      {/* Quick Macros Ribbon */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Быстрые макросы для Sitrak S7H / J1939:
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_MACROS.map((m, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(m.cmd)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-left shrink-0 transition-all text-xs font-mono group active:scale-95 shadow"
            >
              <div className="font-bold text-cyan-300 group-hover:text-cyan-200">{m.label}</div>
              <div className="text-[10px] text-slate-400 font-sans">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Display */}
      <div 
        ref={logContainerRef}
        className="w-full h-80 sm:h-96 bg-slate-950 rounded-2xl p-4 border border-slate-800 font-mono text-xs overflow-y-auto space-y-1.5 shadow-2xl scrollbar-thin scrollbar-thumb-slate-800"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
            <TerminalIcon className="w-8 h-8 opacity-40" />
            <p>Консоль готова к приему команд. Введите команду в поле ниже или выберите макрос.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-slate-500 text-[10px] shrink-0 select-none">
                [{m.timestamp}]
              </span>

              {m.direction === "tx" && (
                <span className="text-amber-400 font-bold shrink-0">TX ➜</span>
              )}
              {m.direction === "rx" && (
                <span className="text-emerald-400 font-bold shrink-0">RX 🡨</span>
              )}
              {m.direction === "system" && (
                <span className="text-blue-400 font-bold shrink-0">SYS ℹ</span>
              )}
              {m.direction === "error" && (
                <span className="text-red-400 font-bold shrink-0">ERR ⚠</span>
              )}

              <div className="flex-1 break-all">
                <span className={`${
                  m.direction === "tx"
                    ? "text-amber-300 font-semibold"
                    : m.direction === "rx"
                    ? "text-emerald-300"
                    : m.direction === "error"
                    ? "text-red-300"
                    : "text-blue-300"
                }`}>
                  {m.text}
                </span>
                {m.description && (
                  <span className="text-slate-500 text-[10px] ml-2 italic font-sans">
                    // {m.description}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Command Line */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            id="input-terminal-cmd"
            type="text"
            placeholder="Введите команду (например: AT Z, AT RV, 18FECA00, 010C)..."
            value={inputCmd}
            onChange={(e) => setInputCmd(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 uppercase shadow-inner"
          />
        </div>

        <button
          id="btn-terminal-send"
          type="submit"
          disabled={isSending || !inputCmd.trim()}
          className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Отправить</span>
        </button>
      </form>
    </div>
  );
};

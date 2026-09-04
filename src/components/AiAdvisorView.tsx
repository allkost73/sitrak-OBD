import React, { useState } from "react";
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  HelpCircle, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  Zap,
  Layers
} from "lucide-react";
import { DtcFault, TelemetryData, TruckProfile } from "../types";

interface AiAdvisorViewProps {
  dtcs: DtcFault[];
  telemetry: TelemetryData;
  profile: TruckProfile;
  initialQuestion?: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export const AiAdvisorView: React.FC<AiAdvisorViewProps> = ({
  dtcs,
  telemetry,
  profile,
  initialQuestion,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "ai",
      text: `Здравствуйте! Я — ваш эксперт по диагностике и ремонту тяжелых китайских грузовиков **SITRAK S7H / C7H** (двигатели Sinotruk MC11/MC13 MAN D26, ЭБУ Bosch EDC17CV44, АКПП ZF TraXon, тормоза WABCO EBS3, блоки SCR DeNOx и CBCU).\n\nЯ проанализировал текущие данные вашего тягача:\n- **Модель:** ${profile.model}\n- **Двигатель:** ${profile.engine} (${profile.horsepower} л.с.)\n- **Активных ошибок DTC:** ${dtcs.filter((d) => d.status === "active").length} шт.\n- **Напряжение сети:** ${telemetry.batteryVoltage}V\n- **Давление наддува:** ${telemetry.boostPressure} Bar\n\nЗадайте любой вопрос по неисправностям, электрике, калибровкам или выберите готовый сценарий ниже.`,
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour12: false, hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState(initialQuestion || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleAskQuestion = async (questionText?: string) => {
    const q = (questionText || inputQuery).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour12: false, hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          truckModel: profile.model,
          engine: profile.engine,
          dtcList: dtcs,
          sensorSnapshot: {
            engineRpm: telemetry.engineRpm,
            boostPressure: telemetry.boostPressure,
            railPressure: telemetry.railPressure,
            oilPressure: telemetry.oilPressure,
            coolantTemp: telemetry.coolantTemp,
            adblueLevel: telemetry.adblueLevel,
            noxOutlet: telemetry.noxOutlet,
            batteryVoltage: telemetry.batteryVoltage,
          },
          userQuestion: q,
        }),
      });

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: "msg-" + (Date.now() + 1),
        sender: "ai",
        text: data.analysis || "Ответ получен.",
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour12: false, hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: "msg-err-" + Date.now(),
        sender: "ai",
        text: "Произошла ошибка при обращении к серверу диагностики. Проверьте соединение с интернетом.",
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour12: false, hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const QUICK_QUESTIONS = [
    "Почему горит ошибка датчика NOx (SPN 3226 FMI 9) и как избежать ограничения мощности на Sitrak?",
    "Тягач дергается при трогании с места. Как правильно обучить сцепление ZF TraXon?",
    "Как выполнить регулировку клапанов на двигателе MC13 (MAN D26) и какие зазоры?",
    "Пропала тяга под нагрузкой, ошибка по низкому давлению в рампе Common Rail.",
  ];

  return (
    <div className="space-y-4 sm:space-y-5 pb-12">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Интеллектуальный AI-Автомастер Sitrak
            </h2>
            <p className="text-xs text-emerald-300/80">
              Глубокий анализ телеметрии CAN J1939, проводки, датчиков и официальных мануалов Sinotruk
            </p>
          </div>
        </div>

        <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-950/90 border border-emerald-500/30 text-emerald-300">
          Gemini 2.5 Flash Engine
        </div>
      </div>

      {/* Quick Question Prompts */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Частые вопросы по Sitrak S7H / MC13:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUICK_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAskQuestion(q)}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left text-xs text-slate-200 transition-all flex items-start gap-2 group active:scale-98 shadow"
            >
              <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <span className="line-clamp-2">{q}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Dialogue Stream */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${
              m.sender === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              m.sender === "user" 
                ? "bg-amber-500/20 border border-amber-500/30 text-amber-400" 
                : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
            }`}>
              {m.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-md ${
              m.sender === "user"
                ? "bg-amber-600/90 text-white rounded-tr-none"
                : "bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none"
            }`}>
              <div className="flex items-center justify-between gap-4 mb-1.5 opacity-60 text-[10px]">
                <span className="font-bold uppercase tracking-wider">
                  {m.sender === "user" ? "Водитель / Механик" : "AI Инженер Sitrak"}
                </span>
                <span>{m.timestamp}</span>
              </div>
              <div className="whitespace-pre-line font-sans">
                {m.text}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center animate-spin">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="bg-slate-950 border border-slate-800 text-xs text-emerald-300 p-3 rounded-2xl animate-pulse">
              AI анализирует диагностические данные Sitrak S7H и формирует рекомендации...
            </div>
          </div>
        )}
      </div>

      {/* Input query form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAskQuestion();
        }}
        className="flex items-center gap-2"
      >
        <input
          id="input-ai-query"
          type="text"
          placeholder="Задайте вопрос по ремонту, ошибкам или калибровкам Sitrak..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
        />
        <button
          id="btn-ai-send"
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Спросить</span>
        </button>
      </form>
    </div>
  );
};

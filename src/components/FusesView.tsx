import React, { useState, useMemo } from "react";
import { 
  Search, 
  Zap, 
  Cpu, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Filter, 
  X, 
  Info, 
  Copy, 
  Check, 
  Sliders, 
  ShieldAlert, 
  Wrench, 
  BatteryCharging, 
  ArrowRight,
  Flame,
  Truck,
  Eye
} from "lucide-react";
import { DtcFault, FuseCategory, FuseItem, FuseBoxLocation, RelayItem } from "../types";
import { SITRAK_FUSES, SITRAK_RELAYS, FUSE_COLOR_MAP } from "../data/fuseData";

interface FusesViewProps {
  dtcs: DtcFault[];
  onNavigateToDtc?: () => void;
  onAskAiForFuse?: (fuseName: string, desc: string) => void;
}

export const FusesView: React.FC<FusesViewProps> = ({
  dtcs,
  onNavigateToDtc,
  onAskAiForFuse,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<FuseBoxLocation | "all">("cabin_main");
  const [selectedCategory, setSelectedCategory] = useState<FuseCategory | "all">("all");
  const [selectedFuse, setSelectedFuse] = useState<FuseItem | null>(null);
  const [selectedRelay, setSelectedRelay] = useState<RelayItem | null>(null);
  const [onlyShowDtcRelated, setOnlyShowDtcRelated] = useState(false);
  const [copied, setCopied] = useState(false);

  // Active DTC codes set for fast cross-referencing
  const activeDtcCodes = useMemo(() => {
    return new Set<string>(dtcs.filter((d) => d.status === "active").map((d) => d.code));
  }, [dtcs]);

  // Fuses related to currently active DTCs
  const dtcRelatedFuseIds = useMemo(() => {
    const ids = new Set<string>();
    const activeList = Array.from(activeDtcCodes);
    SITRAK_FUSES.forEach((fuse) => {
      if (fuse.relatedDtcCodes) {
        fuse.relatedDtcCodes.forEach((code) => {
          if (activeList.some((active: string) => active.includes(code) || code.includes(active))) {
            ids.add(fuse.id);
          }
        });
      }
      // Also match by ECU type
      if (fuse.ecuConnection && dtcs.some((d) => d.status === "active" && d.ecu === fuse.ecuConnection)) {
        ids.add(fuse.id);
      }
    });
    return ids;
  }, [activeDtcCodes, dtcs]);

  // Filtered Fuses
  const filteredFuses = useMemo(() => {
    return SITRAK_FUSES.filter((fuse) => {
      // Location filter
      if (selectedLocation !== "all" && fuse.location !== selectedLocation) {
        return false;
      }
      // Category filter
      if (selectedCategory !== "all" && fuse.category !== selectedCategory) {
        return false;
      }
      // DTC filter
      if (onlyShowDtcRelated && !dtcRelatedFuseIds.has(fuse.id)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSlot = fuse.slot.toLowerCase().includes(q);
        const matchName = fuse.circuitName.toLowerCase().includes(q);
        const matchDesc = fuse.description.toLowerCase().includes(q);
        const matchRating = `${fuse.ratingAmps}a`.includes(q) || `${fuse.ratingAmps}` === q;
        const matchSymptoms = fuse.symptomsIfBlown.some((s) => s.toLowerCase().includes(q));
        const matchWire = fuse.wireColor?.toLowerCase().includes(q) || false;
        const matchDtc = fuse.relatedDtcCodes?.some((d) => d.toLowerCase().includes(q)) || false;

        return matchSlot || matchName || matchDesc || matchRating || matchSymptoms || matchWire || matchDtc;
      }
      return true;
    });
  }, [searchQuery, selectedLocation, selectedCategory, onlyShowDtcRelated, dtcRelatedFuseIds]);

  // Filtered Relays
  const filteredRelays = useMemo(() => {
    if (selectedLocation === "battery_box" && selectedCategory !== "all") {
      return [];
    }
    return SITRAK_RELAYS.filter((relay) => {
      if (onlyShowDtcRelated) return false;
      if (selectedCategory !== "all" && selectedCategory !== "power_relays") {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSlot = relay.slot.toLowerCase().includes(q);
        const matchName = relay.name.toLowerCase().includes(q);
        const matchDesc = relay.description.toLowerCase().includes(q);
        const matchLoad = relay.loadCircuit.toLowerCase().includes(q);
        const matchSymptoms = relay.symptomsIfFailed.some((s) => s.toLowerCase().includes(q));
        return matchSlot || matchName || matchDesc || matchLoad || matchSymptoms;
      }
      return true;
    });
  }, [searchQuery, selectedCategory, selectedLocation, onlyShowDtcRelated]);

  const handleCopyFuseList = () => {
    const listText = filteredFuses.map((f) => `[${f.slot}] ${f.ratingAmps}A - ${f.circuitName}\nСимптомы: ${f.symptomsIfBlown.join("; ")}`).join("\n\n");
    navigator.clipboard.writeText(listText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Схема и распиновка блока предохранителей Sitrak S7H
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Интерактивная карта предохранителей, силовых реле K1-K12 и силовых вставок Mega Fuse АКБ
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dtcRelatedFuseIds.size > 0 && (
            <button
              onClick={() => {
                setOnlyShowDtcRelated(!onlyShowDtcRelated);
                setSelectedCategory("all");
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                onlyShowDtcRelated
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-red-950/80 border border-red-500/50 text-red-300 hover:bg-red-900/60"
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>
                {onlyShowDtcRelated ? "Показаны по DTC" : `Связано с DTC (${dtcRelatedFuseIds.size})`}
              </span>
            </button>
          )}

          <button
            onClick={handleCopyFuseList}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
            title="Скопировать перечень"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? "Скопировано!" : "Копировать"}</span>
          </button>
        </div>
      </div>

      {/* Location Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => {
            setSelectedLocation("cabin_main");
            setSelectedCategory("all");
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedLocation === "cabin_main"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Основной блок в кабине (F1–F32)</span>
        </button>

        <button
          onClick={() => {
            setSelectedLocation("cabin_relays");
            setSelectedCategory("all");
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedLocation === "cabin_relays"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Блок силовых реле (K1–K12)</span>
        </button>

        <button
          onClick={() => {
            setSelectedLocation("battery_box");
            setSelectedCategory("all");
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedLocation === "battery_box"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <BatteryCharging className="w-4 h-4" />
          <span>Силовой блок в ящике АКБ (MF1–MF5)</span>
        </button>

        <button
          onClick={() => setSelectedLocation("all")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedLocation === "all"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Все блоки</span>
        </button>
      </div>

      {/* Search and Category Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="input-fuse-search"
            type="text"
            placeholder="Поиск предохранителя по номеру (F1, K3), названию цепи (EDC, ABS, Печка, Мочевина, Фары, Прикуриватель), номиналу (20A) или симптомам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { id: "all", label: "Все цепи" },
            { id: "engine_ecu", label: "Двигатель и ЭБУ" },
            { id: "transmission_brakes", label: "Трансмиссия и EBS" },
            { id: "scr_denox", label: "Экология (AdBlue / NOx)" },
            { id: "cabin_comfort", label: "Кабина и Комфорт" },
            { id: "lighting_signals", label: "Свет и Сигналы" },
            { id: "power_relays", label: "Реле K1–K12" },
            { id: "battery_power", label: "Силовые АКБ Mega" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all font-medium ${
                selectedCategory === cat.id
                  ? "bg-slate-800 text-amber-400 border border-amber-500/40 shadow-inner"
                  : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Interactive Fuse Matrix */}
      {selectedLocation === "cabin_main" && !searchQuery && selectedCategory === "all" && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Интерактивная панель блока предохранителей (Пассажирская консоль Sitrak S7H)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Нажмите на слот для проверки симптомов и точек замера
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/90 overflow-x-auto shadow-inner">
            <div className="min-w-[640px] space-y-2">
              {/* Row Legend */}
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 px-2 pb-1 border-b border-slate-900">
                <span>РЯДЫ ГНЕЗД A–E (БЛОК РАСПРЕДЕЛЕНИЯ ПИТАНИЯ)</span>
                <span>СТАНДАРТ MINI BLADE (ЦВЕТОВАЯ КОДИРОВКА DIN)</span>
              </div>

              {/* Grid of Fuses */}
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2.5">
                {SITRAK_FUSES.filter((f) => f.location === "cabin_main").map((fuse) => {
                  const isDtcLinked = dtcRelatedFuseIds.has(fuse.id);
                  const isSelected = selectedFuse?.id === fuse.id;
                  const colorTheme = FUSE_COLOR_MAP[fuse.colorCode] || FUSE_COLOR_MAP.yellow;

                  return (
                    <button
                      key={fuse.id}
                      id={`fuse-slot-${fuse.slot}`}
                      onClick={() => {
                        setSelectedFuse(fuse);
                        setSelectedRelay(null);
                      }}
                      className={`relative p-2.5 rounded-xl border flex flex-col items-center justify-between gap-1.5 transition-all text-center group active:scale-95 ${
                        isSelected
                          ? "ring-2 ring-amber-400 bg-slate-800 border-amber-400 shadow-lg"
                          : isDtcLinked
                          ? "bg-red-950/70 border-red-500 text-red-200 animate-pulse"
                          : "bg-slate-900/90 border-slate-700/60 hover:border-amber-500/60 hover:bg-slate-800"
                      }`}
                    >
                      {isDtcLinked && (
                        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-600 text-[9px] font-black text-white flex items-center justify-center shadow">
                          !
                        </span>
                      )}

                      <div className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-amber-300">
                        {fuse.slot}
                      </div>

                      {/* Fuse Body Representation */}
                      <div className={`w-8 h-8 rounded-lg ${colorTheme.bg} ${colorTheme.border} border flex items-center justify-center font-mono font-black text-xs ${colorTheme.text} shadow-inner`}>
                        {fuse.ratingAmps}A
                      </div>

                      <div className="text-[9px] font-medium text-slate-300 line-clamp-1 w-full text-center">
                        {fuse.circuitName.split(" ")[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout: Fuse Cards Grid + Detailed Inspector Sidebar/Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List of Fuses and Relays (2 columns on lg) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Найдено: <b>{filteredFuses.length}</b> предохранителей
              {filteredRelays.length > 0 && `, ${filteredRelays.length} реле`}
            </span>
            <span className="text-[11px] text-slate-500">
              Цветовая маркировка: 10A (Красный), 15A (Синий), 20A (Желтый), 25A (Белый), 30A (Зеленый)
            </span>
          </div>

          {filteredFuses.length === 0 && filteredRelays.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <Info className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">Ничего не найдено</h4>
              <p className="text-xs text-slate-400">
                Попробуйте изменить поисковый запрос или сбросить фильтры категорий.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Fuses Cards */}
              {filteredFuses.map((fuse) => {
                const isDtcLinked = dtcRelatedFuseIds.has(fuse.id);
                const isSelected = selectedFuse?.id === fuse.id;
                const colorTheme = FUSE_COLOR_MAP[fuse.colorCode] || FUSE_COLOR_MAP.yellow;

                return (
                  <div
                    key={fuse.id}
                    id={`card-fuse-${fuse.slot}`}
                    onClick={() => {
                      setSelectedFuse(fuse);
                      setSelectedRelay(null);
                    }}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md ${
                      isSelected
                        ? "bg-slate-800 border-amber-400 ring-1 ring-amber-400"
                        : isDtcLinked
                        ? "bg-red-950/40 border-red-500/60 hover:bg-red-950/60"
                        : "bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Rating Badge */}
                      <div className={`w-12 h-12 rounded-xl shrink-0 ${colorTheme.bg} ${colorTheme.border} border flex flex-col items-center justify-center font-mono shadow`}>
                        <span className="text-[10px] font-bold text-slate-400">{fuse.slot}</span>
                        <span className={`text-xs font-black ${colorTheme.text}`}>{fuse.ratingAmps}A</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            {fuse.circuitName}
                          </h4>
                          {isDtcLinked && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white animate-pulse">
                              Связано с ошибкой DTC
                            </span>
                          )}
                          {fuse.ecuConnection && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                              {fuse.ecuConnection}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-1">
                          {fuse.description}
                        </p>

                        <div className="text-[11px] text-amber-400/90 flex items-center gap-1.5 pt-0.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span className="line-clamp-1">Симптом: {fuse.symptomsIfBlown[0]}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                      <span className="text-[10px] font-mono text-slate-500">
                        {fuse.location === "cabin_main" ? "Кабина" : fuse.location === "battery_box" ? "АКБ" : "Реле"}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFuse(fuse);
                          setSelectedRelay(null);
                        }}
                        className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-bold"
                      >
                        <span>Инфо</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Relays Cards */}
              {filteredRelays.map((relay) => {
                const isSelected = selectedRelay?.id === relay.id;

                return (
                  <div
                    key={relay.id}
                    id={`card-relay-${relay.slot}`}
                    onClick={() => {
                      setSelectedRelay(relay);
                      setSelectedFuse(null);
                    }}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md ${
                      isSelected
                        ? "bg-slate-800 border-amber-400 ring-1 ring-amber-400"
                        : "bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Relay Badge */}
                      <div className="w-12 h-12 rounded-xl shrink-0 bg-purple-500/20 border border-purple-500/40 flex flex-col items-center justify-center font-mono shadow text-purple-300">
                        <span className="text-[10px] font-bold text-slate-400">РЕЛЕ</span>
                        <span className="text-xs font-black text-purple-300">{relay.slot}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            {relay.name}
                          </h4>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                            24V Relay
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-1">
                          {relay.description}
                        </p>

                        <div className="text-[11px] text-purple-300/90 flex items-center gap-1.5 pt-0.5">
                          <Sliders className="w-3.5 h-3.5 shrink-0" />
                          <span className="line-clamp-1">Нагрузка: {relay.loadCircuit}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                      <span className="text-[10px] font-mono text-slate-500">Панель реле</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRelay(relay);
                          setSelectedFuse(null);
                        }}
                        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-bold"
                      >
                        <span>Инфо</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detailed Inspector Sidebar */}
        <div className="space-y-4">
          {selectedFuse ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4 sticky top-20 text-xs">
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl ${FUSE_COLOR_MAP[selectedFuse.colorCode]?.bg || "bg-amber-500/20"} border ${FUSE_COLOR_MAP[selectedFuse.colorCode]?.border || "border-amber-500"} flex items-center justify-center font-mono font-black text-sm ${FUSE_COLOR_MAP[selectedFuse.colorCode]?.text || "text-amber-400"}`}>
                    {selectedFuse.slot}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {selectedFuse.circuitName}
                    </h3>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Номинал: <b>{selectedFuse.ratingAmps}A</b> • Тип: <b>Mini Blade 24V</b>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFuse(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Location in Truck */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Расположение на тягаче:
                </span>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                  {selectedFuse.locationDetails}
                </div>
              </div>

              {/* Wire Color */}
              {selectedFuse.wireColor && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Маркировка провода в жгуте:
                  </span>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-cyan-300">
                    {selectedFuse.wireColor}
                  </div>
                </div>
              )}

              {/* Symptoms */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Симптомы при перегорании:
                </span>
                <ul className="space-y-1 pl-1">
                  {selectedFuse.symptomsIfBlown.map((sym, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-slate-300">
                      <span className="text-red-400 font-bold">•</span>
                      <span>{sym}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Multimeter Check Steps */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  Проверка мультиметром (не вынимая из гнезда):
                </span>
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 leading-relaxed font-sans">
                  {selectedFuse.multimeterCheck}
                </div>
              </div>

              {/* Related DTC codes */}
              {selectedFuse.relatedDtcCodes && selectedFuse.relatedDtcCodes.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    Связанные ошибки DTC J1939 / OBD-II:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedFuse.relatedDtcCodes.map((code, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-700 font-mono text-[11px] text-cyan-300"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-2 border-t border-slate-800 flex gap-2">
                {onAskAiForFuse && (
                  <button
                    onClick={() => onAskAiForFuse(selectedFuse.slot, selectedFuse.circuitName)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all active:scale-95"
                  >
                    <span>Спросить у AI</span>
                  </button>
                )}
                {onNavigateToDtc && (
                  <button
                    onClick={onNavigateToDtc}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-all"
                  >
                    В сканер DTC
                  </button>
                )}
              </div>
            </div>
          ) : selectedRelay ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4 sticky top-20 text-xs">
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500 flex items-center justify-center font-mono font-black text-sm text-purple-400">
                    {selectedRelay.slot}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {selectedRelay.name}
                    </h3>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Тип: <b>24V Relay</b>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRelay(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Control and Load Circuits */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Управляющая цепь (Обмотка 85-86):
                  </span>
                  <p className="text-slate-200">{selectedRelay.controlCircuit}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Силовая нагрузка (Контакты 30-87):
                  </span>
                  <p className="text-purple-300 font-mono">{selectedRelay.loadCircuit}</p>
                </div>
              </div>

              {/* Symptoms */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Признаки неисправности:
                </span>
                <ul className="space-y-1 pl-1">
                  {selectedRelay.symptomsIfFailed.map((sym, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-slate-300">
                      <span className="text-red-400 font-bold">•</span>
                      <span>{sym}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Test Steps */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  Методика быстрой проверки:
                </span>
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 leading-relaxed">
                  {selectedRelay.testSteps}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 text-center space-y-3 text-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">
                Инспектор предохранителей
              </h4>
              <p className="text-slate-400 leading-relaxed">
                Выберите любой предохранитель или реле из списка слева, чтобы увидеть симптомы перегорания, контрольные замеры мультиметром и связь с ошибками DTC.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

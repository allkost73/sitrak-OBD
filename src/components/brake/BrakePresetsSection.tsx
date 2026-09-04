import React from "react";
import { 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Truck, 
  Snowflake, 
  Mountain, 
  Sliders, 
  ArrowRight,
  Zap,
  Info
} from "lucide-react";
import { STANDARD_BRAKE_PRESETS, BrakePresetProfile } from "../../data/sitrakData";

interface BrakePresetsSectionProps {
  currentLeadDelta: number;
  currentBalance: number;
  currentCfc: boolean;
  onApplyPreset: (preset: BrakePresetProfile) => void;
  onOpenCalibrationWizard: () => void;
  isSaving: boolean;
}

export const BrakePresetsSection: React.FC<BrakePresetsSectionProps> = ({
  currentLeadDelta,
  currentBalance,
  currentCfc,
  onApplyPreset,
  onOpenCalibrationWizard,
  isSaving,
}) => {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              Эталонные заводские калибровки и профили распределения тормозов (1-Click Presets)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Установка правильных параметров по европейскому нормативу ECE R13 и протоколу ISO 11992 для блоков WABCO EBS3 / TEBS
          </p>
        </div>

        <button
          id="btn-open-cfc-wizard"
          onClick={onOpenCalibrationWizard}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg transition-all active:scale-95 shrink-0"
        >
          <Zap className="w-4 h-4 text-cyan-200" />
          <span>Мастер автокалибровки CFC</span>
        </button>
      </div>

      {/* Preset Profile Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STANDARD_BRAKE_PRESETS.map((preset) => {
          const isSelected = 
            Math.abs(currentLeadDelta - preset.trailerLeadDeltaBar) < 0.03 &&
            Math.abs(currentBalance - preset.frontRearBrakeBalancePercent) < 2;

          let icon = <ShieldCheck className="w-5 h-5 text-emerald-400" />;
          let badgeBg = "bg-emerald-950/80 text-emerald-300 border-emerald-500/40";
          let badgeText = "СТАНДАРТ ECE R13";

          if (preset.category === "heavy") {
            icon = <Mountain className="w-5 h-5 text-amber-400" />;
            badgeBg = "bg-amber-950/80 text-amber-300 border-amber-500/40";
            badgeText = "44–55 ТОНН";
          } else if (preset.category === "solo") {
            icon = <Truck className="w-5 h-5 text-cyan-400" />;
            badgeBg = "bg-cyan-950/80 text-cyan-300 border-cyan-500/40";
            badgeText = "ОДИНОЧНЫЙ ТЯГАЧ";
          } else if (preset.category === "winter") {
            icon = <Snowflake className="w-5 h-5 text-blue-400" />;
            badgeBg = "bg-blue-950/80 text-blue-300 border-blue-500/40";
            badgeText = "ЗИМА / ГОЛОЛЕД";
          }

          return (
            <div
              key={preset.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                isSelected
                  ? "bg-slate-950/90 border-amber-500/60 shadow-lg ring-1 ring-amber-500/30"
                  : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      {icon}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        {preset.name}
                      </h4>
                      <span className={`inline-block text-[9px] font-mono px-1.5 py-0.5 rounded border mt-0.5 ${badgeBg}`}>
                        {badgeText}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>АКТИВЕН</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {preset.description}
                </p>

                {/* Parameters specs */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-850 text-center">
                    <span className="text-[9px] text-slate-500 block uppercase font-mono">Опережение (ΔP)</span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      +{preset.trailerLeadDeltaBar.toFixed(2)} Bar
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-850 text-center">
                    <span className="text-[9px] text-slate-500 block uppercase font-mono">Баланс осей</span>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {preset.frontRearBrakeBalancePercent}% / {100 - preset.frontRearBrakeBalancePercent}%
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-850 text-center">
                    <span className="text-[9px] text-slate-500 block uppercase font-mono">CFC Сцепка</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {preset.couplingForceControlEnabled ? "ВКЛ" : "ВЫКЛ"}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono pt-1">
                  Назначение: {preset.suitableFor}
                </div>
              </div>

              {/* Action Button */}
              <button
                id={`btn-apply-preset-${preset.id}`}
                disabled={isSaving}
                onClick={() => onApplyPreset(preset)}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  isSelected
                    ? "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                    : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md font-black"
                }`}
              >
                <span>{isSelected ? "Применить повторно" : "Установить правильные параметры"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

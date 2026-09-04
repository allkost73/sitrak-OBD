import React from "react";
import { ShieldCheck, AlertTriangle, CheckCircle2, Sliders, Info, Scale, Check } from "lucide-react";
import { TelemetryData } from "../../types";

interface BrakeCompatibilityChartProps {
  telemetry: TelemetryData;
  trailerLeadDeltaBar: number;
}

export const BrakeCompatibilityChart: React.FC<BrakeCompatibilityChartProps> = ({
  telemetry,
  trailerLeadDeltaBar,
}) => {
  const currentPedal = telemetry.brakePedalTravel || 0;
  const currentZ = telemetry.actualDeceleration > 0 ? +(telemetry.actualDeceleration / 9.81).toFixed(2) : +( (currentPedal / 100) * 0.65 ).toFixed(2);
  const currentPm = telemetry.trailerControlPressure > 0 ? telemetry.trailerControlPressure : +(currentPedal > 0 ? 0.4 + (currentPedal / 100) * 7.5 + trailerLeadDeltaBar : 0).toFixed(2);

  const isOptimal = telemetry.eceR13ComplianceStatus === "optimal";
  const isWithinBand = telemetry.eceR13ComplianceStatus === "within_band";
  const isLagging = telemetry.eceR13ComplianceStatus === "trailer_lagging";
  const isOverbraking = telemetry.eceR13ComplianceStatus === "trailer_overbraking";

  // ECE R13 target range for current Z
  const targetMinPm = Math.max(0.6, (currentZ - 0.02) * 8.2).toFixed(2);
  const targetMaxPm = Math.min(7.8, (currentZ + 0.08) * 10.5 + 0.5).toFixed(2);
  const targetIdealPm = ((currentZ * 9.2) + 0.35).toFixed(2);

  return (
    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white">
            Статус согласования тормозных сил автопоезда (ECE R13 / ISO 11992-2)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isOptimal ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" />
              <span>ИДЕАЛЬНЫЙ ЭТАЛОН ECE R13</span>
            </span>
          ) : isWithinBand ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <ShieldCheck className="w-3 h-3" />
              <span>В НОРМАТИВНОМ КОРИДОРЕ</span>
            </span>
          ) : isLagging ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
              <AlertTriangle className="w-3 h-3" />
              <span>ПРИЦЕП ОПАЗДЫВАЕТ (РИСК СКЛАДЫВАНИЯ)</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertTriangle className="w-3 h-3" />
              <span>ПЕРЕТОРМАЖИВАНИЕ ПРИЦЕПА (ИЗНОС)</span>
            </span>
          )}
        </div>
      </div>

      {/* Compliance Parameters Summary Table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
            Замедление автопоезда (z)
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-white">{currentZ}</span>
            <span className="text-xs text-slate-400">g</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {currentZ > 0 ? `a = ${(currentZ * 9.81).toFixed(1)} м/с²` : "Педаль не нажата"}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
            Давление прицепа (pm)
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-cyan-400">{currentPm.toFixed(2)}</span>
            <span className="text-xs text-slate-400">Bar</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Эталон ECE R13: {targetIdealPm} Bar
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
            Допустимый диапазон pm
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold font-mono text-amber-300">{targetMinPm} – {targetMaxPm}</span>
            <span className="text-xs text-slate-400">Bar</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Коридор безопасности
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
            Сцепное усилие CFC
          </span>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold font-mono ${telemetry.couplingForceKn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {telemetry.couplingForceKn > 0 ? `+${telemetry.couplingForceKn}` : telemetry.couplingForceKn}
            </span>
            <span className="text-xs text-slate-400">kN</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {telemetry.couplingForceKn > 0 ? "Легкое натяжение" : telemetry.couplingForceKn < 0 ? "Сжатие сцепки" : "Нейтраль"}
          </span>
        </div>
      </div>

      {/* Normative Criteria Evaluation */}
      <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-2 text-xs">
        <span className="font-bold text-slate-300 block">
          Проверка соответствия нормативам ECE R13:
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-200">Опережение прицепа (ΔP): +{trailerLeadDeltaBar.toFixed(2)} Bar</span>
              <p className="text-slate-400 text-[10px] mt-0.5">
                Гарантирует срабатывание тормозов полуприцепа на 30–50 мс раньше тягача для предотвращения складывания автопоезда.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-200">Порог срабатывания: 0.40 Bar</span>
              <p className="text-slate-400 text-[10px] mt-0.5">
                Минимальное давление для преодоления возвратных пружин мембранных тормозных камер тягача и полуприцепа.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

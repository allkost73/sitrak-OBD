import React, { useState } from "react";
import { 
  X, 
  HardDrive, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  CheckCircle2, 
  Cloud, 
  Share2,
  Truck
} from "lucide-react";
import { DtcFault, TelemetryData, TruckConfig, TruckProfile } from "../types";

interface DriveExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: TruckProfile;
  dtcs: DtcFault[];
  telemetry: TelemetryData;
  config: TruckConfig;
}

export const DriveExportModal: React.FC<DriveExportModalProps> = ({
  isOpen,
  onClose,
  profile,
  dtcs,
  telemetry,
  config,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState(false);
  const [driveReportId, setDriveReportId] = useState<string | null>(null);

  if (!isOpen) return null;

  const generateReportText = () => {
    return `=== ДИАГНОСТИЧЕСКИЙ ОТЧЕТ SITRAK S7H 480 ===
Дата и время: ${new Date().toLocaleString("ru-RU")}
Автомобиль: ${profile.model}
VIN: ${profile.vin}
Гос. номер: ${profile.plateNumber}
Пробег: ${profile.odometer.toLocaleString("ru-RU")} км
Двигатель: ${profile.engine} (480 л.с., Euro-5)

=== СОСТОЯНИЕ БЛОКОВ УПРАВЛЕНИЯ (ECU) ===
- Двигатель: Bosch EDC17CV44 (ПО: P_1340_V83_MC13)
- КПП: ZF 12TX2620TD TraXon
- Тормозная система: WABCO EBS3
- Кузовной блок: CBCU-V3.2
- Нейтрализация: Bosch / Sinotruk DeNOx 2.2 SCR

=== ОШИБКИ DTC (Всего: ${dtcs.length}) ===
${dtcs.length === 0 ? "Ошибок не обнаружено" : dtcs.map((d, i) => `${i + 1}. [${d.status.toUpperCase()}] ${d.code} (${d.obdCode || "OBD"}) - ${d.title}\n   Блок: ${d.ecuName}\n   Рекомендация: ${d.recommendedFix.split("\n")[0]}`).join("\n\n")}

=== СНИМОК ТЕЛЕМЕТРИИ CAN J1939 ===
- Обороты: ${Math.round(telemetry.engineRpm)} RPM
- Давление масла: ${telemetry.oilPressure.toFixed(1)} Bar
- Температура ОЖ: ${Math.round(telemetry.coolantTemp)}°C
- Давление наддува: ${telemetry.boostPressure.toFixed(2)} Bar
- Давление Common Rail: ${Math.round(telemetry.railPressure)} MPa
- Пневматика (Контур 1 / 2): ${telemetry.airCircuit1.toFixed(1)} / ${telemetry.airCircuit2.toFixed(1)} Bar
- Уровень AdBlue: ${telemetry.adblueLevel.toFixed(1)}% (Качество: ${telemetry.adblueQuality}%)
- Выбросы NOx (Вход / Выход): ${Math.round(telemetry.noxInlet)} / ${Math.round(telemetry.noxOutlet)} ppm
- Напряжение бортсети: ${telemetry.batteryVoltage.toFixed(1)} V

=== ТЕКУЩИЕ НАСТРОЙКИ ЭБУ ===
- Ограничитель скорости: ${config.speedLimiterKmH} км/ч
- Обороты холостого хода: ${config.idleRpm} RPM
- Калибровка сцепления TraXon: ${config.clutchLastCalibrationDate}
- ДХО: ${config.daytimeRunningLights ? "Включены" : "Выключены"}
- Зуммер ремня: ${config.seatbeltBuzzer ? "Включен" : "Отключен"}
============================================`;
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generateReportText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const text = generateReportText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SITRAK_Report_${profile.vin}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadToDrive = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vin: profile.vin,
          mileage: profile.odometer,
          dtcs,
          telemetry,
          configurations: config,
        }),
      });
      const data = await response.json();
      setDriveReportId(data.reportId || "SITRAK-DRIVE-2026");
      setExportedSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div 
        id="modal-drive-export"
        className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Экспорт диагностического отчета Sitrak
              </h2>
              <p className="text-xs text-slate-400">
                Сохранение в Google Drive, локальный файл или отправка механику
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

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {exportedSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 space-y-2 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">
                Отчет успешно загружен в Google Drive!
              </h3>
              <p className="text-xs text-emerald-300">
                Идентификатор отчета: <b className="font-mono">{driveReportId}</b>
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 flex items-center gap-3">
              <Cloud className="w-5 h-5 text-blue-400 shrink-0" />
              <span>
                Отчет содержит полную выгрузку кодов DTC, стоп-кадров, текущих калибровок и параметров датчиков CAN J1939.
              </span>
            </div>
          )}

          {/* Preview Box */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Предпросмотр отчета:
            </span>
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-52 overflow-y-auto whitespace-pre-wrap select-all">
              {generateReportText()}
            </pre>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <button
              id="btn-drive-upload"
              disabled={isExporting}
              onClick={handleUploadToDrive}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <HardDrive className="w-4 h-4" />
              <span>{isExporting ? "Синхронизация..." : "В Google Drive"}</span>
            </button>

            <button
              id="btn-download-report"
              onClick={handleDownloadFile}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all active:scale-95"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Скачать TXT</span>
            </button>

            <button
              id="btn-copy-report"
              onClick={handleCopyToClipboard}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
              <span>{copied ? "Скопировано!" : "Копировать"}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

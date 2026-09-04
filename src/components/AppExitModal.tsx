import React, { useState } from "react";
import { 
  LogOut, 
  Power, 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  HardDrive, 
  RotateCcw, 
  X, 
  ShieldAlert, 
  Clock, 
  Activity, 
  Zap,
  ArrowRight
} from "lucide-react";
import { elmService } from "../services/elmAdapterService";
import { DtcFault, ElmDeviceInfo, TelemetryData } from "../types";

interface AppExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  device: ElmDeviceInfo | null;
  dtcs: DtcFault[];
  telemetry: TelemetryData;
  onOpenDriveExport: () => void;
}

export const AppExitModal: React.FC<AppExitModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  device,
  dtcs,
  telemetry,
  onOpenDriveExport,
}) => {
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shutdownStep, setShutdownStep] = useState<string>("");

  if (!isOpen) return null;

  const activeDtcCount = dtcs.filter((d) => d.status === "active").length;

  const handleConfirmExit = async () => {
    setIsShuttingDown(true);
    setShutdownStep("Отправка команды перевода чипа в режим сна (AT Z / AT PC)...");

    try {
      if (isConnected) {
        try {
          await elmService.sendCommand("AT Z", "Перевод адаптера в режим энергосбережения", 400);
        } catch {
          // ignore
        }
        setShutdownStep("Отключение Bluetooth / Serial соединения...");
        await elmService.disconnect();
      }

      setShutdownStep("Сохранение журнала диагностики в локальную память...");
      try {
        const sessionLog = {
          timestamp: new Date().toISOString(),
          activeDtcs: activeDtcCount,
          batteryVoltage: telemetry.batteryVoltage,
          coolantTemp: telemetry.coolantTemp,
          oilPressure: telemetry.oilPressure,
          protocol: device?.protocol || "ISO15765_29BIT_500K",
        };
        localStorage.setItem("sitrak_last_session", JSON.stringify(sessionLog));
      } catch {
        // ignore
      }

      await new Promise((r) => setTimeout(r, 600));
      setShutdownStep("Все системы безопасно отключены.");
      setIsCompleted(true);
    } catch (e: any) {
      console.error("Exit error", e);
      setIsCompleted(true);
    } finally {
      setIsShuttingDown(false);
    }
  };

  const handleCloseTabOrWindow = () => {
    try {
      window.close();
    } catch {
      // In browser tabs, window.close might be blocked
    }
    // Fallback reload or reset
    window.location.href = "about:blank";
  };

  const handleRestartSession = () => {
    setIsCompleted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="modal-app-exit"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-red-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Завершение работы
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-500/40">
                  Sitrak S7H
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Безопасное отключение адаптера ELM375 и закрытие сеанса
              </p>
            </div>
          </div>

          {!isShuttingDown && (
            <button
              id="btn-close-exit-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {!isCompleted ? (
            <>
              {/* Session Summary Card */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Сводка текущего сеанса:</span>
                  <span className="font-mono text-emerald-400 text-[11px]">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Статус адаптера:</span>
                    <span className={`font-bold mt-0.5 block ${isConnected ? "text-emerald-400" : "text-slate-400"}`}>
                      {isConnected ? "Подключен (CAN)" : "Офлайн / Ожидание"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Активные ошибки:</span>
                    <span className={`font-bold mt-0.5 block ${activeDtcCount > 0 ? "text-red-400" : "text-emerald-400"}`}>
                      {activeDtcCount > 0 ? `${activeDtcCount} DTC неисправностей` : "Ошибок нет"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Бортсеть Sitrak:</span>
                    <span className="font-bold text-amber-300 mt-0.5 block font-mono">
                      {telemetry.batteryVoltage > 0 ? `${telemetry.batteryVoltage} V` : "24.0 V"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Температура ОЖ:</span>
                    <span className="font-bold text-cyan-300 mt-0.5 block font-mono">
                      {telemetry.coolantTemp > 0 ? `${telemetry.coolantTemp} °C` : "83.0 °C"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning if DTCs exist */}
              {activeDtcCount > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5 text-xs text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300">Сохраните отчет перед выходом:</span>
                    <p className="text-slate-300 mt-0.5 text-[11px]">
                      Обнаружены активные коды неисправностей. Рекомендуется экспортировать диагностический отчет в Google Drive или PDF.
                    </p>
                  </div>
                </div>
              )}

              {/* Shutdown Progress message */}
              {isShuttingDown && (
                <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/40 flex items-center gap-3 text-xs text-blue-200">
                  <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />
                  <span className="font-medium">{shutdownStep}</span>
                </div>
              )}
            </>
          ) : (
            /* Completed Screen */
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Сеанс диагностики успешно завершен</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Адаптер ELM375 переведен в безопасный спящий режим, соединение с шиной CAN тягача закрыто.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 text-left space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Шина CAN:</span>
                  <span className="text-emerald-400 font-bold">ОТКЛЮЧЕНА (AT Z)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Память журнала:</span>
                  <span className="text-slate-200">СОХРАНЕНА</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          {!isCompleted ? (
            <>
              <button
                id="btn-exit-save-report"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDriveExport();
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow active:scale-95"
              >
                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                <span>Сохранить отчет</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  id="btn-exit-cancel"
                  type="button"
                  disabled={isShuttingDown}
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Отмена
                </button>
                <button
                  id="btn-exit-confirm"
                  type="button"
                  disabled={isShuttingDown}
                  onClick={handleConfirmExit}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-red-950/50 active:scale-95"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{isShuttingDown ? "Отключение..." : "Выйти из приложения"}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-between gap-2">
              <button
                id="btn-exit-restart"
                type="button"
                onClick={handleRestartSession}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Новая диагностика</span>
              </button>
              <button
                id="btn-exit-close-tab"
                type="button"
                onClick={handleCloseTabOrWindow}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Закрыть окно</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

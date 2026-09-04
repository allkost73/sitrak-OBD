export type ElmVersion = "v1.5" | "v2.1" | "ELM375" | "PIC18F25K80" | "STN1110" | "SIMULATED";

export type ConnectionType = "bluetooth_ble" | "bluetooth_classic" | "usb_serial" | "simulation";

export type ProtocolType = 
  | "J1939_250K" 
  | "J1939_500K" 
  | "ISO15765_29BIT_250K"
  | "ISO15765_29BIT_500K" 
  | "ISO15765_11BIT_500K" 
  | "ISO15765_11BIT_250K"
  | "KWP2000_FAST"
  | "KWP2000_5BAUD"
  | "ISO9141_2"
  | "J1850_PWM"
  | "J1850_VPW"
  | "AUTO";

export interface ProtocolScanCandidate {
  id: string;
  name: string;
  elmCommand: string; // e.g. "AT SP B"
  code: ProtocolType;
  busType: "CAN 29-bit" | "CAN 11-bit" | "K-Line" | "J1850" | "AUTO";
  baudRate: string;
  description: string;
  recommendedHeader: string;
  targetSystems: string;
  status: "pending" | "testing" | "matched" | "no_response" | "unsupported";
  pingMs?: number;
  ecuReplySnippet?: string;
  testedAt?: string;
  notes?: string;
}

export interface ProtocolScanProgress {
  isScanning: boolean;
  total: number;
  currentStepIndex: number;
  currentCandidateId?: string;
  foundWorkingProtocol: ProtocolScanCandidate | null;
  candidates: ProtocolScanCandidate[];
  summaryMessage?: string;
  scanMode: "all" | "truck_can" | "k_line";
}

export interface ElmDeviceInfo {
  name: string;
  type: ConnectionType;
  version: ElmVersion;
  voltage: number;
  protocol: ProtocolType;
  baudRate: number;
  chipDetails: string;
  isGenuine: boolean;
  connectedAt?: string;
  pingMs: number;
  activeHeader?: string;
}

export interface EcuNodeScanResult {
  id: string;
  name: string;
  code: string;
  addressHex: string;
  headerHex: string;
  status: "online" | "offline" | "scanning" | "error";
  pingMs?: number;
  protocolUsed?: string;
  swVersion?: string;
  hardwareNumber?: string;
  vin?: string;
  diagnosticNotes?: string;
}

export type EcuType = "EDC17" | "TRAXON" | "EBS3" | "CBCU" | "SCR_DCU" | "ICU" | "RETARDER";

export type FuseBoxLocation = "cabin_main" | "cabin_relays" | "battery_box";

export type FuseCategory = 
  | "engine_ecu" 
  | "transmission_brakes" 
  | "scr_denox" 
  | "cabin_comfort" 
  | "lighting_signals" 
  | "power_relays" 
  | "battery_power";

export interface FuseItem {
  id: string;
  slot: string; // e.g. "F1", "F12", "MF3"
  ratingAmps: number;
  colorCode: string; // e.g. "yellow", "blue", "red", "green", "white", "orange"
  circuitName: string;
  description: string;
  ecuConnection?: EcuType;
  category: FuseCategory;
  location: FuseBoxLocation;
  locationDetails: string;
  symptomsIfBlown: string[];
  multimeterCheck: string;
  relatedDtcCodes?: string[];
  wireColor?: string;
}

export interface RelayItem {
  id: string;
  slot: string; // e.g. "K1", "K5"
  name: string;
  type: "standard_mini" | "power_macro" | "solid_state";
  description: string;
  controlCircuit: string;
  loadCircuit: string;
  location: FuseBoxLocation;
  symptomsIfFailed: string[];
  testSteps: string;
}

export interface DtcFault {
  id: string;
  code: string; // e.g. "SPN 3226 FMI 9" or "P20EE"
  spn?: number;
  fmi?: number;
  obdCode?: string;
  ecu: EcuType;
  ecuName: string;
  title: string;
  description: string;
  status: "active" | "stored" | "pending";
  severity: "critical" | "warning" | "info";
  symptoms: string[];
  recommendedFix: string;
  pinoutCheck?: string;
  occurrenceCount: number;
  freezeFrame?: {
    engineRpm: number;
    vehicleSpeed: number;
    coolantTemp: number;
    railPressure: number;
    boostPressure: number;
    torquePercent: number;
    timestamp: string;
  };
}

export interface TelemetryData {
  engineRpm: number;
  vehicleSpeed: number;
  coolantTemp: number;
  oilPressure: number; // Bar (0.8 - 6.0)
  oilTemp: number; // °C
  boostPressure: number; // Bar (0.0 - 2.8)
  railPressure: number; // MPa (30 - 180)
  fuelLevel: number; // %
  fuelRate: number; // L/100km or L/h
  adblueLevel: number; // % (0 - 100)
  adblueQuality: number; // % concentration (ideal 32.5%)
  noxInlet: number; // ppm
  noxOutlet: number; // ppm
  dpfDifferentialPressure: number; // mbar
  airCircuit1: number; // Bar (pneu front - Контур 1)
  airCircuit2: number; // Bar (pneu rear - Контур 2)
  airCircuit3: number; // Bar (pneu parking & trailer - Контур 3)
  airCircuit4: number; // Bar (pneu aux & cab - Контур 4)
  trailerSupplyPressure: number; // Bar (Красная питающая магистраль полуприцепа)
  trailerControlPressure: number; // Bar (Желтая управляющая магистраль полуприцепа)
  compressorStatus: "charging" | "unloaded" | "regenerating";
  apuHeaterActive: boolean;
  ecasFrontHeightMm: number; // offset mm
  ecasRearHeightMm: number; // offset mm
  frontBrakePadWear: number; // % (0-100)
  rearBrakePadWear: number; // % (0-100)
  trailerBrakePadWear: number; // % (0-100)
  trailerEbsConnected: boolean; // ISO 7638 CAN
  trailerLeadAppliedBar: number; // Dynamic trailer lead Bar

  // --- Фактические данные тормозной системы в реальном времени ---
  brakePedalTravel: number; // % (0 - 100) нажатие педали
  demandedDeceleration: number; // m/s² заданное замедление
  actualDeceleration: number; // m/s² фактическое замедление по акселерометру ESC
  couplingForceKn: number; // kN (+ растяжка автопоезда, - набегание прицепа)
  axleLoadFrontTon: number; // т (по датчикам ECAS)
  axleLoadRearTon: number; // т (по датчикам ECAS)
  fifthWheelLoadTon: number; // т нагрузка на седло ССУ
  trailerAxleLoadTon: number; // т нагрузка на оси прицепа
  brakePressureFL: number; // Bar факт в камере переднего левого колеса
  brakePressureFR: number; // Bar факт переднего правого
  brakePressureRL: number; // Bar факт заднего левого
  brakePressureRR: number; // Bar факт заднего правого
  brakePressureTrailer: number; // Bar факт в модуляторе полуприцепа
  targetPressureTractor: number; // Bar целевое расчетное давление тягача
  targetPressureTrailer: number; // Bar целевое расчетное давление прицепа
  discTempFL: number; // °C температура тормозного диска
  discTempFR: number; // °C
  discTempRL: number; // °C
  discTempRR: number; // °C
  discTempTrailer: number; // °C
  eceR13ComplianceStatus: "optimal" | "within_band" | "trailer_lagging" | "trailer_overbraking";

  batteryVoltage: number; // V (24.0 - 28.6)
  currentGear: string; // "N", "1" - "12", "R1", "R2"
  clutchWear: number; // % (0-100)
  retarderTorque: number; // % (0-100)
  engineLoad: number; // % (0-100)
  acceleratorPedalPosition: number; // % (0-100) положение педали акселератора (E-Gas J1939 EEC2 / PID 0149/0111)
  intakeAirTemp: number; // °C
  ambientTemp: number; // °C
  instantMileage: number; // km

  // --- АКПП ZF TraXon / Sinotruk AMT ---
  transmissionOilTemp: number; // °C (40 - 95 °C)
  clutchStrokeMm: number; // mm (0.0 - 34.0 mm)
  clutchKissPointMm: number; // mm точка схватывания (18.6 mm)
  inputShaftRpm: number; // об/мин первичный вал КПП
  countershaftRpm: number; // об/мин промежуточный вал
  countershaftBrakeActive: boolean; // замедлитель промвала
  amtSplitterPosition: "low" | "high";
  amtRangePosition: "low" | "high";
  amtAdaptationStatus: "calibrated" | "in_progress" | "needs_calibration" | "drift_detected";
}

export interface TruckConfig {
  speedLimiterKmH: number; // 85, 90, 100, 110, 125
  idleRpm: number; // 550 - 750
  cruiseControlStep: 1 | 2; // km/h
  eGasCurve: "economic" | "standard" | "dynamic" | "heavy_load";
  injectorCodes: string[]; // 6 cylinders IQA codes (e.g., "7H8K9L2")
  clutchKissPointLearned: boolean;
  clutchLastCalibrationDate: string;
  daytimeRunningLights: boolean;
  seatbeltBuzzer: boolean;
  cabAirSuspensionLevel: number; // mm offset (-20 to +20)
  dpfAutoRegenEnabled: boolean;
  adblueDosingEnabled: boolean;

  // --- Самоадаптация и калибровка АКПП ZF TraXon / Sinotruk AMT ---
  amtClutchKissPointMm: number; // 16.0 - 22.0 mm (Точка смыкания диска Sachs/ZF)
  amtClutchStrokeTotalMm: number; // 30.0 - 34.0 mm (Полный ход пневмоцилиндра ConAct)
  amtCountershaftBrakeLearned: boolean; // Обучен тормоз промежуточного вала
  amtGearboxEndStopsLearned: boolean; // Обучены концевые упоры вилок 1-12, R1-R2, GV, GP
  amtCreepingModeEnabled: boolean; // Режим малого хода (Creep Mode / ползущий режим)
  amtShiftSpeedMode: "comfort" | "standard" | "fast_economy"; // Скорость переключения
  amtLoadCompensationLevel: number; // 0 - 100% компенсация массы груза при трогании
  amtLastFullAdaptationDate: string;
  amtAdaptationHealthStatus: "optimal" | "needs_calibration" | "critical_drift";

  // --- Пневмосистема & Осушитель WABCO EC-APU ---
  apuCutInPressure: number; // 10.0 - 11.5 Bar (Давление включения компрессора)
  apuCutOutPressure: number; // 11.8 - 13.0 Bar (Давление отключения / сброса)
  apuPurgeDurationSec: number; // 3 - 15 сек (Длительность регенерации силикагеля)
  apuHeaterAutoTemp: number; // -10 - +15 °C (Порог автоподогрева патрона)

  // --- Тормозная система WABCO EBS3 & Полуприцеп ---
  trailerBrakeLeadDeltaBar: number; // 0.0 - 1.0 Bar (Опережение полуприцепа для предотвращения "ножниц")
  frontRearBrakeBalancePercent: number; // 35 - 65 % (Распределение тормозных сил перед/зад тягача)
  brakePadWearBalancingEnabled: boolean; // Автобалансировка износа тормозных колодок
  couplingForceControlEnabled: boolean; // CFC (Coupling Force Control - сведение усилия на сцепке к 0)
  liningContactPressureBar: number; // 0.30 - 0.55 Bar (Порог прилегания фрикционных накладок)
  retarderBlendingMode: "retarder_first" | "balanced" | "direct"; // Приоритет ретардера ZF / горного тормоза EVB
  trailerEbsProtocol: "iso7638_can" | "pneumatic_conventional" | "auto_detect"; // Интерфейс связи с полуприцепом
  trailerStretchBrakeLevel: number; // 1 - 5 (Усилие натяжки автопоезда при спуске)
  hillStartAssistHoldSec: number; // 1.5 - 4.0 сек (Противооткатная система Hill Holder)
  trailerEmergencyBrakingThreshold: "gentle" | "standard" | "aggressive";
  presetProfileName?: string; // Название активного калибровочного профиля

  // --- Пневмоподвеска WABCO ECAS ---
  ecasNormalRideOffsetMm: number; // -30 to +30 mm
  ecasDockingM1HighMm: number; // +40 to +110 mm (Высокая рампа)
  ecasDockingM2LowMm: number; // -80 to -20 mm (Низкая рампа)
  ecasAutoLevelingSpeedKmH: number; // 15 - 35 км/ч (Возврат в транспортное положение)
  tractionHelpMaxAxleLoadTon: number; // 10.0 - 13.5 т (Помощь при трогании / догрузка ведущей оси)
}

export interface ActuatorTestStatus {
  cylinderCutout: boolean[]; // 6 booleans
  vgtPosition: number; // 0 - 100%
  evbBrakeActive: boolean;
  fanClutchSpeed: number; // 0, 50, 100%
  adbluePumpTestActive: boolean;
  fuelPumpBleedActive: boolean;
  compressorPurgeActive?: boolean;
  trailerStretchBrakeActive?: boolean;
}

export interface TerminalMessage {
  id: string;
  timestamp: string;
  direction: "tx" | "rx" | "system" | "error";
  text: string;
  description?: string;
}

export interface TruckProfile {
  model: string;
  engine: string;
  displacement: string;
  horsepower: number;
  vin: string;
  plateNumber: string;
  odometer: number;
  ecus: {
    name: string;
    type: EcuType;
    hardwareNumber: string;
    softwareVersion: string;
    status: "ok" | "fault" | "offline";
  }[];
}

export type AppWindowId = 
  | "dashboard" 
  | "ecus"
  | "dtc" 
  | "fuses" 
  | "tuning" 
  | "pneumatics"
  | "actuators" 
  | "terminal" 
  | "ai";

export type WorkspaceLayout = 
  | "tabs" 
  | "floating" 
  | "split_horizontal" 
  | "split_vertical" 
  | "grid_4";

export interface AppWindowState {
  id: AppWindowId;
  title: string;
  shortTitle: string;
  icon: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  minSize: { width: number; height: number };
}

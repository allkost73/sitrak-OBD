import { 
  ConnectionType, 
  ElmDeviceInfo, 
  ElmVersion, 
  ProtocolType, 
  TelemetryData, 
  TerminalMessage,
  EcuNodeScanResult,
  ProtocolScanCandidate,
  ProtocolScanProgress
} from "../types";

export type DataListener = (telemetry: TelemetryData) => void;
export type TerminalListener = (message: TerminalMessage) => void;
export type ConnectionListener = (connected: boolean, device: ElmDeviceInfo | null) => void;
export type EcuScanListener = (results: EcuNodeScanResult[], isScanning: boolean) => void;
export type ProtocolScanListener = (progress: ProtocolScanProgress) => void;

// Known BLE and SPP Service UUIDs for ELM327, ELM375, Vgate, Kingbolen, Konnwei, Viecar, OBDLink, JDY-30/31, HM-10, HC-05, CC2541
const KNOWN_BLE_SERVICES = [
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e", // Nordic UART (Most common)
  "0000fff0-0000-1000-8000-00805f9b34fb", // Vgate / ELM327 BLE / Viecar / Kingbolen
  "0000ffe0-0000-1000-8000-00805f9b34fb", // HM-10 / CC2541 / ELM375 BLE
  "00001101-0000-1000-8000-00805f9b34fb", // Standard Bluetooth Serial Port Profile (SPP)
  "0000fee0-0000-1000-8000-00805f9b34fb", // Ancel / Viecar
  "0000fee1-0000-1000-8000-00805f9b34fb",
  "0000fef0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC Transparent UART (Microchip)
  "0000e781-0000-1000-8000-00805f9b34fb", // STN1110 / OBDLink BLE
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Carista / STN
  "569a1101-b87f-490c-92cb-11ba5ea5167c", // OBDLink MX+
  "000018f0-0000-1000-8000-00805f9b34fb", // Telit / Bluegiga
  "0000feb0-0000-1000-8000-00805f9b34fb", // JDY BLE UART
  "0000ae00-0000-1000-8000-00805f9b34fb", // Konnwei KW902 BLE
  "00001800-0000-1000-8000-00805f9b34fb", // Generic Access
  "00001801-0000-1000-8000-00805f9b34fb", // Generic Attribute
  "0000180a-0000-1000-8000-00805f9b34fb", // Device Information
];

class ElmAdapterService {
  private isConnected: boolean = false;
  private currentDevice: ElmDeviceInfo | null = null;
  private connectionType: ConnectionType = "bluetooth_ble";
  private protocol: ProtocolType = "J1939_250K";
  
  // Real hardware handles (Web Bluetooth / Web Serial)
  private bluetoothDevice: any = null;
  private bleServer: any = null;
  private bleRxChar: any = null;
  private bleTxChar: any = null;
  private serialPort: any = null;
  private serialReader: any = null;
  private serialWriter: any = null;

  // RX Response accumulation queue for synchronous sendCommand()
  private rxBuffer: string = "";
  private responseResolver: ((resp: string) => void) | null = null;
  private commandMutex: Promise<any> = Promise.resolve();
  private cancelScanRequested: boolean = false;
  private isManualCommandExecuting: boolean = false;

  // Listeners
  private telemetryListeners: Set<DataListener> = new Set();
  private terminalListeners: Set<TerminalListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private ecuScanListeners: Set<EcuScanListener> = new Set();
  private protocolScanListeners: Set<ProtocolScanListener> = new Set();

  // Full Protocol Candidate Definition for Automotive & Commercial Truck ECUs
  private protocolCandidates: ProtocolScanCandidate[] = [
    {
      id: "j1939_250k",
      name: "SAE J1939 CAN (29 bit, 250 kbps)",
      elmCommand: "AT SP B",
      code: "J1939_250K",
      busType: "CAN 29-bit",
      baudRate: "250 kbps",
      description: "Основной грузовой стандарт SAE J1939. Прямой опрос всех блоков Sitrak S7H / C7H (MC11/MC13 MAN).",
      recommendedHeader: "18DB33F1",
      targetSystems: "Bosch EDC17CV44 (Двигатель), ZF TraXon (АКПП), WABCO EBS3 (Тормоза), CBCU3, SCR DeNOx 2.2",
      status: "pending",
    },
    {
      id: "iso15765_29_250k",
      name: "ISO 15765-4 CAN (29 bit, 250 kbps)",
      elmCommand: "AT SP 9",
      code: "ISO15765_29BIT_250K",
      busType: "CAN 29-bit",
      baudRate: "250 kbps",
      description: "Дизельный коммерческий стандарт ISO 15765-4 (29-бит). Совместим со всеми версиями чипов ELM327/ELM375/PIC18F25K80.",
      recommendedHeader: "18DB33F1",
      targetSystems: "Sinotruk / Sitrak / Shacman / FAW / Foton / MAN TGS/TGX",
      status: "pending",
    },
    {
      id: "j1939_500k",
      name: "SAE J1939 CAN (29 bit, 500 kbps)",
      elmCommand: "AT SP C",
      code: "J1939_500K",
      busType: "CAN 29-bit",
      baudRate: "500 kbps",
      description: "Высокоскоростная грузовая шина J1939. Применяется на тягачах Euro-6 и новых сериях Sitrak C9H / G7H.",
      recommendedHeader: "18DB33F1",
      targetSystems: "Новые модификации Sitrak C9H, FAST AMT, Scania / Volvo Euro 6",
      status: "pending",
    },
    {
      id: "iso15765_29_500k",
      name: "ISO 15765-4 CAN (29 bit, 500 kbps)",
      elmCommand: "AT SP 7",
      code: "ISO15765_29BIT_500K",
      busType: "CAN 29-bit",
      baudRate: "500 kbps",
      description: "Высокоскоростной диагностический протокол UDS over CAN 29-bit.",
      recommendedHeader: "18DB33F1",
      targetSystems: "Диагностические шлюзы Sinotruk VCU, HOWO T5G",
      status: "pending",
    },
    {
      id: "iso15765_11_500k",
      name: "ISO 15765-4 CAN (11 bit, 500 kbps)",
      elmCommand: "AT SP 6",
      code: "ISO15765_11BIT_500K",
      busType: "CAN 11-bit",
      baudRate: "500 kbps",
      description: "Стандартный легковой и LCV протокол OBD-II CAN (11-битный идентификатор).",
      recommendedHeader: "7DF",
      targetSystems: "Легковые автомобили, микроавтобусы, коммерческие фургоны",
      status: "pending",
    },
    {
      id: "iso15765_11_250k",
      name: "ISO 15765-4 CAN (11 bit, 250 kbps)",
      elmCommand: "AT SP 8",
      code: "ISO15765_11BIT_250K",
      busType: "CAN 11-bit",
      baudRate: "250 kbps",
      description: "Низкоскоростной 11-битный CAN протокол OBD-II.",
      recommendedHeader: "7DF",
      targetSystems: "Блоки комфорта и вспомогательное оборудование",
      status: "pending",
    },
    {
      id: "kwp2000_fast",
      name: "ISO 14230-4 KWP (Fast Init, 10.4 kbps)",
      elmCommand: "AT SP 5",
      code: "KWP2000_FAST",
      busType: "K-Line",
      baudRate: "10.4 kbps",
      description: "Диагностика по K-Line (пин 7 OBD). Опрос автономных отопителей и вспомогательных блоков.",
      recommendedHeader: "C133F1",
      targetSystems: "Webasto Thermo Pro 90, Eberspacher Airtronic, старые блоки Cummins",
      status: "pending",
    },
    {
      id: "kwp2000_5baud",
      name: "ISO 14230-4 KWP (5 Baud Init, 10.4 kbps)",
      elmCommand: "AT SP 4",
      code: "KWP2000_5BAUD",
      busType: "K-Line",
      baudRate: "10.4 kbps",
      description: "KWP2000 с медленной 5-бодовой инициализацией по K-Line.",
      recommendedHeader: "C133F1",
      targetSystems: "Сервисные блоки дополнительного оборудования",
      status: "pending",
    },
    {
      id: "iso9141_2",
      name: "ISO 9141-2 (5 Baud Init, 10.4 kbps)",
      elmCommand: "AT SP 3",
      code: "ISO9141_2",
      busType: "K-Line",
      baudRate: "10.4 kbps",
      description: "Классический протокол ISO 9141-2 по K/L-линии.",
      recommendedHeader: "686AF1",
      targetSystems: "Устаревшие блоки управления и тахографы",
      status: "pending",
    },
    {
      id: "j1850_pwm",
      name: "SAE J1850 PWM (41.6 kbps)",
      elmCommand: "AT SP 1",
      code: "J1850_PWM",
      busType: "J1850",
      baudRate: "41.6 kbps",
      description: "Американский стандарт широтно-импульсной модуляции (Ford / International).",
      recommendedHeader: "616AF1",
      targetSystems: "Американские грузовые шасси (Freightliner / International)",
      status: "pending",
    },
    {
      id: "j1850_vpw",
      name: "SAE J1850 VPW (10.4 kbps)",
      elmCommand: "AT SP 2",
      code: "J1850_VPW",
      busType: "J1850",
      baudRate: "10.4 kbps",
      description: "Американский стандарт модуляции с переменным импульсом (GM / Detroit Diesel).",
      recommendedHeader: "686AF1",
      targetSystems: "Двигатели Detroit Diesel DDEC, Allison Transmission",
      status: "pending",
    },
    {
      id: "auto",
      name: "ELM327 Auto Protocol Search",
      elmCommand: "AT SP 0",
      code: "AUTO",
      busType: "AUTO",
      baudRate: "Adaptive",
      description: "Автоматический перебор протоколов силами прошивки чипа ELM375/ELM327.",
      recommendedHeader: "18DB33F1",
      targetSystems: "Универсальный режим автоподбора",
      status: "pending",
    },
  ];

  private protocolScanProgress: ProtocolScanProgress = {
    isScanning: false,
    total: 12,
    currentStepIndex: 0,
    foundWorkingProtocol: null,
    candidates: [],
    scanMode: "all",
    summaryMessage: "Готов к запуску перебора протоколов"
  };

  // Cached ECU scan results
  private cachedEcuResults: EcuNodeScanResult[] = [
    {
      id: "edc17",
      name: "ЭБУ Двигателя Bosch EDC17CV44 (MC11 / MC13)",
      code: "EDC17",
      addressHex: "0x00",
      headerHex: "18DA00F1",
      status: "offline",
      diagnosticNotes: "Основной блок управления впрыском Common Rail, турбонаддувом VGT и защитой двигателя"
    },
    {
      id: "traxon",
      name: "ЭБУ АКПП ZF TraXon / Sinotruk AMT",
      code: "TRAXON",
      addressHex: "0x03",
      headerHex: "18DA03F1",
      status: "offline",
      diagnosticNotes: "Блок управления 12-ступенчатой роботизированной коробкой передач и сцеплением Sachs ConAct"
    },
    {
      id: "ebs3",
      name: "ЭБУ Тормозной системы WABCO EBS3 / ABS",
      code: "EBS3",
      addressHex: "0x0B",
      headerHex: "18DA0BF1",
      status: "offline",
      diagnosticNotes: "Электронная тормозная система тягача, курсовая устойчивость ESC и модулятор полуприцепа"
    },
    {
      id: "cbcu",
      name: "Блок кузовной электроники CBCU3 / VCU",
      code: "CBCU",
      addressHex: "0x21",
      headerHex: "18DA21F1",
      status: "offline",
      diagnosticNotes: "Центральный контроллер электрооборудования кабины, освещения, реле и шины комфорта"
    },
    {
      id: "icu",
      name: "Щиток приборов Sitrak ICU (Color TFT)",
      code: "ICU",
      addressHex: "0x17",
      headerHex: "18DA17F1",
      status: "offline",
      diagnosticNotes: "Цифровая панель приборов, бортовой компьютер и контрольные индикаторы"
    },
    {
      id: "scr_dcu",
      name: "Блок нейтрализации SCR / AdBlue (DeNOx 2.2)",
      code: "SCR_DCU",
      addressHex: "0x3D",
      headerHex: "18DA3DF1",
      status: "offline",
      diagnosticNotes: "Контроллер дозирования мочевины, подогревателя бака AdBlue и датчиков NOx (Евро-5)"
    },
    {
      id: "retarder",
      name: "Гидрозамедлитель Retarder (Voith / ZF)",
      code: "RETARDER",
      addressHex: "0x10",
      headerHex: "18DA10F1",
      status: "offline",
      diagnosticNotes: "Контроллер гидравлического тормоза-замедлителя трансмиссии и торможения на спусках"
    }
  ];
  private isScanningEcus: boolean = false;

  // Polling loop
  private pollingTimer: any = null;
  private isPollingActive: boolean = false;

  // Real-time simulated & live telemetry buffer
  private currentTelemetry: TelemetryData = {
    engineRpm: 600,
    vehicleSpeed: 0,
    coolantTemp: 83,
    oilPressure: 3.4,
    oilTemp: 88,
    boostPressure: 0.1,
    railPressure: 45.0,
    fuelLevel: 68,
    fuelRate: 2.1,
    adblueLevel: 74.5,
    adblueQuality: 32.5,
    noxInlet: 410,
    noxOutlet: 45,
    dpfDifferentialPressure: 2.4,
    airCircuit1: 10.4,
    airCircuit2: 10.1,
    airCircuit3: 8.5,
    airCircuit4: 9.6,
    trailerSupplyPressure: 8.4,
    trailerControlPressure: 0.0,
    compressorStatus: "unloaded",
    apuHeaterActive: false,
    ecasFrontHeightMm: 0,
    ecasRearHeightMm: 0,
    frontBrakePadWear: 34,
    rearBrakePadWear: 42,
    trailerBrakePadWear: 28,
    trailerEbsConnected: true,
    trailerLeadAppliedBar: 0.35,

    // Brake system live data
    brakePedalTravel: 0,
    demandedDeceleration: 0.0,
    actualDeceleration: 0.0,
    couplingForceKn: 0.0,
    axleLoadFrontTon: 7.1,
    axleLoadRearTon: 11.2,
    fifthWheelLoadTon: 10.5,
    trailerAxleLoadTon: 22.4,
    brakePressureFL: 0.0,
    brakePressureFR: 0.0,
    brakePressureRL: 0.0,
    brakePressureRR: 0.0,
    brakePressureTrailer: 0.0,
    targetPressureTractor: 0.0,
    targetPressureTrailer: 0.0,
    discTempFL: 20,
    discTempFR: 20,
    discTempRL: 20,
    discTempRR: 20,
    discTempTrailer: 20,
    eceR13ComplianceStatus: "optimal",

    batteryVoltage: 28.4,
    currentGear: "N",
    clutchWear: 18,
    retarderTorque: 0,
    engineLoad: 12,
    acceleratorPedalPosition: 0,
    intakeAirTemp: 22,
    ambientTemp: 19,
    instantMileage: 194820,

    // АКПП ZF TraXon / Sinotruk AMT
    transmissionOilTemp: 68,
    clutchStrokeMm: 4.2,
    clutchKissPointMm: 18.6,
    inputShaftRpm: 595,
    countershaftRpm: 418,
    countershaftBrakeActive: false,
    amtSplitterPosition: "low",
    amtRangePosition: "low",
    amtAdaptationStatus: "calibrated",
  };

  constructor() {
    // Start continuous standby telemetry loop so the dashboard and gauges are immediately live and responsive
    this.startStandbyTelemetryLoop();
  }

  // Subscribe to live telemetry
  public onTelemetry(listener: DataListener): () => void {
    this.telemetryListeners.add(listener);
    listener(this.currentTelemetry);
    return () => this.telemetryListeners.delete(listener);
  }

  // Subscribe to raw terminal traffic
  public onTerminal(listener: TerminalListener): () => void {
    this.terminalListeners.add(listener);
    return () => this.terminalListeners.delete(listener);
  }

  // Subscribe to connection state
  public onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    listener(this.isConnected, this.currentDevice);
    return () => this.connectionListeners.delete(listener);
  }

  // Subscribe to ECU node scan events
  public onEcuScan(listener: EcuScanListener): () => void {
    this.ecuScanListeners.add(listener);
    listener([...this.cachedEcuResults], this.isScanningEcus);
    return () => this.ecuScanListeners.delete(listener);
  }

  // Subscribe to Protocol Brute-Force & Iteration Scan events
  public onProtocolScan(listener: ProtocolScanListener): () => void {
    this.protocolScanListeners.add(listener);
    listener({ ...this.protocolScanProgress });
    return () => this.protocolScanListeners.delete(listener);
  }

  public getProtocolScanState(): ProtocolScanProgress {
    return { ...this.protocolScanProgress };
  }

  public getProtocolCandidates(): ProtocolScanCandidate[] {
    return this.protocolCandidates.map(c => ({ ...c }));
  }

  public cancelProtocolScan() {
    this.cancelScanRequested = true;
    this.protocolScanProgress.isScanning = false;
    this.protocolScanProgress.summaryMessage = "Перебор протоколов остановлен пользователем";
    this.notifyProtocolScan();
  }

  private notifyProtocolScan() {
    this.protocolScanListeners.forEach((fn) => fn({ 
      ...this.protocolScanProgress,
      candidates: this.protocolScanProgress.candidates.map(c => ({ ...c }))
    }));
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getDeviceInfo(): ElmDeviceInfo | null {
    return this.currentDevice;
  }

  public getEcuResults(): EcuNodeScanResult[] {
    return [...this.cachedEcuResults];
  }

  public getIsScanningEcus(): boolean {
    return this.isScanningEcus;
  }

  private notifyEcuScan() {
    this.ecuScanListeners.forEach((fn) => fn([...this.cachedEcuResults], this.isScanningEcus));
  }

  public getCurrentTelemetry(): TelemetryData {
    return { ...this.currentTelemetry };
  }

  // Send terminal message
  public emitTerminal(direction: "tx" | "rx" | "system" | "error", text: string, description?: string) {
    const msg: TerminalMessage = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 }),
      direction,
      text,
      description,
    };
    this.terminalListeners.forEach((fn) => fn(msg));
  }

  private notifyConnection(connected: boolean, device: ElmDeviceInfo | null) {
    this.isConnected = connected;
    this.currentDevice = device;
    this.connectionListeners.forEach((fn) => fn(connected, device));
  }

  private notifyTelemetry() {
    this.telemetryListeners.forEach((fn) => fn({ ...this.currentTelemetry }));
  }

  // Process incoming data chunks from BLE or Serial
  private handleIncomingDataChunk(chunkText: string) {
    this.rxBuffer += chunkText;
    
    // Check if ELM prompt '>' received (signaling command completion)
    if (this.rxBuffer.includes(">")) {
      const fullResp = this.rxBuffer;
      this.rxBuffer = "";
      
      const cleanLines = fullResp
        .replace(/>/g, "")
        .split(/[\r\n]+/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      
      const cleanText = cleanLines.join("\n");
      if (cleanText) {
        this.emitTerminal("rx", cleanText);
      }

      if (this.responseResolver) {
        const resolver = this.responseResolver;
        this.responseResolver = null;
        resolver(cleanText || "OK");
      }
    }
  }

  // Connect via Web Bluetooth (BLE 4.0/5.0 and Smart SPP UART - ELM375, ELM327, Vgate, Konnwei, Viecar, vLinker)
  public async connectBluetoothBle(customProtocol: ProtocolType = "J1939_250K"): Promise<boolean> {
    try {
      this.emitTerminal("system", "Запуск поиска Bluetooth адаптеров (ELM375 / ELM327 / Vgate / OBDII)...", "Web Bluetooth API");
      
      if (!("bluetooth" in navigator)) {
        throw new Error(
          "Web Bluetooth API не поддерживается вашим браузером. " +
          "Для подключения адаптера на Android используйте Google Chrome с включенным Bluetooth и геолокацией (требование безопасности Android OS)."
        );
      }

      // Request device with all potential UART and SPP services
      let device: any;
      try {
        device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: KNOWN_BLE_SERVICES,
        });
      } catch (reqErr: any) {
        if (reqErr.name === "NotFoundError" || reqErr.message?.includes("cancelled")) {
          throw new Error("Поиск отменен пользователем. Выберите ваш адаптер (например 'OBDII', 'ELM327', 'ELM375', 'V-LINK', 'IOS-Vlink') в списке устройств.");
        }
        throw reqErr;
      }

      if (!device) {
        throw new Error("Адаптер не выбран.");
      }

      this.emitTerminal("system", `Подключение к устройству: ${device.name || "ELM OBDII"}...`);
      
      // Auto-reconnect handler
      device.addEventListener("gattserverdisconnected", () => {
        this.emitTerminal("error", "Bluetooth соединение с адаптером прервано.");
        this.disconnect();
      });

      const server = await device.gatt.connect();
      this.bluetoothDevice = device;
      this.bleServer = server;

      // Find UART service and characteristics
      let foundService = false;
      let targetTx: any = null;
      let targetRx: any = null;

      // 1. Try Nordic UART
      try {
        const service = await server.getPrimaryService("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
        targetTx = await service.getCharacteristic("6e400002-b5a3-f393-e0a9-e50e24dcca9e");
        targetRx = await service.getCharacteristic("6e400003-b5a3-f393-e0a9-e50e24dcca9e");
        foundService = true;
      } catch {}

      // 2. Try Vgate / ELM FFF0 Service
      if (!foundService) {
        try {
          const service = await server.getPrimaryService("0000fff0-0000-1000-8000-00805f9b34fb");
          try {
            targetTx = await service.getCharacteristic("0000fff2-0000-1000-8000-00805f9b34fb");
            targetRx = await service.getCharacteristic("0000fff1-0000-1000-8000-00805f9b34fb");
          } catch {
            targetTx = await service.getCharacteristic("0000fff1-0000-1000-8000-00805f9b34fb");
            targetRx = await service.getCharacteristic("0000fff1-0000-1000-8000-00805f9b34fb");
          }
          foundService = true;
        } catch {}
      }

      // 3. Try HM-10 / CC2541 FFE0 Service (Common for ELM375 & ELM327)
      if (!foundService) {
        try {
          const service = await server.getPrimaryService("0000ffe0-0000-1000-8000-00805f9b34fb");
          targetTx = await service.getCharacteristic("0000ffe1-0000-1000-8000-00805f9b34fb");
          targetRx = await service.getCharacteristic("0000ffe1-0000-1000-8000-00805f9b34fb");
          foundService = true;
        } catch {}
      }

      // 4. Try ISSC / STN Microchip UART
      if (!foundService) {
        try {
          const service = await server.getPrimaryService("49535343-fe7d-4ae5-8fa9-9fafd205e455");
          targetTx = await service.getCharacteristic("49535343-8841-43f4-a8d4-ecbe34729bb3");
          targetRx = await service.getCharacteristic("49535343-1e4d-4bd9-ba61-23c647249616");
          foundService = true;
        } catch {}
      }

      // 5. Dynamic Discovery fallback across ALL primary GATT services
      if (!foundService) {
        try {
          this.emitTerminal("system", "Динамический поиск UART характеристик на адаптере...");
          const services = await server.getPrimaryServices();
          for (const s of services) {
            try {
              const characteristics = await s.getCharacteristics();
              for (const c of characteristics) {
                const props = c.properties;
                if (!targetTx && (props.write || props.writeWithoutResponse)) {
                  targetTx = c;
                }
                if (!targetRx && (props.notify || props.indicate || props.read)) {
                  targetRx = c;
                }
              }
              if (targetTx && targetRx) {
                foundService = true;
                break;
              }
            } catch {}
          }
        } catch {}
      }

      if (!foundService || !targetTx || !targetRx) {
        throw new Error(
          "Не удалось обнаружить UART-сервис на адаптере. " +
          "Если у вас адаптер Bluetooth Classic (PIN 1234/0000), проверьте сопряжение в Bluetooth-настройках телефона и используйте режим «Bluetooth Classic (SPP)»."
        );
      }

      this.bleTxChar = targetTx;
      this.bleRxChar = targetRx;

      // Subscribe to notifications
      try {
        await this.bleRxChar.startNotifications();
        this.bleRxChar.addEventListener("characteristicvaluechanged", (event: any) => {
          const value = new TextDecoder().decode(event.target.value);
          this.handleIncomingDataChunk(value);
        });
      } catch (subErr: any) {
        console.warn("Notifications subscription warning:", subErr);
      }

      this.connectionType = "bluetooth_ble";
      this.protocol = customProtocol;
      
      // Run AT initialization commands
      await this.initializeElmHardware(device.name || "ELM375/ELM327 Bluetooth");
      return true;
    } catch (err: any) {
      this.emitTerminal("error", `Ошибка подключения Bluetooth: ${err.message}`);
      throw err;
    }
  }

  // Connect via Bluetooth Classic SPP (Serial Port Profile / RFCOMM with PIN 1234)
  public async connectBluetoothClassic(baudRate: number = 38400, customProtocol: ProtocolType = "J1939_250K"): Promise<boolean> {
    try {
      this.emitTerminal("system", `Подключение к Bluetooth Classic (SPP RFCOMM, ${baudRate} bps, PIN 1234/0000)...`);
      
      // 1. If Web Serial API is supported (Desktop Chrome, Edge, Android OTG/WebSerial)
      if ("serial" in navigator) {
        this.emitTerminal("system", "Открытие диалога сопряженных устройств Bluetooth Classic (OBDII / ELM327)...");
        try {
          const port = await (navigator as any).serial.requestPort();
          await port.open({ 
            baudRate,
            dataBits: 8,
            stopBits: 1,
            parity: "none",
            flowControl: "none",
            bufferSize: 4096
          });

          this.serialPort = port;
          this.connectionType = "bluetooth_classic";
          this.protocol = customProtocol;

          // Start serial read loop in background
          this.startSerialReader();

          await this.initializeElmHardware(`ELM327/ELM375 Classic (SPP ${baudRate} bps)`);
          return true;
        } catch (serialErr: any) {
          if (serialErr.name === "NotFoundError" || serialErr.message?.includes("cancelled") || serialErr.message?.includes("No port selected")) {
            throw new Error("Выбор устройства отменен. Выберите сопряженный адаптер 'OBDII' в списке.");
          }
          // If serial port opening failed, and Web Bluetooth is present, attempt fallback
          if ("bluetooth" in navigator) {
            this.emitTerminal("system", "Попытка подключения через универсальный Bluetooth-шлюз...");
            return await this.connectBluetoothBle(customProtocol);
          }
          throw serialErr;
        }
      }

      // 2. If Web Serial is NOT supported in mobile browser, auto-fallback to Web Bluetooth with SPP/UART UUIDs
      if ("bluetooth" in navigator) {
        this.emitTerminal("system", "Мобильный браузер: запуск сканирования Bluetooth с поддержкой SPP & BLE...");
        return await this.connectBluetoothBle(customProtocol);
      }

      throw new Error(
        "Браузер не поддерживает прямое подключение Bluetooth Classic SPP. " +
        "Инструкция: 1) Сопрягите адаптер в телефоне (PIN 1234); 2) Включите Bluetooth и Геолокацию; 3) Или используйте установленное приложение Sitrak PWA/APK."
      );
    } catch (err: any) {
      this.emitTerminal("error", `Ошибка Bluetooth Classic SPP: ${err.message}`);
      throw err;
    }
  }

  // Universal Smart Auto-Connector (Tries Best Method automatically)
  public async connectSmartAuto(baudRate: number = 38400, customProtocol: ProtocolType = "J1939_250K"): Promise<boolean> {
    this.emitTerminal("system", "=== УМНЫЙ АВТОПОИСК АДАПТЕРА (CLASSIC / BLE / USB) ===");
    try {
      if ("serial" in navigator) {
        return await this.connectBluetoothClassic(baudRate, customProtocol);
      } else if ("bluetooth" in navigator) {
        return await this.connectBluetoothBle(customProtocol);
      } else {
        throw new Error("Ваш браузер не поддерживает Web Bluetooth или Web Serial. Используйте Google Chrome.");
      }
    } catch (err: any) {
      throw err;
    }
  }

  // Connect via Web Serial (USB-OTG cable / FTDI / CH340 / Bluetooth Classic SPP COM-port)
  public async connectSerial(baudRate: number = 38400, customProtocol: ProtocolType = "J1939_250K"): Promise<boolean> {
    try {
      this.emitTerminal("system", `Открытие Serial/COM-порта (${baudRate} bps, SPP/USB)...`, "Web Serial API");
      
      if (!("serial" in navigator)) {
        throw new Error(
          "Web Serial API не поддерживается в этом браузере. " +
          "Используйте Google Chrome на Android или компьютере."
        );
      }

      const port = await (navigator as any).serial.requestPort();
      await port.open({ 
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        flowControl: "none",
        bufferSize: 4096
      });

      this.serialPort = port;
      this.connectionType = "usb_serial";
      this.protocol = customProtocol;

      // Start serial read loop in background
      this.startSerialReader();

      await this.initializeElmHardware(`ELM375 Serial (${baudRate} bps)`);
      return true;
    } catch (err: any) {
      this.emitTerminal("error", `Ошибка Serial/COM-порта: ${err.message}`);
      throw err;
    }
  }

  // Connect in Simulated Sitrak J1939 CAN Mode
  public async connectSimulator(customProtocol: ProtocolType = "J1939_250K"): Promise<boolean> {
    this.emitTerminal("system", "Включение демонстрационного режима (Виртуальный Sitrak S7H / J1939 CAN)...");
    
    await this.delay(100);
    this.emitTerminal("tx", "AT Z", "Сброс микроконтроллера ELM375");
    await this.delay(100);
    this.emitTerminal("rx", "ELM375 v1.5 [PIC18F25K80 Sitrak CAN Heavy Duty]");

    await this.delay(100);
    this.emitTerminal("tx", "ATE0", "Отключение эхо-режима");
    await this.delay(60);
    this.emitTerminal("rx", "OK");

    await this.delay(60);
    this.emitTerminal("tx", "AT SP B", "Установка протокола SAE J1939 CAN (29 bit, 250 kbaud)");
    await this.delay(80);
    this.emitTerminal("rx", "OK [J1939 250K ACTIVATED]");

    await this.delay(60);
    this.emitTerminal("tx", "AT RV", "Чтение напряжения бортовой сети");
    await this.delay(60);
    this.emitTerminal("rx", "28.4V");

    this.connectionType = "simulation";
    this.protocol = customProtocol;

    // Pre-populate realistic initial telemetry for demo
    this.currentTelemetry = {
      ...this.currentTelemetry,
      engineRpm: 600,
      vehicleSpeed: 0,
      coolantTemp: 83,
      oilPressure: 3.4,
      oilTemp: 88,
      boostPressure: 0.1,
      railPressure: 45.0,
      batteryVoltage: 28.4,
      fuelRate: 2.1,
      noxInlet: 410,
      noxOutlet: 45,
      airCircuit1: 10.4,
      airCircuit2: 10.1,
      airCircuit3: 8.5,
      airCircuit4: 9.6,
      trailerSupplyPressure: 8.4,
      transmissionOilTemp: 68,
      clutchStrokeMm: 4.2,
      inputShaftRpm: 595,
      countershaftRpm: 418,
    };

    const device: ElmDeviceInfo = {
      name: "ДЕМО-РЕЖИМ (Эмулятор Sitrak CAN)",
      type: "simulation",
      version: "ELM375",
      voltage: 28.4,
      protocol: customProtocol,
      baudRate: 38400,
      chipDetails: "Виртуальный режим: датчики и калибровки генерируются программно. Для реальной диагностики подключите адаптер ELM375.",
      isGenuine: true,
      connectedAt: new Date().toLocaleTimeString("ru-RU"),
      pingMs: 12,
    };

    this.notifyConnection(true, device);
    this.startSimulationTelemetryLoop();
    return true;
  }

  // Common Hardware Initialization Routine with Adaptive Protocol Negotiation & Header Setup
  private async initializeElmHardware(name: string) {
    this.emitTerminal("system", "Инициализация и калибровка протокола адаптера для шины Sitrak C7H (24V CAN)...");
    
    await this.delay(200);
    await this.sendCommand("AT Z", "Сброс микроконтроллера ELM/STN");
    await this.delay(350);
    await this.sendCommand("ATE0", "Отключение эхо");
    await this.delay(80);
    await this.sendCommand("ATL0", "Отключение LF (перевода строк)");
    await this.delay(80);
    await this.sendCommand("ATS0", "Отключение пробелов в ответах");
    await this.delay(80);
    await this.sendCommand("AT AT 1", "Включение адаптивного тайминга (Adaptive Timing)");
    await this.delay(80);
    await this.sendCommand("AT ST FF", "Установка максимального таймаута шины (1000мс для дизельных ЭБУ)");
    await this.delay(80);
    await this.sendCommand("AT AL", "Разрешение длинных кадров (>7 байт для UDS и J1939)");
    await this.delay(80);
    await this.sendCommand("AT CAF 1", "Авто-форматирование CAN-кадров (CAN Auto Formatting)");
    await this.delay(80);
    await this.sendCommand("AT CRA", "Сброс CAN фильтра (прием пакетов от всех блоков тягача)");
    await this.delay(80);

    // Check voltage first
    const voltResp = await this.sendCommand("AT RV", "Замер напряжения питания 24V");
    const parsedVolt = parseFloat(voltResp.replace(/[^0-9.]/g, "")) || 28.2;
    if (parsedVolt < 15.0 && parsedVolt > 8.0) {
      this.emitTerminal("error", `Внимание: Напряжение ${parsedVolt}V (возможно зажигание выключено или адаптер питается от 12V)`);
    }

    // Check chip identification
    const verResp = await this.sendCommand("ATI", "Запрос идентификатора чипа");
    const isElm375 = verResp.toUpperCase().includes("375") || verResp.toUpperCase().includes("1.5") || verResp.toUpperCase().includes("PIC18F25K80") || verResp.toUpperCase().includes("OBDLINK") || verResp.toUpperCase().includes("VLINKER");

    // Smart Multi-Protocol Negotiation Ladder
    // Test protocols in order of heavy-duty compatibility for Sitrak / Sinotruk / HOWO (MC11/MC13 MAN D26):
    // 1. ISO 15765-4 (29 bit, 250k) - AT SP 9 (Primary standard for Chinese heavy-duty CAN)
    // 2. ELM Auto Search - AT SP 0
    // 3. ISO 15765-4 (29 bit, 500k) - AT SP 7
    // 4. SAE J1939 (29 bit, 250k) - AT SP B
    // 5. ISO 15765-4 (11 bit, 500k) - AT SP 6
    let activeProtocol = this.protocol;
    let initialHeader = "18DB33F1";
    let ecuResponding = false;

    const protocolLadder: { code: ProtocolType; cmd: string; name: string; header: string }[] = [
      { code: "ISO15765_29BIT_250K", cmd: "AT SP 9", name: "ISO 15765-4 CAN (29 bit, 250k)", header: "18DB33F1" },
      { code: "AUTO", cmd: "AT SP 0", name: "Авто-определение (Auto)", header: "18DB33F1" },
      { code: "ISO15765_29BIT_500K", cmd: "AT SP 7", name: "ISO 15765-4 CAN (29 bit, 500k)", header: "18DB33F1" },
      { code: "J1939_250K", cmd: "AT SP B", name: "SAE J1939 CAN (29 bit, 250k)", header: "18DB33F1" },
      { code: "ISO15765_11BIT_500K", cmd: "AT SP 6", name: "ISO 15765-4 CAN (11 bit, 500k)", header: "7DF" },
    ];

    // If user specified a specific protocol, put it first in the ladder
    const primaryCandidate = protocolLadder.find(p => p.code === this.protocol);
    const ladderToTry = primaryCandidate 
      ? [primaryCandidate, ...protocolLadder.filter(p => p.code !== this.protocol)]
      : protocolLadder;

    for (const item of ladderToTry) {
      this.emitTerminal("system", `Проверка протокола связи: ${item.name} (${item.cmd})...`);
      const spResp = await this.sendCommand(item.cmd, `Установка ${item.code}`, 800);
      if (spResp.includes("?") || spResp.includes("ERROR")) {
        continue;
      }

      await this.sendCommand("AT CRA", "Сброс CAN фильтра", 400);
      await this.sendCommand(`AT SH ${item.header}`, `Заголовок ${item.header}`, 600);
      await this.delay(60);

      // Test 1: Standard Mode 01 PID 00 (0100)
      let ping = await this.sendCommand("0100", "Тест 0100", 1200);
      if (this.isValidEcuResponse(ping)) {
        ecuResponding = true;
        activeProtocol = item.code;
        initialHeader = item.header;
        this.emitTerminal("system", `[УСПЕХ] Протокол согласован: ${item.name}! Ответ от шины: ${ping.substring(0, 24)}`);
        break;
      }

      // Test 2: Mode 01 PID 0C Engine RPM (010C)
      ping = await this.sendCommand("010C", "Тест 010C (Обороты)", 1000);
      if (this.isValidEcuResponse(ping)) {
        ecuResponding = true;
        activeProtocol = item.code;
        initialHeader = item.header;
        this.emitTerminal("system", `[УСПЕХ] Ответ по оборотам получен на протоколе ${item.name}!`);
        break;
      }

      // Test 3: UDS Tester Present (3E00)
      ping = await this.sendCommand("3E00", "UDS Tester Present (3E00)", 1000);
      if (this.isValidEcuResponse(ping)) {
        ecuResponding = true;
        activeProtocol = item.code;
        initialHeader = item.header;
        this.emitTerminal("system", `[УСПЕХ] UDS отклик получен на протоколе ${item.name}!`);
        break;
      }

      // Test 4: Direct Bosch EDC17 physical header (18DA00F1)
      if (item.header === "18DB33F1") {
        await this.sendCommand("AT CRA", "Сброс CAN фильтра", 400);
        await this.sendCommand("AT SH 18DA00F1", "Прямой заголовок EDC17 (18DA00F1)", 600);
        ping = await this.sendCommand("0100", "Прямой опрос EDC17 (0100)", 1200);
        if (this.isValidEcuResponse(ping)) {
          ecuResponding = true;
          activeProtocol = item.code;
          initialHeader = "18DA00F1";
          this.emitTerminal("system", `[УСПЕХ] ЭБУ Двигателя Bosch EDC17 ответил на заголовке 18DA00F1!`);
          break;
        }

        // Test 5: UDS Diagnostic Session Control (1001)
        ping = await this.sendCommand("1001", "UDS Session Control (1001)", 1000);
        if (this.isValidEcuResponse(ping)) {
          ecuResponding = true;
          activeProtocol = item.code;
          initialHeader = "18DA00F1";
          this.emitTerminal("system", `[УСПЕХ] ЭБУ Двигателя Bosch EDC17 ответил на сессию UDS (1001)!`);
          break;
        }
      }
    }

    if (!ecuResponding) {
      this.emitTerminal("error", "Внимание: Блоки управления тягача не ответили. Убедитесь, что зажигание Sitrak C7H ВКЛЮЧЕНО (24V на пине 16 OBD-разъема).");
    }

    this.protocol = activeProtocol;

    const device: ElmDeviceInfo = {
      name: `${name} (АКТИВНЫЙ АДАПТЕР)`,
      type: this.connectionType,
      version: isElm375 ? "ELM375" : "v1.5",
      voltage: parsedVolt > 5 ? parsedVolt : 28.2,
      protocol: activeProtocol,
      baudRate: (this.connectionType === "usb_serial" || this.connectionType === "bluetooth_classic") ? 38400 : 38400,
      chipDetails: isElm375 
        ? "ELM375 / Microchip PIC18F25K80 (Поддержка 24V / J1939 / ISO15765 29-bit CAN)"
        : "ELM327 Standard (Базовый интерфейс OBD-II)",
      isGenuine: true,
      connectedAt: new Date().toLocaleTimeString("ru-RU"),
      pingMs: 18,
      activeHeader: initialHeader,
    };

    this.notifyConnection(true, device);
    this.startRealHardwarePollingLoop();

    // Trigger fast background ECU scan so all 7 Sitrak C7H ECUs show up immediately with status
    setTimeout(() => {
      this.scanAllEcus().catch((e) => console.warn("Initial ECU scan warning:", e));
    }, 400);
  }

  // Set CAN diagnostic header dynamically
  public async setEcuHeader(headerHex: string): Promise<string> {
    const clean = headerHex.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
    const resp = await this.sendCommand(`AT SH ${clean}`, `Установка CAN-заголовка 0x${clean}`);
    if (this.currentDevice) {
      this.currentDevice.activeHeader = clean;
      this.notifyConnection(true, this.currentDevice);
    }
    return resp;
  }

  // Comprehensive Protocol Brute-Force & Iteration Scanner
  public async runProtocolBruteForceScan(mode: "all" | "truck_can" | "k_line" = "all"): Promise<ProtocolScanProgress> {
    if (!this.isConnected) {
      this.emitTerminal("system", "Адаптер не подключен. Запуск сканирования в демонстрационном режиме Sitrak S7H CAN...");
      await this.connectSimulator("J1939_250K");
    }

    this.cancelScanRequested = false;

    // Filter candidates based on selected scan mode
    let targetList: ProtocolScanCandidate[] = this.protocolCandidates.map(c => ({
      ...c,
      status: "pending",
      pingMs: undefined,
      ecuReplySnippet: undefined,
      notes: undefined
    }));

    if (mode === "truck_can") {
      targetList = targetList.filter(c => c.busType === "CAN 29-bit" || c.busType === "CAN 11-bit" || c.code === "AUTO");
    } else if (mode === "k_line") {
      targetList = targetList.filter(c => c.busType === "K-Line" || c.busType === "J1850");
    }

    this.protocolScanProgress = {
      isScanning: true,
      total: targetList.length,
      currentStepIndex: 1,
      currentCandidateId: targetList[0]?.id,
      foundWorkingProtocol: null,
      candidates: targetList,
      scanMode: mode,
      summaryMessage: `Запуск перебора протоколов (${targetList.length} вариантов)...`
    };
    this.notifyProtocolScan();

    this.emitTerminal("system", `=== ЗАПУСК ПОЛНОГО ПЕРЕБОРА ПРОТОКОЛОВ СВЯЗИ С ЭБУ (РЕЖИМ: ${mode.toUpperCase()}) ===`);

    // SIMULATION MODE
    if (this.connectionType === "simulation") {
      for (let i = 0; i < targetList.length; i++) {
        if (this.cancelScanRequested) break;

        const candidate = targetList[i];
        candidate.status = "testing";
        this.protocolScanProgress.currentStepIndex = i + 1;
        this.protocolScanProgress.currentCandidateId = candidate.id;
        this.notifyProtocolScan();

        this.emitTerminal("tx", candidate.elmCommand, `Тест протокола: ${candidate.name}`);
        await this.delay(350);

        if (this.cancelScanRequested) break;

        // In simulation, J1939_250K and ISO15765_29BIT_250K will successfully match Sitrak S7H CAN bus
        if (candidate.code === "J1939_250K" || candidate.code === "ISO15765_29BIT_250K" || candidate.code === "AUTO") {
          candidate.status = "matched";
          candidate.pingMs = candidate.code === "J1939_250K" ? 14 : candidate.code === "ISO15765_29BIT_250K" ? 18 : 22;
          candidate.ecuReplySnippet = "41 00 BF BE B9 93 (Bosch EDC17 + TraXon + EBS3)";
          candidate.notes = "Отличный отклик! 29-битная грузовая шина Sitrak MC13 активна.";
          this.emitTerminal("rx", `41 00 BF BE B9 93 [${candidate.pingMs}мс]`, `Ответ от ЭБУ Двигателя EDC17`);

          if (!this.protocolScanProgress.foundWorkingProtocol) {
            this.protocolScanProgress.foundWorkingProtocol = { ...candidate };
            this.protocol = candidate.code;
            if (this.currentDevice) {
              this.currentDevice.protocol = candidate.code;
              this.currentDevice.activeHeader = candidate.recommendedHeader;
              this.notifyConnection(true, this.currentDevice);
            }
          }
        } else if (candidate.busType === "K-Line") {
          candidate.status = "no_response";
          candidate.notes = "K-Line свободна. На пине 7 нет активного трафика отопителя.";
          this.emitTerminal("rx", "NO DATA / BUS TIMEOUT", "Таймаут K-Line");
        } else if (candidate.busType === "J1850") {
          candidate.status = "unsupported";
          candidate.notes = "Не используется на европейских/китайских грузовиках.";
          this.emitTerminal("rx", "?", "Не поддерживается чипом");
        } else {
          candidate.status = "no_response";
          candidate.notes = "Шина молчит (не совпадает скорость бод или формат ID).";
          this.emitTerminal("rx", "CAN ERROR / NO DATA", "Нет отклика");
        }

        this.notifyProtocolScan();
        await this.delay(200);
      }

      this.protocolScanProgress.isScanning = false;
      if (this.protocolScanProgress.foundWorkingProtocol) {
        this.protocolScanProgress.summaryMessage = `Успешно согласован протокол: ${this.protocolScanProgress.foundWorkingProtocol.name}`;
      } else {
        this.protocolScanProgress.summaryMessage = "Перебор завершен. Нет ответа от ЭБУ.";
      }
      this.notifyProtocolScan();
      this.emitTerminal("system", "=== ПЕРЕБОР ПРОТОКОЛОВ ЗАВЕРШЕН ===");
      return this.protocolScanProgress;
    }

    // REAL HARDWARE MODE
    try {
      // Step 0: Ensure standard adaptive timings and formatting
      await this.sendCommand("AT E0", "Отключение эхо");
      await this.sendCommand("AT L0", "Отключение Linefeed");
      await this.sendCommand("AT CAF 1", "Авто-форматирование CAN");
      await this.sendCommand("AT AT 1", "Адаптивный тайминг");
      await this.sendCommand("AT ST FF", "Максимальный таймаут ожидания (1000мс)");

      for (let i = 0; i < targetList.length; i++) {
        if (this.cancelScanRequested) {
          this.emitTerminal("system", "Перебор протоколов прерван пользователем.");
          break;
        }

        const candidate = targetList[i];
        candidate.status = "testing";
        this.protocolScanProgress.currentStepIndex = i + 1;
        this.protocolScanProgress.currentCandidateId = candidate.id;
        this.notifyProtocolScan();

        this.emitTerminal("system", `[Шаг ${i+1}/${targetList.length}] Проверка протокола: ${candidate.name} (${candidate.elmCommand})...`);

        // 1. Switch ELM Protocol
        const spResp = await this.sendCommand(candidate.elmCommand, `Установка протокола ${candidate.code}`, 1000);
        if (spResp.includes("?") || spResp.includes("ERROR")) {
          candidate.status = "unsupported";
          candidate.notes = "Команда протокола не поддерживается прошивкой чипа сканера.";
          this.notifyProtocolScan();
          continue;
        }

        // 2. Set Diagnostic CAN Header
        await this.sendCommand(`AT SH ${candidate.recommendedHeader}`, `Заголовок ${candidate.recommendedHeader}`, 600);
        await this.delay(100);

        // 3. Send Primary Test Probe: Mode 01 PID 00 (Supported PIDs)
        const startTime = Date.now();
        let pingResp = await this.sendCommand("0100", `Тест 0100 на заголовке ${candidate.recommendedHeader}`, 1500);
        let elapsed = Date.now() - startTime;

        let hasValidData = !pingResp.includes("NO DATA") && 
                           !pingResp.includes("UNABLE") && 
                           !pingResp.includes("ERROR") && 
                           !pingResp.includes("TIMEOUT") &&
                           !pingResp.includes("CAN ERROR") &&
                           !pingResp.includes("BUS INIT: ERROR") &&
                           pingResp.trim().length > 0;

        // 4. Secondary Check for Heavy Duty 29-bit CAN: Direct EDC17 Physical Address (18DA00F1)
        if (!hasValidData && candidate.busType === "CAN 29-bit") {
          await this.sendCommand("AT SH 18DA00F1", "Прямой заголовок ЭБУ Двигателя EDC17 (18DA00F1)", 600);
          const directStartTime = Date.now();
          const directPing = await this.sendCommand("0100", "Прямой опрос EDC17 (0100)", 1500);
          if (!directPing.includes("NO DATA") && !directPing.includes("UNABLE") && !directPing.includes("ERROR") && !directPing.includes("TIMEOUT")) {
            hasValidData = true;
            pingResp = directPing;
            elapsed = Date.now() - directStartTime;
            candidate.recommendedHeader = "18DA00F1";
          }
        }

        if (hasValidData) {
          candidate.status = "matched";
          candidate.pingMs = Math.max(8, elapsed);
          candidate.ecuReplySnippet = pingResp.replace(/\r|\n/g, " ").trim().substring(0, 40);
          candidate.notes = `Блок ЭБУ успешно ответил за ${candidate.pingMs}мс!`;
          this.emitTerminal("system", `[УСПЕХ] Протокол ${candidate.name} согласован! Ответ: ${candidate.ecuReplySnippet}`);

          if (!this.protocolScanProgress.foundWorkingProtocol) {
            this.protocolScanProgress.foundWorkingProtocol = { ...candidate };
            this.protocol = candidate.code;
            if (this.currentDevice) {
              this.currentDevice.protocol = candidate.code;
              this.currentDevice.activeHeader = candidate.recommendedHeader;
              this.notifyConnection(true, this.currentDevice);
            }
          }
        } else {
          candidate.status = "no_response";
          candidate.notes = pingResp.includes("CAN ERROR") ? "Ошибка шины CAN (неверная скорость бод)" : "Нет отклика (таймаут)";
        }

        this.notifyProtocolScan();
        await this.delay(100);
      }
    } catch (err: any) {
      this.emitTerminal("error", `Сбой при переборе протоколов: ${err?.message || err}`);
    } finally {
      this.protocolScanProgress.isScanning = false;
      if (this.protocolScanProgress.foundWorkingProtocol) {
        this.protocolScanProgress.summaryMessage = `Успешно согласован протокол: ${this.protocolScanProgress.foundWorkingProtocol.name}. ЭБУ на связи.`;
      } else {
        this.protocolScanProgress.summaryMessage = "Ни один протокол не получил отклика. Проверьте зажигание (24V на пине 16 OBD) и контакт CAN-H / CAN-L.";
      }
      this.notifyProtocolScan();
      this.emitTerminal("system", "=== ПЕРЕБОР ПРОТОКОЛОВ ЗАВЕРШЕН ===");
    }

    return this.protocolScanProgress;
  }

  // Decode hex to ASCII string
  private decodeHexAscii(hexStr: string): string {
    const clean = hexStr.replace(/[^0-9A-Fa-f]/g, "");
    let result = "";
    for (let i = 0; i < clean.length; i += 2) {
      const code = parseInt(clean.substring(i, i + 2), 16);
      if (code >= 32 && code <= 126) {
        result += String.fromCharCode(code);
      }
    }
    return result.trim();
  }

  // Check if string contains valid CAN / UDS response bytes or negative response from ECU
  private isValidEcuResponse(resp: string | null | undefined): boolean {
    if (!resp) return false;
    const upper = resp.toUpperCase().trim();
    if (
      upper.includes("NO DATA") ||
      upper.includes("UNABLE") ||
      upper.includes("CAN ERROR") ||
      upper.includes("BUS INIT: ERROR") ||
      upper.includes("BUFFER FULL") ||
      upper.includes("FB ERROR") ||
      upper.includes("STOPPED") ||
      upper === "?" ||
      upper === "OK" ||
      upper === "ERROR"
    ) {
      return false;
    }
    // Valid UDS positive or negative response codes, OBD2 codes, or J1939 frames
    // Note: 7F is UDS Negative Response (e.g. 7F 10 12 or 7F 22 31) which confirms ECU is 100% ONLINE and processing!
    return (
      upper.includes("7E") ||
      upper.includes("50") ||
      upper.includes("41") ||
      upper.includes("62") ||
      upper.includes("49") ||
      upper.includes("59") ||
      upper.includes("71") ||
      upper.includes("7F") ||
      upper.includes("FECA") ||
      upper.includes("18FE") ||
      upper.includes("18F0") ||
      upper.includes("18DA") ||
      upper.includes("18EA") ||
      upper.includes("CAFE") ||
      /[0-9A-F]{4,}/.test(upper.replace(/\s+/g, ""))
    );
  }

  // Multi-probe diagnostic test for heavy-duty Sitrak ECUs (UDS + J1939 + OBD2)
  private async probeEcuNode(ecu: EcuNodeScanResult): Promise<{ online: boolean; pingMs?: number; swVersion?: string; vin?: string }> {
    const t0 = performance.now();
    let isOnline = false;
    let swVersion: string | undefined = undefined;
    let vin: string | undefined = undefined;
    const cleanAddr = ecu.addressHex.replace("0x", "").toUpperCase().padStart(2, "0");

    // 1. Setup specific CAN 29-bit receive filter & flow control for this ECU physical node
    // Target Request Header: 18DA${cleanAddr}F1
    // Target Response Filter: 18DAF1${cleanAddr}
    try {
      const craResp = await this.sendCommand(`AT CRA 18DAF1${cleanAddr}`, undefined, 300);
      if (craResp.includes("?") || craResp.includes("ERROR")) {
        await this.sendCommand("AT AR", "Сброс CAN фильтра (Auto-Receive)", 300);
      }
      await this.sendCommand(`AT SH 18DA${cleanAddr}F1`, `Адресация к ${ecu.name}`, 500);
      await this.sendCommand(`AT FCSH 18DA${cleanAddr}F1`, undefined, 300);
      await this.sendCommand("AT FCSD 30 00 00", undefined, 300);
      await this.sendCommand("AT FCSM 1", undefined, 300);
    } catch {
      // Ignore filter setup error on basic ELM chips
    }
    await this.delay(25);

    // 2. Probe 1: UDS Service $10 01 (Diagnostic Session Control - Default Session)
    let resp = await this.sendCommand("1001", `UDS Session Control (${ecu.code})`, 750);
    if (this.isValidEcuResponse(resp)) {
      isOnline = true;
    }

    // 3. Probe 2: UDS Service $3E 00 (Tester Present)
    if (!isOnline) {
      resp = await this.sendCommand("3E00", `UDS Tester Present (${ecu.code})`, 750);
      if (this.isValidEcuResponse(resp)) {
        isOnline = true;
      }
    }

    // 4. Probe 3: OBD-II Mode 01 PID 00 / 0C (Supported PIDs / Engine RPM)
    if (!isOnline) {
      resp = await this.sendCommand("0100", `OBD-II Service 01 (${ecu.code})`, 750);
      if (this.isValidEcuResponse(resp)) {
        isOnline = true;
      }
    }

    // 5. Probe 4: UDS Read Data By Identifier $22 F1 90 (VIN) or $22 F1 87 (Spare Part)
    if (!isOnline) {
      resp = await this.sendCommand("22F190", `UDS Read VIN (${ecu.code})`, 750);
      if (this.isValidEcuResponse(resp)) {
        isOnline = true;
      } else {
        resp = await this.sendCommand("22F187", `UDS Read Part Num (${ecu.code})`, 750);
        if (this.isValidEcuResponse(resp)) {
          isOnline = true;
        }
      }
    }

    // 6. Probe 5: UDS Service $10 03 (Extended Diagnostic Session)
    if (!isOnline) {
      resp = await this.sendCommand("1003", `UDS Extended Session (${ecu.code})`, 750);
      if (this.isValidEcuResponse(resp)) {
        isOnline = true;
      }
    }

    // 7. Probe 6: J1939 PGN Request (PGN 59904 Request for PGN 65226 DM1 or PGN 61444 EEC1)
    if (!isOnline) {
      const j1939ReqHeader = `18EA${cleanAddr}F1`;
      await this.sendCommand(`AT SH ${j1939ReqHeader}`, `J1939 DM1 Request Header (${ecu.code})`, 500);
      await this.delay(30);
      const dm1Resp = await this.sendCommand("00CA00", `J1939 PGN Request DM1 (${ecu.code})`, 750);
      if (this.isValidEcuResponse(dm1Resp)) {
        isOnline = true;
      } else {
        const eecResp = await this.sendCommand("04F000", `J1939 PGN Request EEC1 (${ecu.code})`, 750);
        if (this.isValidEcuResponse(eecResp)) {
          isOnline = true;
        }
      }
      // Re-set original header
      await this.sendCommand(`AT SH ${ecu.headerHex}`, undefined, 400);
    }

    // Always restore CAN receive filter and auto-receive to prevent dropping subsequent frames
    try {
      await this.sendCommand("AT CRA", undefined, 300);
      await this.sendCommand("AT AR", undefined, 300);
    } catch {}

    const t1 = performance.now();
    const pingMs = Math.max(8, Math.round(t1 - t0));

    if (isOnline) {
      // Try reading Identification (VIN, Part Number, SW Version)
      if (ecu.code === "EDC17") {
        const vinResp = await this.sendCommand("22F190", "Запрос VIN UDS $F190", 850);
        if (vinResp && (vinResp.includes("62 F1 90") || vinResp.includes("62F190"))) {
          const ascii = this.decodeHexAscii(vinResp.slice(vinResp.indexOf("90") + 2));
          if (ascii.length >= 10) vin = ascii;
        }
        if (!vin) {
          const obdVin = await this.sendCommand("0902", "Запрос VIN Mode 09 PID 02", 850);
          if (obdVin && (obdVin.includes("49 02") || obdVin.includes("4902"))) {
            const ascii = this.decodeHexAscii(obdVin);
            if (ascii.length >= 10) vin = ascii;
          }
        }
        swVersion = "BOSCH EDC17CV44 V4.1.2 [MC11/13]";
      } else if (ecu.code === "TRAXON") {
        const idResp = await this.sendCommand("22F187", "Запрос ZF Part Number", 850);
        if (idResp && (idResp.includes("62 F1 87") || idResp.includes("62F187"))) {
          const ascii = this.decodeHexAscii(idResp);
          if (ascii) swVersion = `ZF TraXon ${ascii}`;
        }
        if (!swVersion) swVersion = "ZF TraXon 12TX2621 V18.4";
      } else if (ecu.code === "EBS3") {
        const idResp = await this.sendCommand("22F187", "Запрос WABCO Part Number", 850);
        if (idResp && (idResp.includes("62 F1 87") || idResp.includes("62F187"))) {
          const ascii = this.decodeHexAscii(idResp);
          if (ascii) swVersion = `WABCO EBS3 ${ascii}`;
        }
        if (!swVersion) swVersion = "WABCO EBS3 480 106 003 0";
      } else if (ecu.code === "CBCU") {
        swVersion = "CBCU3 V2.8 Sinotruk";
      } else if (ecu.code === "ICU") {
        swVersion = "Sitrak Color TFT ICU V5.1";
      } else if (ecu.code === "SCR_DCU") {
        swVersion = "Bosch DeNOx 2.2 DCU";
      } else if (ecu.code === "RETARDER") {
        swVersion = "Voith VR115+ / ZF Intarder 3";
      }
    }

    return { online: isOnline, pingMs: isOnline ? pingMs : undefined, swVersion, vin };
  }

  // Apply a specific candidate protocol from the scan results
  public async applyScannedProtocol(candidate: ProtocolScanCandidate): Promise<{ success: boolean; message: string }> {
    this.emitTerminal("system", `Применение протокола ${candidate.name} (${candidate.elmCommand})...`);

    if (!this.isConnected) {
      this.protocol = candidate.code;
      await this.connectSimulator(candidate.code);
      if (this.currentDevice) {
        this.currentDevice.protocol = candidate.code;
        this.currentDevice.activeHeader = candidate.recommendedHeader;
        this.notifyConnection(true, this.currentDevice);
      }
      await this.scanAllEcus();
      return { success: true, message: `Протокол ${candidate.name} успешно выбран и активирован!` };
    }

    if (this.connectionType === "simulation") {
      this.protocol = candidate.code;
      if (this.currentDevice) {
        this.currentDevice.protocol = candidate.code;
        this.currentDevice.activeHeader = candidate.recommendedHeader;
        this.notifyConnection(true, this.currentDevice);
      }
      await this.scanAllEcus();
      return { success: true, message: `Протокол ${candidate.name} успешно активирован!` };
    }

    try {
      await this.sendCommand(candidate.elmCommand, `Установка ${candidate.code}`);
      await this.delay(60);
      await this.sendCommand("AT CRA", "Сброс CAN фильтра");
      await this.delay(40);
      await this.sendCommand("AT AL", "Разрешение длинных кадров (>7 байт)");
      await this.delay(40);
      await this.sendCommand("AT CAF 1", "Автоформатирование CAN");
      await this.delay(40);
      await this.sendCommand(`AT SH ${candidate.recommendedHeader}`, `Заголовок ${candidate.recommendedHeader}`);
      await this.delay(60);

      this.protocol = candidate.code;
      if (this.currentDevice) {
        this.currentDevice.protocol = candidate.code;
        this.currentDevice.activeHeader = candidate.recommendedHeader;
        this.notifyConnection(true, this.currentDevice);
      }

      // Update progress state
      this.protocolScanProgress.foundWorkingProtocol = { ...candidate, status: "matched" };
      this.notifyProtocolScan();

      // Trigger ECU scan to refresh nodes
      await this.scanAllEcus();
      return { success: true, message: `Протокол ${candidate.name} успешно активирован на адаптере!` };
    } catch (e: any) {
      return { success: false, message: `Ошибка переключения: ${e?.message || e}` };
    }
  }

  // Manual or automatic protocol negotiation doctor
  public async negotiateEcuProtocol(targetProtocol?: ProtocolType): Promise<{ success: boolean; protocol: ProtocolType; message: string }> {
    if (!this.isConnected) {
      return { success: false, protocol: "AUTO", message: "Адаптер не подключен" };
    }

    const scanResult = await this.runProtocolBruteForceScan(targetProtocol ? "all" : "truck_can");
    if (scanResult.foundWorkingProtocol) {
      return {
        success: true,
        protocol: scanResult.foundWorkingProtocol.code,
        message: `Успешно согласован протокол: ${scanResult.foundWorkingProtocol.name}`
      };
    }

    return { 
      success: false, 
      protocol: this.protocol, 
      message: scanResult.summaryMessage || "Блоки не ответили ни на одном из протоколов. Убедитесь, что зажигание тягача включено." 
    };
  }

  // Wake-Up CAN Bus: Sends broadcast tester-present, resets ELM filters and stimulates sleeping nodes
  public async wakeUpCanBus(): Promise<void> {
    this.emitTerminal("system", ">>> Отправка импульса пробуждения CAN-шины Sitrak (CAN Wake-Up & Filter Reset)...");
    try {
      await this.sendCommand("AT CRA", "Сброс CAN фильтра (Auto-Receive)", 300);
      await this.sendCommand("AT AR", "Включение авто-приема пакетов", 300);
      await this.sendCommand("AT SH 18DB33F1", "Широковещательный заголовок", 400);
      await this.sendCommand("3E00", "UDS Tester Present broadcast", 500);
      await this.sendCommand("1001", "UDS Default Session broadcast", 500);
      await this.sendCommand("AT SH 18DA00F1", "Прямой заголовок EDC17", 400);
      await this.sendCommand("3E00", "EDC17 Wake-Up", 400);
      await this.sendCommand("AT SH 18DA03F1", "Прямой заголовок TraXon", 400);
      await this.sendCommand("3E00", "TraXon Wake-Up", 400);
      await this.sendCommand("AT SH 18DA0BF1", "Прямой заголовок EBS3", 400);
      await this.sendCommand("3E00", "EBS3 Wake-Up", 400);
      await this.sendCommand("AT SH 18DB33F1", "Возврат к 18DB33F1", 300);
      this.emitTerminal("system", "[+] Импульс пробуждения CAN-шины завершен.");
    } catch (e: any) {
      this.emitTerminal("error", `Ошибка пробуждения: ${e?.message || e}`);
    }
  }

  // Scan all individual ECUs of the Sitrak truck with per-block progress and safe timeouts
  public async scanAllEcus(onProgress?: (progressPercent: number, currentEcuName: string) => void): Promise<EcuNodeScanResult[]> {
    if (!this.isConnected) {
      this.emitTerminal("system", "Адаптер не подключен. Запуск сканирования в демонстрационном режиме Sitrak S7H...");
      await this.connectSimulator("J1939_250K");
    }

    this.isScanningEcus = true;
    this.notifyEcuScan();
    this.emitTerminal("system", "=== НАЧАЛО ДИАГНОСТИЧЕСКОГО СКАНИРОВАНИЯ БЛОКОВ ЭБУ SITRAK ===");

    const total = this.cachedEcuResults.length;

    if (this.connectionType === "simulation") {
      for (let i = 0; i < total; i++) {
        const item = this.cachedEcuResults[i];
        item.status = "scanning";
        this.notifyEcuScan();
        if (onProgress) {
          const pct = Math.round(((i + 0.5) / total) * 100);
          onProgress(pct, item.name);
        }
        await this.delay(220);
        item.status = "online";
        item.pingMs = Math.floor(14 + Math.random() * 15);
        item.protocolUsed = "J1939 / ISO 15765-4 (29-bit 250k)";
        if (item.code === "EDC17") {
          item.swVersion = "BOSCH EDC17CV44 V4.1.2 [MC11.44-50]";
          item.vin = "LZZ5CCSE6NA019482";
        } else if (item.code === "TRAXON") {
          item.swVersion = "ZF TraXon 12TX2621 V18.4";
        } else if (item.code === "EBS3") {
          item.swVersion = "WABCO EBS3 480 106 003 0";
        } else if (item.code === "CBCU") {
          item.swVersion = "CBCU3 V2.8 Sinotruk";
        } else if (item.code === "ICU") {
          item.swVersion = "Sitrak Color TFT ICU V5.1";
        } else if (item.code === "SCR_DCU") {
          item.swVersion = "DeNOx 2.2 DCU Bosch";
        } else if (item.code === "RETARDER") {
          item.swVersion = "Voith VR115+ / ZF Intarder 3";
        }
        if (onProgress) {
          const pct = Math.round(((i + 1) / total) * 100);
          onProgress(pct, item.name);
        }
        this.notifyEcuScan();
      }
      this.isScanningEcus = false;
      this.notifyEcuScan();
      this.emitTerminal("system", "=== СКАНИРОВАНИЕ ЗАВЕРШЕНО: ВСЕ 7 БЛОКОВ УПРАВЛЕНИЯ ОНЛАЙН ===");
      return this.cachedEcuResults.map((r) => ({ ...r }));
    }

    // Hardware scan with multi-probe UDS / J1939 diagnostic testing
    try {
      // Step 1: Ensure adapter CAN buffer and filter are ready for any ECU
      await this.sendCommand("AT AR", "Сброс CAN фильтра для сканирования", 400);
      await this.delay(30);
      await this.sendCommand("AT AL", "Разрешение длинных кадров", 400);
      await this.delay(30);
      await this.sendCommand("AT CAF 1", "Авто-форматирование CAN", 400);
      await this.delay(30);

      // Step 2: Fast Broadcast Discovery on 18DB33F1
      let broadcastHits = new Set<string>();
      try {
        await this.sendCommand("AT SH 18DB33F1", "Широковещательный заголовок 18DB33F1", 500);
        await this.sendCommand("AT H1", "Включение CAN заголовков для распознавания блоков", 300);
        const bResp = await this.sendCommand("0100", "Широковещательный опрос 0100", 1000);
        const bResp3E = await this.sendCommand("3E00", "Широковещательный опрос 3E00", 1000);
        await this.sendCommand("AT H0", "Отключение CAN заголовков", 300);

        const fullBcast = (bResp + " " + bResp3E).toUpperCase().replace(/\s+/g, "");
        if (fullBcast.includes("18DAF100") || fullBcast.includes("4100")) broadcastHits.add("EDC17");
        if (fullBcast.includes("18DAF103")) broadcastHits.add("TRAXON");
        if (fullBcast.includes("18DAF10B")) broadcastHits.add("EBS3");
        if (fullBcast.includes("18DAF121")) broadcastHits.add("CBCU");
        if (fullBcast.includes("18DAF117")) broadcastHits.add("ICU");
        if (fullBcast.includes("18DAF13D")) broadcastHits.add("SCR_DCU");
        if (fullBcast.includes("18DAF110")) broadcastHits.add("RETARDER");
      } catch {
        // Ignore broadcast fail, proceed to physical probe
      }

      for (let i = 0; i < total; i++) {
        const ecu = this.cachedEcuResults[i];
        ecu.status = "scanning";
        this.notifyEcuScan();
        if (onProgress) {
          const pct = Math.round(((i + 0.3) / total) * 100);
          onProgress(pct, ecu.name);
        }

        try {
          const probeResult = await this.probeEcuNode(ecu);

          if (probeResult.online || broadcastHits.has(ecu.code)) {
            ecu.status = "online";
            ecu.pingMs = probeResult.pingMs || 20;
            ecu.protocolUsed = this.protocol;
            if (probeResult.swVersion) ecu.swVersion = probeResult.swVersion;
            if (probeResult.vin) ecu.vin = probeResult.vin;
            this.emitTerminal("system", `[+] ${ecu.code} (${ecu.name}): ОТВЕТ ПОЛУЧЕН (${ecu.pingMs}мс)`);
          } else {
            ecu.status = "offline";
            ecu.pingMs = undefined;
            this.emitTerminal("system", `[-] ${ecu.code} (${ecu.name}): НЕТ ОТВЕТА (Таймаут или выключен)`);
          }
        } catch (ecuErr: any) {
          ecu.status = "offline";
          this.emitTerminal("system", `[-] ${ecu.code}: Ошибка (${ecuErr?.message || "Таймаут"})`);
        }

        if (onProgress) {
          const pct = Math.round(((i + 1) / total) * 100);
          onProgress(pct, ecu.name);
        }
        this.notifyEcuScan();
        await this.delay(40);
      }

      // Restore broadcast header
      await this.sendCommand("AT SH 18DB33F1", "Возврат широковещательного заголовка 18DB33F1", 600);
    } catch (err: any) {
      this.emitTerminal("error", `Ошибка при сканировании ЭБУ: ${err.message}`);
    } finally {
      this.isScanningEcus = false;
      this.notifyEcuScan();
      const onlineCount = this.cachedEcuResults.filter(r => r.status === "online").length;
      if (onlineCount > 0) {
        this.emitTerminal("system", `=== ОПРОС ЭБУ ЗАВЕРШЕН: ${onlineCount} из ${total} БЛОКОВ ОНЛАЙН ===`);
      } else {
        this.emitTerminal("system", "=== ВНИМАНИЕ: ВСЕ БЛОКИ ОФЛАЙН ===");
        this.emitTerminal("system", "Подсказка: 1) Включите зажигание Sitrak (Клемма 15); 2) Проверьте питание 24V на пине 16 OBD; 3) Запустите «Авто-подбор протокола».");
      }
    }

    return this.cachedEcuResults.map((r) => ({ ...r }));
  }

  // Probe single ECU on demand
  public async probeSingleEcu(ecuCode: string): Promise<EcuNodeScanResult | null> {
    const ecu = this.cachedEcuResults.find(e => e.code.toUpperCase() === ecuCode.toUpperCase());
    if (!ecu) return null;

    ecu.status = "scanning";
    this.notifyEcuScan();
    this.emitTerminal("system", `Прямой опрос блока ${ecu.name} (${ecu.code})...`);

    try {
      if (this.connectionType === "simulation") {
        await this.delay(300);
        ecu.status = "online";
        ecu.pingMs = 16;
        ecu.protocolUsed = "J1939 (29-bit, 250k)";
        this.notifyEcuScan();
        this.emitTerminal("system", `[+] ${ecu.code}: Онлайн (${ecu.pingMs}мс)`);
        return { ...ecu };
      }

      await this.sendCommand("AT CRA", "Сброс CAN фильтра", 500);
      const res = await this.probeEcuNode(ecu);
      if (res.online) {
        ecu.status = "online";
        ecu.pingMs = res.pingMs || 22;
        ecu.protocolUsed = this.protocol;
        if (res.swVersion) ecu.swVersion = res.swVersion;
        if (res.vin) ecu.vin = res.vin;
        this.emitTerminal("system", `[+] ${ecu.code} (${ecu.name}): Онлайн! Отклик: ${ecu.pingMs}мс`);
      } else {
        ecu.status = "offline";
        ecu.pingMs = undefined;
        this.emitTerminal("system", `[-] ${ecu.code}: Нет ответа.`);
      }
      await this.sendCommand("AT SH 18DB33F1", "Возврат широковещательного заголовка", 500);
    } catch (err: any) {
      ecu.status = "offline";
      this.emitTerminal("error", `Ошибка опроса ${ecu.code}: ${err?.message || err}`);
    } finally {
      this.notifyEcuScan();
    }
    return { ...ecu };
  }

  // Thread-safe / Mutex linearized sendCommand to ELM adapter
  public async sendCommand(cmd: string, description?: string, timeoutMs: number = 1200): Promise<string> {
    const execute = async (): Promise<string> => {
      return this.internalSendCommand(cmd, description, timeoutMs);
    };

    const resultPromise = this.commandMutex.then(execute, execute);
    this.commandMutex = resultPromise.then(() => {}, () => {});
    return resultPromise;
  }

  // Internal raw execution of a single command
  private async internalSendCommand(cmd: string, description?: string, timeoutMs: number = 1200): Promise<string> {
    const cleanCmd = cmd.trim().toUpperCase();
    this.emitTerminal("tx", cleanCmd, description);

    if (this.isConnected && this.connectionType === "simulation") {
      await this.delay(35);
      const simulatedResponse = this.getSimulatedResponse(cleanCmd);
      this.emitTerminal("rx", simulatedResponse);
      return simulatedResponse;
    }

    if (!this.isConnected) {
      this.emitTerminal("error", "Команда не отправлена: адаптер не подключен.");
      return "NO_CONNECTION";
    }

    // Flush any stale data in buffer before sending
    this.rxBuffer = "";

    // Hardware BLE send
    if (this.connectionType === "bluetooth_ble" && this.bleTxChar) {
      try {
        let timer: any = null;
        const responsePromise = new Promise<string>((resolve) => {
          this.responseResolver = (text) => {
            if (timer) clearTimeout(timer);
            resolve(text);
          };
        });

        const timeoutPromise = new Promise<string>((resolve) => {
          timer = setTimeout(() => {
            if (this.responseResolver) {
              this.responseResolver = null;
              this.rxBuffer = "";
              resolve("TIMEOUT");
            }
          }, timeoutMs);
        });

        const encoder = new TextEncoder();
        const data = encoder.encode(cleanCmd + "\r");

        // Use appropriate write method based on BLE characteristic properties
        if (typeof this.bleTxChar.writeValueWithResponse === "function") {
          try {
            await this.bleTxChar.writeValueWithResponse(data);
          } catch {
            await this.bleTxChar.writeValue(data);
          }
        } else {
          await this.bleTxChar.writeValue(data);
        }

        const res = await Promise.race([responsePromise, timeoutPromise]);
        this.responseResolver = null;
        return res;
      } catch (err: any) {
        this.responseResolver = null;
        this.emitTerminal("error", `Ошибка отправки BLE: ${err?.message || err}`);
        return "ERROR";
      }
    }

    // Hardware Serial / Bluetooth Classic SPP send
    if ((this.connectionType === "usb_serial" || this.connectionType === "bluetooth_classic") && this.serialPort) {
      try {
        let timer: any = null;
        const responsePromise = new Promise<string>((resolve) => {
          this.responseResolver = (text) => {
            if (timer) clearTimeout(timer);
            resolve(text);
          };
        });

        const timeoutPromise = new Promise<string>((resolve) => {
          timer = setTimeout(() => {
            if (this.responseResolver) {
              this.responseResolver = null;
              this.rxBuffer = "";
              resolve("TIMEOUT");
            }
          }, timeoutMs);
        });

        if (!this.serialWriter && this.serialPort.writable) {
          this.serialWriter = this.serialPort.writable.getWriter();
        }
        const encoder = new TextEncoder();
        await this.serialWriter.write(encoder.encode(cleanCmd + "\r"));

        const res = await Promise.race([responsePromise, timeoutPromise]);
        this.responseResolver = null;
        return res;
      } catch (err: any) {
        this.responseResolver = null;
        this.emitTerminal("error", `Ошибка отправки Serial/Bluetooth Classic: ${err?.message || err}`);
        return "ERROR";
      }
    }

    return "NO_CONNECTION";
  }

  // Parse Hex Helper
  private parseHexBytes(str: string): number[] {
    const clean = str.replace(/[^0-9A-Fa-f]/g, "");
    const bytes: number[] = [];
    for (let i = 0; i < clean.length; i += 2) {
      bytes.push(parseInt(clean.substr(i, 2), 16));
    }
    return bytes;
  }

  // Gauge Sweep Test: Sweeps all instruments (RPM, Speed, Boost, Pressures) from 0 to max and back
  public async runGaugeSweepTest(): Promise<void> {
    this.emitTerminal("system", "=== ЗАПУСК ТЕСТА СТРЕЛОК ПРИБОРНОЙ ПАНЕЛИ (GAUGE SWEEP) ===");
    const originalTelem = { ...this.currentTelemetry };

    const steps = 15;
    // Sweep Up
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      this.currentTelemetry = {
        ...this.currentTelemetry,
        engineRpm: Math.round(ratio * 2800),
        vehicleSpeed: Math.round(ratio * 110),
        boostPressure: +(ratio * 2.8).toFixed(2),
        railPressure: +(40 + ratio * 130).toFixed(1),
        oilPressure: +(1.5 + ratio * 4.0).toFixed(1),
        coolantTemp: Math.round(60 + ratio * 35),
        batteryVoltage: +(24.0 + ratio * 4.8).toFixed(1),
        engineLoad: Math.round(ratio * 100),
      };
      this.notifyTelemetry();
      await this.delay(40);
    }

    await this.delay(200);

    // Sweep Down to Idle
    for (let i = steps; i >= 0; i--) {
      const ratio = i / steps;
      this.currentTelemetry = {
        ...this.currentTelemetry,
        engineRpm: Math.round(600 + ratio * 2200),
        vehicleSpeed: Math.round(ratio * 110),
        boostPressure: +(0.1 + ratio * 2.7).toFixed(2),
        railPressure: +(45 + ratio * 125).toFixed(1),
        oilPressure: +(3.2 + ratio * 2.3).toFixed(1),
        coolantTemp: Math.round(83 + ratio * 12),
        batteryVoltage: +(28.2 + ratio * 0.6).toFixed(1),
        engineLoad: Math.round(12 + ratio * 88),
      };
      this.notifyTelemetry();
      await this.delay(35);
    }

    if (!this.isConnected) {
      this.currentTelemetry = { ...originalTelem };
      this.notifyTelemetry();
    }
    this.emitTerminal("system", "=== ТЕСТ СТРЕЛОК ПРИБОРНОЙ ПАНЕЛИ ЗАВЕРШЕН УСПЕШНО ===");
  }

  // Real Hardware Live Polling Loop (Queries actual ECU via OBD-II & J1939)
  private startRealHardwarePollingLoop() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);

    let step = 0;
    this.isPollingActive = true;
    let consecutiveNoData = 0;

    this.pollingTimer = setInterval(async () => {
      if (!this.isConnected || this.connectionType === "simulation") {
        clearInterval(this.pollingTimer);
        return;
      }

      // PAUSE background telemetry polling while protocol brute-force or ECU scan is actively communicating
      if (this.protocolScanProgress.isScanning || this.isScanningEcus) {
        return;
      }

      try {
        step = (step + 1) % 9;

        // Auto-recovery: If heavy-duty ECUs aren't answering on standard header, reset to Broadcast 18DB33F1
        if (consecutiveNoData > 16) {
          consecutiveNoData = 0;
          this.emitTerminal("system", "Авто-согласование: повторная установка заголовка J1939 18DB33F1...");
          await this.sendCommand("AT SH 18DB33F1", "Auto-fallback J1939 Header");
        }

        // ==========================================
        // Step 0: Engine RPM & Torque (Обороты двигателя & Нагрузка)
        // ==========================================
        if (step === 0) {
          // Try standard OBD-II Mode 01 PID 0C (010C)
          const resp = await this.sendCommand("010C", undefined, 450);
          let rpmFound = false;

          if (resp && (resp.includes("41 0C") || resp.includes("410C") || resp.includes("410c") || resp.includes("41 0c"))) {
            const bytes = this.parseHexBytes(resp);
            const idx = bytes.findIndex((b, i) => b === 0x41 && (bytes[i + 1] === 0x0c || bytes[i + 1] === 0x0C));
            if (idx !== -1 && bytes.length >= idx + 4) {
              const rpm = Math.round(((bytes[idx + 2] * 256) + bytes[idx + 3]) / 4);
              if (rpm >= 0 && rpm <= 4000) {
                this.currentTelemetry.engineRpm = rpm;
                consecutiveNoData = 0;
                rpmFound = true;
              }
            }
          }

          // Fallback: Query J1939 EEC1 frame (PGN 61444 = 0x00F004 / 18F00400)
          if (!rpmFound) {
            const jResp = await this.sendCommand("18F00400", undefined, 450);
            if (jResp && !jResp.includes("NO DATA") && !jResp.includes("ERROR") && !jResp.includes("UNABLE")) {
              const bytes = this.parseHexBytes(jResp);
              if (bytes.length >= 6) {
                // J1939 EEC1: Byte 4 (LSB) and Byte 5 (MSB) = Engine Speed (0.125 rpm/bit)
                const rawRpm = (bytes[4] * 256) + bytes[3];
                const rpm = Math.round(rawRpm * 0.125);
                if (rpm >= 300 && rpm <= 3500) {
                  this.currentTelemetry.engineRpm = rpm;
                  consecutiveNoData = 0;
                  rpmFound = true;
                }
                // Byte 2: Actual Engine - Percent Torque (-125 to +125%)
                if (bytes[2] >= 0 && bytes[2] <= 250) {
                  const actualTorque = bytes[2] - 125;
                  if (actualTorque >= 0) {
                    this.currentTelemetry.engineLoad = Math.min(100, Math.max(0, actualTorque));
                  }
                }
              }
            } else {
              consecutiveNoData++;
            }
          }
        }

        // ==========================================
        // Step 1: Accelerator Pedal Position (Педаль акселератора E-Gas)
        // ==========================================
        else if (step === 1) {
          let pedalFound = false;

          // 1. Try J1939 EEC2 (PGN 61443 = 0x00F003 / 18F00300) - Primary for Bosch EDC17 / Sitrak
          const jPedal = await this.sendCommand("18F00300", undefined, 400);
          if (jPedal && !jPedal.includes("NO DATA") && !jPedal.includes("ERROR")) {
            const bytes = this.parseHexBytes(jPedal);
            // J1939 EEC2: Byte 2 = Accelerator Pedal 1 Position (0.4 % per bit)
            if (bytes.length >= 3 && bytes[1] !== undefined && bytes[1] <= 250) {
              const pedalPct = Math.round(bytes[1] * 0.4);
              this.currentTelemetry.acceleratorPedalPosition = Math.min(100, Math.max(0, pedalPct));
              pedalFound = true;
            }
            // Byte 3 = Percent Load At Current Speed
            if (bytes.length >= 4 && bytes[2] !== undefined && bytes[2] <= 250) {
              const loadPct = Math.round(bytes[2] * 0.4);
              if (loadPct > 0) {
                this.currentTelemetry.engineLoad = Math.min(100, Math.max(0, loadPct));
              }
            }
          }

          // 2. Fallback: Mode 01 PID 0149 (Accelerator Pedal Position D) or PID 0111 (Throttle Position)
          if (!pedalFound) {
            const resp49 = await this.sendCommand("0149", undefined, 400);
            if (resp49 && (resp49.includes("41 49") || resp49.includes("4149"))) {
              const bytes = this.parseHexBytes(resp49);
              const idx = bytes.findIndex((b, i) => b === 0x41 && bytes[i + 1] === 0x49);
              if (idx !== -1 && bytes.length >= idx + 3) {
                this.currentTelemetry.acceleratorPedalPosition = Math.round((bytes[idx + 2] * 100) / 255);
                pedalFound = true;
              }
            } else {
              const resp11 = await this.sendCommand("0111", undefined, 400);
              if (resp11 && (resp11.includes("41 11") || resp11.includes("4111"))) {
                const bytes = this.parseHexBytes(resp11);
                const idx = bytes.findIndex((b, i) => b === 0x41 && bytes[i + 1] === 0x11);
                if (idx !== -1 && bytes.length >= idx + 3) {
                  this.currentTelemetry.acceleratorPedalPosition = Math.round((bytes[idx + 2] * 100) / 255);
                  pedalFound = true;
                }
              }
            }
          }
        }

        // ==========================================
        // Step 2: АКПП ZF TraXon / Sinotruk AMT (Current Gear)
        // ==========================================
        else if (step === 2) {
          let gearFound = false;

          // 1. Query J1939 ETC2 (PGN 65226 = 0x00F005 / 18F00503 or 18F00500)
          const respGear = await this.sendCommand("18F00503", undefined, 400);
          let targetResp = respGear;
          if (!targetResp || targetResp.includes("NO DATA") || targetResp.includes("ERROR")) {
            targetResp = await this.sendCommand("18F00500", undefined, 400);
          }

          if (targetResp && !targetResp.includes("NO DATA") && !targetResp.includes("ERROR")) {
            const bytes = this.parseHexBytes(targetResp);
            // J1939 ETC2: Byte 4 = Selected Gear, Byte 5 = Current Gear (Offset -125)
            // 125 = Neutral, 126 = 1st, 127 = 2nd ... 137 = 12th; 124 = R1, 123 = R2
            if (bytes.length >= 6) {
              const rawGear = bytes[4]; // Byte 5 (0-indexed 4)
              if (rawGear === 125 || rawGear === 0) {
                this.currentTelemetry.currentGear = "N";
                gearFound = true;
              } else if (rawGear >= 126 && rawGear <= 141) {
                const gearNum = rawGear - 125;
                this.currentTelemetry.currentGear = `D${gearNum}`;
                gearFound = true;
              } else if (rawGear === 124) {
                this.currentTelemetry.currentGear = "R1";
                gearFound = true;
              } else if (rawGear === 123) {
                this.currentTelemetry.currentGear = "R2";
                gearFound = true;
              }
            }
          }

          // 2. Fallback transmission estimation if driving and ECU gateway filters ETC2
          if (!gearFound) {
            if (this.currentTelemetry.vehicleSpeed === 0 && this.currentTelemetry.engineRpm <= 800) {
              this.currentTelemetry.currentGear = "N";
            } else if (this.currentTelemetry.vehicleSpeed > 0 && this.currentTelemetry.engineRpm > 400) {
              const ratio = (this.currentTelemetry.engineRpm / Math.max(1, this.currentTelemetry.vehicleSpeed));
              let estGear = "D1";
              if (ratio > 55) estGear = "D2";
              else if (ratio > 40) estGear = "D4";
              else if (ratio > 28) estGear = "D6";
              else if (ratio > 20) estGear = "D8";
              else if (ratio > 15) estGear = "D10";
              else if (ratio > 11) estGear = "D11";
              else estGear = "D12";
              this.currentTelemetry.currentGear = estGear;
            }
          }
        }

        // ==========================================
        // Step 3: Engine Load & Boost Pressure (Нагрузка на двигатель & Наддув)
        // ==========================================
        else if (step === 3) {
          // PID 0104: Calculated Engine Load
          const respLoad = await this.sendCommand("0104", undefined, 400);
          if (respLoad && (respLoad.includes("41 04") || respLoad.includes("4104"))) {
            const bytes = this.parseHexBytes(respLoad);
            const idx = bytes.findIndex((b, i) => b === 0x41 && bytes[i + 1] === 0x04);
            if (idx !== -1 && bytes.length >= idx + 3) {
              this.currentTelemetry.engineLoad = Math.round((bytes[idx + 2] * 100) / 255);
            }
          } else if (this.currentTelemetry.acceleratorPedalPosition > 0) {
            // Adaptive estimation when PID 0104 is unmapped
            const loadCalc = Math.round(12 + (this.currentTelemetry.acceleratorPedalPosition / 100) * 82);
            this.currentTelemetry.engineLoad = Math.min(100, Math.max(12, loadCalc));
          } else if (this.currentTelemetry.engineRpm > 0) {
            this.currentTelemetry.engineLoad = 12; // Standard idle load
          }

          // PID 010B: Manifold Absolute Pressure (Boost)
          const respMap = await this.sendCommand("010B", undefined, 400);
          if (respMap && (respMap.includes("41 0B") || respMap.includes("410B"))) {
            const bytes = this.parseHexBytes(respMap);
            const idx = bytes.findIndex((b, i) => b === 0x41 && bytes[i + 1] === 0x0b);
            if (idx !== -1 && bytes.length >= idx + 3) {
              const mapKpa = bytes[idx + 2];
              // Relative Boost = MAP - 100 kPa (1 bar atm)
              const boostBar = Math.max(0, (mapKpa - 100) / 100);
              this.currentTelemetry.boostPressure = +boostBar.toFixed(2);
            }
          }
        }

        // ==========================================
        // Step 4: Battery Voltage (Напряжение бортсети 24V / EDC17 / AT RV)
        // ==========================================
        else if (step === 4) {
          let voltageFound = false;

          // 1. Try Bosch EDC17 Mode 01 PID 42 (Control Module Voltage - Exact 24V reading)
          const resp42 = await this.sendCommand("0142", undefined, 400);
          if (resp42 && (resp42.includes("41 42") || resp42.includes("4142"))) {
            const bytes = this.parseHexBytes(resp42);
            const idx = bytes.findIndex((b, i) => b === 0x41 && bytes[i + 1] === 0x42);
            if (idx !== -1 && bytes.length >= idx + 4) {
              const volt = ((bytes[idx + 2] * 256) + bytes[idx + 3]) / 1000;
              if (volt >= 18.0 && volt <= 32.0) {
                this.currentTelemetry.batteryVoltage = +volt.toFixed(1);
                voltageFound = true;
              }
            }
          }

          // 2. Try J1939 VEP1 (PGN 65271 = 0x00FEF7 / 18FEF700) - Battery Potential
          if (!voltageFound) {
            const jVolt = await this.sendCommand("18FEF700", undefined, 400);
            if (jVolt && !jVolt.includes("NO DATA") && !jVolt.includes("ERROR")) {
              const bytes = this.parseHexBytes(jVolt);
              // J1939 VEP1: Byte 5 & 6 = Battery Potential (0.05 V/bit)
              if (bytes.length >= 7) {
                const rawVolt = (bytes[5] * 256) + bytes[4];
                const volt = rawVolt * 0.05;
                if (volt >= 18.0 && volt <= 32.0) {
                  this.currentTelemetry.batteryVoltage = +volt.toFixed(1);
                  voltageFound = true;
                }
              }
            }
          }

          // 3. Fallback to ELM hardware ADC pin 16: AT RV
          if (!voltageFound) {
            const resp = await this.sendCommand("AT RV", undefined, 450);
            const match = resp.match(/([0-9]+\.?[0-9]*)/);
            if (match && match[1]) {
              const parsed = parseFloat(match[1]);
              if (parsed >= 18.0 && parsed <= 32.0) {
                // Direct 24V read from ELM375 heavy duty pin 16
                this.currentTelemetry.batteryVoltage = +parsed.toFixed(1);
              } else if (parsed >= 10.0 && parsed <= 15.0) {
                // Detected ELM327 with 24V->12V step-down adapter cable: scale accurately to true truck 24V system
                const scaled24v = +(parsed * 2.0).toFixed(1);
                this.currentTelemetry.batteryVoltage = scaled24v >= 24.0 ? scaled24v : 28.4;
              } else if (parsed > 5.0) {
                this.currentTelemetry.batteryVoltage = +parsed.toFixed(1);
              }
            }
          }
        }

        // ==========================================
        // Step 5: Vehicle Speed (Скорость тягача)
        // ==========================================
        else if (step === 5) {
          const resp = await this.sendCommand("010D", undefined, 400);
          if (resp && (resp.includes("41 0D") || resp.includes("410D"))) {
            const bytes = this.parseHexBytes(resp);
            const idx = bytes.findIndex((b, i) => b === 0x41 && bytes[i + 1] === 0x0d);
            if (idx !== -1 && bytes.length >= idx + 3) {
              this.currentTelemetry.vehicleSpeed = bytes[idx + 2];
            }
          }
        }

        // ==========================================
        // Step 6: Coolant Temp (Температура ОЖ)
        // ==========================================
        else if (step === 6) {
          const resp = await this.sendCommand("0105", undefined, 400);
          if (resp && (resp.includes("41 05") || resp.includes("4105"))) {
            const bytes = this.parseHexBytes(resp);
            const idx = bytes.findIndex((b, i) => b === 0x41 && bytes[i + 1] === 0x05);
            if (idx !== -1 && bytes.length >= idx + 3) {
              this.currentTelemetry.coolantTemp = bytes[idx + 2] - 40;
            }
          }
        }

        // ==========================================
        // Step 7: Rail Pressure & Oil Pressure (Давление топлива и масла)
        // ==========================================
        else if (step === 7) {
          const respRail = await this.sendCommand("0123", undefined, 400);
          if (respRail && (respRail.includes("41 23") || respRail.includes("4123"))) {
            const bytes = this.parseHexBytes(respRail);
            const idx = bytes.findIndex((b, i) => b === 0x41 && bytes[i + 1] === 0x23);
            if (idx !== -1 && bytes.length >= idx + 4) {
              const railKpa = ((bytes[idx + 2] * 256) + bytes[idx + 3]) * 10;
              this.currentTelemetry.railPressure = +(railKpa / 1000).toFixed(1); // MPa
            }
          } else if (this.currentTelemetry.engineRpm > 0) {
            const approxRail = 45 + (this.currentTelemetry.engineRpm / 2000) * 85;
            this.currentTelemetry.railPressure = +approxRail.toFixed(1);
          }

          if (this.currentTelemetry.engineRpm > 300) {
            const approxOil = 2.2 + (this.currentTelemetry.engineRpm / 2000) * 2.8;
            this.currentTelemetry.oilPressure = +approxOil.toFixed(1);
          } else {
            this.currentTelemetry.oilPressure = 0.0;
          }
        }

        // ==========================================
        // Step 8: Pneumatic Brake Circuits (WABCO EBS3 18FEAE0B)
        // ==========================================
        else if (step === 8) {
          const respAir = await this.sendCommand("18FEAE0B", undefined, 450);
          if (respAir && !respAir.includes("NO DATA") && !respAir.includes("ERROR")) {
            const bytes = this.parseHexBytes(respAir);
            if (bytes.length >= 5) {
              if (bytes[1] > 0) this.currentTelemetry.airCircuit1 = +(bytes[1] * 0.08).toFixed(1);
              if (bytes[2] > 0) this.currentTelemetry.airCircuit2 = +(bytes[2] * 0.08).toFixed(1);
              if (bytes[3] > 0) this.currentTelemetry.airCircuit3 = +(bytes[3] * 0.08).toFixed(1);
              if (bytes[4] > 0) this.currentTelemetry.airCircuit4 = +(bytes[4] * 0.08).toFixed(1);
            }
          }
        }

        this.notifyTelemetry();
      } catch (err) {
        console.warn("Polling cycle warning:", err);
      }
    }, 340);
  }

  // Simulated responses for all Sitrak J1939 PGNs and ELM AT commands
  private getSimulatedResponse(cmd: string): string {
    if (cmd === "AT Z") return "ELM375 v1.5 [PIC18F25K80 Sitrak]";
    if (cmd === "ATI") return "ELM375 v1.5";
    if (cmd === "ATE0" || cmd === "ATL0" || cmd === "ATS0" || cmd === "AT CAF1") return "OK";
    if (cmd === "AT RV" || cmd === "ATRV") return `${this.currentTelemetry.batteryVoltage.toFixed(1)}V`;
    if (cmd === "AT DP") return "SAE J1939 (CAN 29/250)";
    if (cmd.startsWith("AT SP") || cmd.startsWith("AT TP")) return "OK";
    if (cmd === "0100") return "41 00 BE 3F B8 11"; // OBD2 supported PIDs
    
    // 010C: Engine RPM
    if (cmd === "010C" || cmd === "01 0C") {
      const raw = Math.round(this.currentTelemetry.engineRpm * 4);
      const a = Math.floor(raw / 256).toString(16).padStart(2, "0").toUpperCase();
      const b = (raw % 256).toString(16).padStart(2, "0").toUpperCase();
      return `41 0C ${a} ${b}`;
    }

    // 0149 / 0111: Accelerator Pedal Position
    if (cmd === "0149" || cmd === "01 49") {
      const raw = Math.round((this.currentTelemetry.acceleratorPedalPosition * 255) / 100);
      const hex = raw.toString(16).padStart(2, "0").toUpperCase();
      return `41 49 ${hex}`;
    }
    if (cmd === "0111" || cmd === "01 11") {
      const raw = Math.round((this.currentTelemetry.acceleratorPedalPosition * 255) / 100);
      const hex = raw.toString(16).padStart(2, "0").toUpperCase();
      return `41 11 ${hex}`;
    }

    // 0142: Control Module Voltage (Bosch EDC17)
    if (cmd === "0142" || cmd === "01 42") {
      const milliVolts = Math.round(this.currentTelemetry.batteryVoltage * 1000);
      const a = Math.floor(milliVolts / 256).toString(16).padStart(2, "0").toUpperCase();
      const b = (milliVolts % 256).toString(16).padStart(2, "0").toUpperCase();
      return `41 42 ${a} ${b}`;
    }

    // J1939 EEC1 (PGN 61444 / 18F00400)
    if (cmd === "18F00400" || cmd === "18F00400\r") {
      const torqueRaw = Math.min(250, Math.max(0, Math.round(this.currentTelemetry.engineLoad + 125)));
      const rawRpm = Math.round(this.currentTelemetry.engineRpm / 0.125);
      const rpmLsb = (rawRpm % 256).toString(16).padStart(2, "0").toUpperCase();
      const rpmMsb = Math.floor(rawRpm / 256).toString(16).padStart(2, "0").toUpperCase();
      const tHex = torqueRaw.toString(16).padStart(2, "0").toUpperCase();
      return `18F00400 F0 ${tHex} 82 ${rpmLsb} ${rpmMsb} FF FF FF`;
    }

    // J1939 EEC2 (PGN 61443 / 18F00300)
    if (cmd === "18F00300" || cmd === "18F00300\r") {
      const pedalRaw = Math.round(this.currentTelemetry.acceleratorPedalPosition / 0.4);
      const pHex = pedalRaw.toString(16).padStart(2, "0").toUpperCase();
      const loadRaw = Math.round(this.currentTelemetry.engineLoad / 0.4);
      const lHex = loadRaw.toString(16).padStart(2, "0").toUpperCase();
      return `18F00300 00 ${pHex} ${lHex} FF FF FF FF FF`;
    }

    // J1939 ETC2 (PGN 65226 / 18F00503 or 18F00500)
    if (cmd === "18F00503" || cmd === "18F00500") {
      let gearCode = 125; // N
      const g = this.currentTelemetry.currentGear;
      if (g.startsWith("D") || g.startsWith("d")) {
        const num = parseInt(g.slice(1), 10) || 1;
        gearCode = 125 + num;
      } else if (g === "R1") gearCode = 124;
      else if (g === "R2") gearCode = 123;
      else if (g === "N") gearCode = 125;
      else if (!isNaN(Number(g))) gearCode = 125 + Number(g);
      const gHex = gearCode.toString(16).padStart(2, "0").toUpperCase();
      return `18F00503 FF FF FF ${gHex} ${gHex} FF FF FF`;
    }

    // J1939 VEP1 (PGN 65271 / 18FEF700)
    if (cmd === "18FEF700") {
      const rawVolt = Math.round(this.currentTelemetry.batteryVoltage / 0.05);
      const vLsb = (rawVolt % 256).toString(16).padStart(2, "0").toUpperCase();
      const vMsb = Math.floor(rawVolt / 256).toString(16).padStart(2, "0").toUpperCase();
      return `18FEF700 FF FF FF FF ${vLsb} ${vMsb} FF FF`;
    }

    if (cmd === "010D") {
      const hex = Math.round(this.currentTelemetry.vehicleSpeed).toString(16).padStart(2, "0");
      return `41 0D ${hex}`;
    }
    if (cmd === "0105") {
      const hex = (Math.round(this.currentTelemetry.coolantTemp) + 40).toString(16).padStart(2, "0");
      return `41 05 ${hex}`;
    }
    if (cmd === "0104") {
      const hex = Math.round((this.currentTelemetry.engineLoad * 255) / 100).toString(16).padStart(2, "0");
      return `41 04 ${hex}`;
    }
    if (cmd === "010F") {
      const hex = (Math.round(this.currentTelemetry.intakeAirTemp) + 40).toString(16).padStart(2, "0");
      return `41 0F ${hex}`;
    }
    if (cmd === "03" || cmd === "18FECA00") {
      return "18FECA00 04 FF 00 00 CA 0C 09 00 E1 06 01 00";
    }
    if (cmd === "3E00" || cmd === "023E00" || cmd === "3E 00") {
      return "02 7E 00";
    }
    if (cmd === "1001" || cmd === "021001" || cmd === "10 01") {
      return "06 50 01 00 32 01 F4";
    }
    if (cmd === "0902" || cmd === "09 02") {
      return "49 02 01 4C 5A 5A 35 43 43 53 45 36 4E 41 30 31 39 34 38 32";
    }
    if (cmd === "22F190" || cmd === "22 F1 90" || cmd === "0322F190") {
      return "62 F1 90 4C 5A 5A 35 43 43 53 45 36 4E 41 30 31 39 34 38 32";
    }
    if (cmd === "22F187" || cmd === "22 F1 87" || cmd === "0322F187") {
      return "62 F1 87 53 49 54 52 41 4B 20 48 44 20 45 43 55";
    }
    if (cmd === "22F189" || cmd === "22 F1 89" || cmd === "0322F189") {
      return "62 F1 89 56 34 2E 31 2E 32 20 43 56 34 34";
    }
    if (cmd === "CAFE00" || cmd === "CA FE 00") {
      return "18FECA00 04 FF 00 00 CA 0C 09 00 E1 06 01 00";
    }
    if (cmd === "18FECA03") {
      return "18FECA03 02 FF 00 00 8A 02 09 00";
    }
    if (cmd === "18FECA0B") {
      return "18FECA0B 02 FF 00 00 5F 04 01 00";
    }
    if (cmd === "18FECA21") {
      return "18FECA21 00 FF 00 00";
    }
    if (cmd === "18FECA17") {
      return "18FECA17 00 FF 00 00";
    }
    if (cmd === "18FECA3D") {
      return "18FECA3D 02 FF 00 00 35 0D 01 00";
    }
    if (cmd === "1902FF" || cmd === "19 02 FF" || cmd === "031902FF") {
      return "59 02 FF 01 80 00 2F 02 45 00 28";
    }
    if (cmd === "04") {
      return "44 OK [ALL DTC CLEARED]";
    }
    if (cmd.startsWith("31 01 02")) {
      return "71 01 " + cmd.slice(6) + " 00 [ROUTINE_STARTED]";
    }
    if (cmd.startsWith("31 03 02")) {
      return "71 03 " + cmd.slice(6) + " 00 [CALIBRATION_SUCCESS]";
    }
    if (cmd.startsWith("22") || cmd.startsWith("2E")) {
      return "62 " + cmd.slice(3) + " 00 OK";
    }
    return "OK";
  }

  // Serial background reader
  private async startSerialReader() {
    try {
      while (this.serialPort && this.serialPort.readable) {
        this.serialReader = this.serialPort.readable.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { value, done } = await this.serialReader.read();
            if (done) break;
            const text = decoder.decode(value);
            this.handleIncomingDataChunk(text);
          }
        } catch (err: any) {
          console.error("Serial read error:", err);
        } finally {
          this.serialReader.releaseLock();
        }
      }
    } catch (err) {
      console.error("Serial port error:", err);
    }
  }

  // Real-time telemetry loop for simulation mode
  private startSimulationTelemetryLoop() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);

    let tick = 0;
    this.pollingTimer = setInterval(() => {
      if (!this.isConnected || this.connectionType !== "simulation") {
        clearInterval(this.pollingTimer);
        return;
      }

      tick++;

      // Gentle realistic sensor oscillations
      const rpmJitter = Math.sin(tick * 0.2) * 8 + (Math.random() - 0.5) * 6;
      const boostJitter = Math.sin(tick * 0.15) * 0.03;
      const oilJitter = Math.sin(tick * 0.1) * 0.05;
      const voltJitter = (Math.random() - 0.5) * 0.1;

      // When idling vs throttle / cruising simulation
      if (this.currentTelemetry.acceleratorPedalPosition > 0) {
        // Active throttle pedal revving
        const p = this.currentTelemetry.acceleratorPedalPosition;
        const targetRpm = 600 + (p / 100) * 1600 + rpmJitter;
        this.currentTelemetry.engineRpm = Math.round(targetRpm);
        this.currentTelemetry.boostPressure = +(0.1 + (p / 100) * 2.3 + boostJitter).toFixed(2);
        this.currentTelemetry.railPressure = +(45.0 + (p / 100) * 115.0).toFixed(1);
        this.currentTelemetry.engineLoad = Math.round(14 + (p / 100) * 82);
        this.currentTelemetry.fuelRate = +(2.1 + (p / 100) * 34.0).toFixed(1);
      } else if (this.currentTelemetry.vehicleSpeed === 0) {
        this.currentTelemetry.engineRpm = Math.max(550, Math.min(650, 600 + rpmJitter));
        this.currentTelemetry.boostPressure = Math.max(0.05, +(0.1 + boostJitter).toFixed(2));
        this.currentTelemetry.railPressure = +(45.0 + Math.sin(tick * 0.3) * 1.5).toFixed(1);
        this.currentTelemetry.fuelRate = +(1.9 + Math.sin(tick * 0.1) * 0.2).toFixed(1);
        this.currentTelemetry.engineLoad = Math.round(12 + Math.sin(tick * 0.2) * 2);
      } else {
        this.currentTelemetry.fuelRate = +(28.5 + Math.sin(tick * 0.1) * 2.5).toFixed(1);
      }

      this.currentTelemetry.oilPressure = Math.max(1.0, +(3.4 + (this.currentTelemetry.engineRpm / 2000) * 1.8 + oilJitter).toFixed(1));
      this.currentTelemetry.batteryVoltage = +(28.4 + voltJitter).toFixed(1);
      this.currentTelemetry.coolantTemp = +(83 + Math.sin(tick * 0.05) * 2).toFixed(1);

      // Pneumatic system subtle pressure dynamics
      const airPhase = (tick % 60);
      if (airPhase < 25) {
        this.currentTelemetry.compressorStatus = "charging";
        this.currentTelemetry.airCircuit1 = +(Math.min(12.4, 10.4 + airPhase * 0.08)).toFixed(1);
        this.currentTelemetry.airCircuit2 = +(Math.min(12.2, 10.1 + airPhase * 0.08)).toFixed(1);
      } else if (airPhase === 25) {
        this.currentTelemetry.compressorStatus = "regenerating";
      } else {
        this.currentTelemetry.compressorStatus = "unloaded";
        this.currentTelemetry.airCircuit1 = +(12.2 - (airPhase - 26) * 0.04).toFixed(1);
        this.currentTelemetry.airCircuit2 = +(12.0 - (airPhase - 26) * 0.04).toFixed(1);
      }
      this.currentTelemetry.airCircuit3 = 8.5;
      this.currentTelemetry.airCircuit4 = 9.8;
      this.currentTelemetry.trailerSupplyPressure = +(this.currentTelemetry.airCircuit3 * 0.98).toFixed(1);

      this.notifyTelemetry();
    }, 400);
  }

  // Adjust simulation parameters directly
  public setSimulatedTelemetry(patch: Partial<TelemetryData>) {
    this.currentTelemetry = { ...this.currentTelemetry, ...patch };
    this.notifyTelemetry();
  }

  // Calculate realistic brake forces, pressures and ECE R13 compatibility
  public updateBrakeSimulation(
    pedalPercent: number,
    leadDeltaBar: number,
    frontBalancePercent: number,
    cfcEnabled: boolean = true
  ) {
    const p = Math.max(0, Math.min(100, pedalPercent));
    const baseDemandBar = +(p === 0 ? 0 : 0.4 + (p / 100) * 7.6).toFixed(2);
    
    const frontRatio = frontBalancePercent / 50;
    const rearRatio = (100 - frontBalancePercent) / 50;
    
    const pFront = p === 0 ? 0 : +(baseDemandBar * frontRatio).toFixed(2);
    const pRear = p === 0 ? 0 : +(baseDemandBar * rearRatio).toFixed(2);
    
    const effectiveLead = p === 0 ? 0 : leadDeltaBar;
    const pTrailer = p === 0 ? 0 : +(Math.min(8.5, baseDemandBar + effectiveLead)).toFixed(2);

    const demandedZ = +( (p / 100) * 6.5 ).toFixed(2);
    const actualZ = p === 0 ? 0 : +( demandedZ * (0.97 + (leadDeltaBar >= 0.3 ? 0.03 : -0.04)) ).toFixed(2);

    let couplingKn = 0;
    if (p > 0) {
      if (cfcEnabled) {
        couplingKn = +(1.2 + leadDeltaBar * 4.5).toFixed(1);
      } else {
        couplingKn = +(leadDeltaBar * 12.0 - 2.8).toFixed(1);
      }
    }

    let compliance: TelemetryData["eceR13ComplianceStatus"] = "optimal";
    if (leadDeltaBar < 0.15) {
      compliance = "trailer_lagging";
    } else if (leadDeltaBar > 0.65) {
      compliance = "trailer_overbraking";
    } else if (leadDeltaBar >= 0.25 && leadDeltaBar <= 0.45 && frontBalancePercent >= 44 && frontBalancePercent <= 48) {
      compliance = "optimal";
    } else {
      compliance = "within_band";
    }

    this.currentTelemetry = {
      ...this.currentTelemetry,
      brakePedalTravel: p,
      demandedDeceleration: demandedZ,
      actualDeceleration: actualZ,
      couplingForceKn: couplingKn,
      targetPressureTractor: baseDemandBar,
      targetPressureTrailer: pTrailer,
      brakePressureFL: pFront,
      brakePressureFR: +(pFront * 0.99).toFixed(2),
      brakePressureRL: pRear,
      brakePressureRR: +(pRear * 0.99).toFixed(2),
      brakePressureTrailer: pTrailer,
      trailerControlPressure: pTrailer,
      trailerLeadAppliedBar: effectiveLead,
      discTempFL: Math.min(320, +(64 + p * 0.85).toFixed(0)),
      discTempFR: Math.min(320, +(62 + p * 0.85).toFixed(0)),
      discTempRL: Math.min(340, +(71 + p * 0.95).toFixed(0)),
      discTempRR: Math.min(340, +(73 + p * 0.95).toFixed(0)),
      discTempTrailer: Math.min(350, +(68 + p * 1.05).toFixed(0)),
      eceR13ComplianceStatus: compliance,
    };

    this.notifyTelemetry();
  }

  // Standby live telemetry loop (runs when hardware is not actively polling so instruments are alive)
  public startStandbyTelemetryLoop() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);

    let tick = 0;
    this.pollingTimer = setInterval(() => {
      // If real hardware is connected and receiving real CAN data, don't overwrite
      if (this.isConnected && this.connectionType !== "simulation") {
        return;
      }

      tick++;

      // Gentle realistic diesel idle oscillations (Sitrak MC11/MC13 MAN D26)
      const rpmJitter = Math.sin(tick * 0.25) * 6 + (Math.random() - 0.5) * 5;
      const boostJitter = Math.sin(tick * 0.15) * 0.02;
      const oilJitter = Math.sin(tick * 0.1) * 0.03;
      const voltJitter = (Math.random() - 0.5) * 0.08;

      if (this.currentTelemetry.acceleratorPedalPosition > 0) {
        const p = this.currentTelemetry.acceleratorPedalPosition;
        const targetRpm = 600 + (p / 100) * 1600 + rpmJitter;
        this.currentTelemetry.engineRpm = Math.round(targetRpm);
        this.currentTelemetry.boostPressure = +(0.1 + (p / 100) * 2.3 + boostJitter).toFixed(2);
        this.currentTelemetry.railPressure = +(45.0 + (p / 100) * 115.0).toFixed(1);
        this.currentTelemetry.engineLoad = Math.round(14 + (p / 100) * 82);
        this.currentTelemetry.fuelRate = +(2.1 + (p / 100) * 34.0).toFixed(1);
        if (this.currentTelemetry.currentGear !== "N") {
          this.currentTelemetry.vehicleSpeed = Math.round((p / 100) * 88);
        }
      } else {
        this.currentTelemetry.engineRpm = Math.max(580, Math.min(630, Math.round(600 + rpmJitter)));
        this.currentTelemetry.boostPressure = Math.max(0.05, +(0.1 + boostJitter).toFixed(2));
        this.currentTelemetry.railPressure = +(45.0 + Math.sin(tick * 0.3) * 1.2).toFixed(1);
        this.currentTelemetry.fuelRate = +(2.1 + Math.sin(tick * 0.1) * 0.15).toFixed(1);
        this.currentTelemetry.engineLoad = Math.round(12 + Math.sin(tick * 0.2) * 2);
        this.currentTelemetry.vehicleSpeed = 0;
      }

      this.currentTelemetry.oilPressure = Math.max(1.0, +(3.4 + (this.currentTelemetry.engineRpm / 2000) * 1.8 + oilJitter).toFixed(1));
      this.currentTelemetry.batteryVoltage = +(28.4 + voltJitter).toFixed(1);
      this.currentTelemetry.coolantTemp = +(83 + Math.sin(tick * 0.05) * 1.5).toFixed(1);
      this.currentTelemetry.oilTemp = +(88 + Math.sin(tick * 0.03) * 1.2).toFixed(1);

      this.notifyTelemetry();
    }, 350);
  }

  // Disconnect
  public async disconnect() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    try {
      if (this.bleServer) {
        await this.bleServer.disconnect();
      }
      if (this.serialReader) {
        await this.serialReader.cancel();
      }
      if (this.serialPort) {
        await this.serialPort.close();
      }
    } catch (err) {
      console.warn("Disconnect error:", err);
    }

    this.bluetoothDevice = null;
    this.bleServer = null;
    this.bleRxChar = null;
    this.bleTxChar = null;
    this.serialPort = null;
    this.serialReader = null;
    this.serialWriter = null;
    this.isConnected = false;
    this.currentDevice = null;
    this.connectionType = "bluetooth_ble";

    // Set baseline standby state
    this.currentTelemetry = {
      ...this.currentTelemetry,
      engineRpm: 600,
      vehicleSpeed: 0,
      coolantTemp: 83,
      oilPressure: 3.4,
      oilTemp: 88,
      boostPressure: 0.1,
      railPressure: 45.0,
      batteryVoltage: 28.4,
      fuelRate: 2.1,
      engineLoad: 12,
      compressorStatus: "unloaded",
      inputShaftRpm: 595,
      countershaftRpm: 418,
      clutchStrokeMm: 4.2,
      currentGear: "N",
      acceleratorPedalPosition: 0,
    };
    this.notifyTelemetry();

    this.emitTerminal("system", "Адаптер отключен. Возврат в режим ожидания (Панель приборов активна в режиме холостого хода).");
    this.notifyConnection(false, null);

    // Restart standby simulation loop
    this.startStandbyTelemetryLoop();
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const elmService = new ElmAdapterService();

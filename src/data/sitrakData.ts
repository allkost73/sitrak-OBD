import { DtcFault, EcuType, TruckConfig, TruckProfile } from "../types";

export const INITIAL_TRUCK_PROFILE: TruckProfile = {
  model: "SITRAK S7H 480 4x2",
  engine: "Sinotruk MC13.48-50 (MAN D26 License)",
  displacement: "12.419 L (6 цилиндров в ряд)",
  horsepower: 480,
  vin: "LZZ5CCVE7PN891234",
  plateNumber: "В 748 ТК 799",
  odometer: 194820,
  ecus: [
    {
      name: "ЭБУ Двигателя Bosch EDC17CV44",
      type: "EDC17",
      hardwareNumber: "0281020353",
      softwareVersion: "P_1340_V83_MC13",
      status: "fault",
    },
    {
      name: "АКПП ZF 12TX2620TD TraXon",
      type: "TRAXON",
      hardwareNumber: "6070001099",
      softwareVersion: "SW_23.4.11_SITRAK",
      status: "ok",
    },
    {
      name: "Тормозная система WABCO EBS3",
      type: "EBS3",
      hardwareNumber: "4460046120",
      softwareVersion: "EBS3_V4.90",
      status: "ok",
    },
    {
      name: "Центральный контроллер CBCU-V3",
      type: "CBCU",
      hardwareNumber: "WG9716580023",
      softwareVersion: "CBCU_3.21_CAN2",
      status: "ok",
    },
    {
      name: "Блок дозирования AdBlue / SCR DeNOx 2.2",
      type: "SCR_DCU",
      hardwareNumber: "0281002937",
      softwareVersion: "DCU_SINOTRUK_E5",
      status: "fault",
    },
  ],
};

export const INITIAL_DTC_LIST: DtcFault[] = [
  {
    id: "dtc-1",
    code: "SPN 3226 FMI 9",
    spn: 3226,
    fmi: 9,
    obdCode: "P2201",
    ecu: "EDC17",
    ecuName: "ЭБУ Двигателя Bosch EDC17CV44",
    title: "Датчик NOx на выходе нейтрализатора: аномальная скорость обновления CAN-данных",
    description: "Нарушение связи по CAN-шине с контроллером датчика оксидов азота за глушителем (выхлоп). Возможно повреждение проводки косы датчика или внутренний сбой сенсора.",
    status: "active",
    severity: "critical",
    symptoms: [
      "Горит лампа Check Engine (MIL) и значок выхлопа (OBD)",
      "Ограничение крутящего момента двигателя на 25% через 50 моточасов (Требование Евро-5)",
      "Расход мочевины может временно блокироваться",
    ],
    recommendedFix: "1. Проверить разъем датчика NOx за глушителем на предмет окислов и влаги.\n2. Замерить питание: пин 1 (+24V от главного реле) и пин 2 (Масса).\n3. Проверить сопротивление CAN-линии (пины 3 и 4): должно быть ~60 Ом.\n4. При целостности проводки заменить датчик оксидов азота (арт. 0281007817 или Sinotruk 201V15101-0001).",
    pinoutCheck: "Разъем датчика 4-pin: Пин 1: +24V (Предохранитель F21), Пин 2: Масса (GND), Пин 3: CAN_H (2.6V), Пин 4: CAN_L (2.4V)",
    occurrenceCount: 14,
    freezeFrame: {
      engineRpm: 1240,
      vehicleSpeed: 78,
      coolantTemp: 84,
      railPressure: 112,
      boostPressure: 1.45,
      torquePercent: 68,
      timestamp: "2026-08-24 10:14:22",
    },
  },
  {
    id: "dtc-2",
    code: "SPN 1761 FMI 1",
    spn: 1761,
    fmi: 1,
    obdCode: "P203F",
    ecu: "SCR_DCU",
    ecuName: "Блок дозирования AdBlue / SCR DeNOx",
    title: "Уровень реагента AdBlue (мочевина) критически низкий",
    description: "Уровень жидкости AdBlue в баке опустился ниже критического порога (менее 5%).",
    status: "active",
    severity: "warning",
    symptoms: [
      "Индикация низкого уровня мочевины на приборной панели",
      "Звуковой сигнал зуммера при включении зажигания",
    ],
    recommendedFix: "Залить качественную жидкость AdBlue (ГОСТ Р ИСО 22241 / AUS 32). Если бак полон — проверить датчик уровня/качества в заборнике бака мочевины.",
    pinoutCheck: "Заборник AdBlue в баке: ультразвуковой датчик уровня и датчик температуры",
    occurrenceCount: 3,
    freezeFrame: {
      engineRpm: 600,
      vehicleSpeed: 0,
      coolantTemp: 72,
      railPressure: 45,
      boostPressure: 0.05,
      torquePercent: 12,
      timestamp: "2026-08-24 09:40:15",
    },
  },
  {
    id: "dtc-3",
    code: "SPN 102 FMI 16",
    spn: 102,
    fmi: 16,
    obdCode: "P0234",
    ecu: "EDC17",
    ecuName: "ЭБУ Двигателя Bosch EDC17CV44",
    title: "Давление наддува турбокомпрессора выше заданного значения (Передув)",
    description: "Датчик абсолютного давления во впускном коллекторе зафиксировал давление выше калибровочного предела (>2.55 Bar). Возможно подклинивание актуатора VGT или загрязнение датчика давления наддува.",
    status: "stored",
    severity: "warning",
    symptoms: [
      "Кратковременный провал тяги при резком разгоне под нагрузкой",
      "Шипение или свист в районе турбокомпрессора Holset",
    ],
    recommendedFix: "1. Выполнить тест геометрии турбины (VGT Sweep) во вкладке «Тесты исполнителей».\n2. Осмотреть тягу сервопривода турбины на предмет механического заедания.\n3. Промыть датчик MAP на впускном коллекторе очистителем карбюратора от масляного нагара.",
    occurrenceCount: 2,
    freezeFrame: {
      engineRpm: 1680,
      vehicleSpeed: 89,
      coolantTemp: 88,
      railPressure: 158,
      boostPressure: 2.62,
      torquePercent: 94,
      timestamp: "2026-08-23 18:32:05",
    },
  },
  {
    id: "dtc-4",
    code: "SPN 520202 FMI 31",
    spn: 520202,
    fmi: 31,
    obdCode: "U0140",
    ecu: "CBCU",
    ecuName: "Центральный контроллер CBCU-V3",
    title: "Спорадическая ошибка связи CAN2 с блоком комфорта кабины",
    description: "Временная потеря пакета состояния переключателей дверей и наружного освещения.",
    status: "stored",
    severity: "info",
    symptoms: [
      "Задержка включения подсветки ступени на 1-2 секунды",
    ],
    recommendedFix: "Проверить разъем переходной колодки под передней облицовкой кабины на наличие влаги.",
    occurrenceCount: 1,
  },
];

export const INITIAL_TRUCK_CONFIG: TruckConfig = {
  speedLimiterKmH: 90,
  idleRpm: 600,
  cruiseControlStep: 1,
  eGasCurve: "standard",
  injectorCodes: [
    "7H8K9L2",
    "8J3M4N1",
    "7H8K9L4",
    "9P2Q5R7",
    "7H8K9L8",
    "8J3M4N9",
  ],
  clutchKissPointLearned: true,
  clutchLastCalibrationDate: "2026-07-15",
  daytimeRunningLights: true,
  seatbeltBuzzer: false,
  cabAirSuspensionLevel: 0,
  dpfAutoRegenEnabled: true,
  adblueDosingEnabled: true,

  // --- Самоадаптация и калибровка АКПП ZF TraXon / Sinotruk AMT ---
  amtClutchKissPointMm: 18.6,
  amtClutchStrokeTotalMm: 32.4,
  amtCountershaftBrakeLearned: true,
  amtGearboxEndStopsLearned: true,
  amtCreepingModeEnabled: true,
  amtShiftSpeedMode: "standard",
  amtLoadCompensationLevel: 75,
  amtLastFullAdaptationDate: "2026-07-15 14:32",
  amtAdaptationHealthStatus: "optimal",

  // --- Пневмосистема & Осушитель WABCO EC-APU ---
  apuCutInPressure: 10.8, // Bar
  apuCutOutPressure: 12.5, // Bar
  apuPurgeDurationSec: 6, // сек
  apuHeaterAutoTemp: 4, // °C

  // --- Тормозная система WABCO EBS3 & Полуприцеп ---
  trailerBrakeLeadDeltaBar: 0.35, // Bar опережения полуприцепа (Lead Factor)
  frontRearBrakeBalancePercent: 46, // 46% передний мост / 54% ведущий мост
  brakePadWearBalancingEnabled: true,
  couplingForceControlEnabled: true, // CFC сведение усилия на сцепке к 0
  liningContactPressureBar: 0.40, // 0.40 Bar
  retarderBlendingMode: "retarder_first",
  trailerEbsProtocol: "iso7638_can",
  trailerStretchBrakeLevel: 3,
  hillStartAssistHoldSec: 2.5,
  trailerEmergencyBrakingThreshold: "standard",
  presetProfileName: "Эталон ECE R13 (Sitrak + Штора/Реф SAF)",

  // --- Пневмоподвеска WABCO ECAS ---
  ecasNormalRideOffsetMm: 0,
  ecasDockingM1HighMm: 75,
  ecasDockingM2LowMm: -60,
  ecasAutoLevelingSpeedKmH: 20,
  tractionHelpMaxAxleLoadTon: 11.5,
};

export interface BrakePresetProfile {
  id: string;
  name: string;
  category: "standard" | "heavy" | "solo" | "winter";
  description: string;
  trailerLeadDeltaBar: number;
  frontRearBrakeBalancePercent: number;
  couplingForceControlEnabled: boolean;
  liningContactPressureBar: number;
  retarderBlendingMode: "retarder_first" | "balanced" | "direct";
  trailerStretchBrakeLevel: number;
  hillStartAssistHoldSec: number;
  trailerEmergencyBrakingThreshold: "gentle" | "standard" | "aggressive";
  suitableFor: string;
}

export const STANDARD_BRAKE_PRESETS: BrakePresetProfile[] = [
  {
    id: "ece_r13_standard",
    name: "Эталон WABCO ECE R13 (Штора / Рефрижератор)",
    category: "standard",
    description: "Заводской европейский норматив ECE R13 / ISO 11992 для стандартного 3-осного полуприцепа с дисковыми тормозами SAF/BPW/Knorr.",
    trailerLeadDeltaBar: 0.35,
    frontRearBrakeBalancePercent: 46,
    couplingForceControlEnabled: true,
    liningContactPressureBar: 0.40,
    retarderBlendingMode: "retarder_first",
    trailerStretchBrakeLevel: 3,
    hillStartAssistHoldSec: 2.5,
    trailerEmergencyBrakingThreshold: "standard",
    suitableFor: "Автопоезда 38–42 тонны, шторные и изотермические полуприцепы (Krone, Schmitz, Тонар, Нефаз).",
  },
  {
    id: "heavy_tipper_tonar",
    name: "Тяжелый самосвал / Трал (ТОНАР / Grunwald 44-55т)",
    category: "heavy",
    description: "Увеличенное опережение и форсированный импульс натяжки полуприцепа для предотвращения набегания многотонного сыпучего груза при крутых спусках.",
    trailerLeadDeltaBar: 0.50,
    frontRearBrakeBalancePercent: 42,
    couplingForceControlEnabled: true,
    liningContactPressureBar: 0.45,
    retarderBlendingMode: "retarder_first",
    trailerStretchBrakeLevel: 5,
    hillStartAssistHoldSec: 4.0,
    trailerEmergencyBrakingThreshold: "aggressive",
    suitableFor: "Самосвальные полуприцепы 3–4 оси (песок, щебень, уголь), тяжеловозы, тралы с негабаритом.",
  },
  {
    id: "solo_tractor_4x2",
    name: "Одиночный тягач 4x2 (Без полуприцепа / Перегон)",
    category: "solo",
    description: "Безопасная конфигурация для разгруженной задней оси тягача без сцепки. Блокирует подачу давления на прицеп и переносит усилие на передний рулевой мост.",
    trailerLeadDeltaBar: 0.00,
    frontRearBrakeBalancePercent: 58,
    couplingForceControlEnabled: false,
    liningContactPressureBar: 0.35,
    retarderBlendingMode: "balanced",
    trailerStretchBrakeLevel: 1,
    hillStartAssistHoldSec: 1.5,
    trailerEmergencyBrakingThreshold: "gentle",
    suitableFor: "Одиночные перегоны тягача без полуприцепа, сервисные поездки на ТО.",
  },
  {
    id: "winter_slippery_road",
    name: "Зимний режим / Анти-ножницы (Гололед / Снег)",
    category: "winter",
    description: "Специальная калибровка для скользких дорог: максимальная превентивная растяжка автопоезда, мягкий ретардер для предотвращения блокировки ведущей оси.",
    trailerLeadDeltaBar: 0.45,
    frontRearBrakeBalancePercent: 48,
    couplingForceControlEnabled: true,
    liningContactPressureBar: 0.38,
    retarderBlendingMode: "balanced",
    trailerStretchBrakeLevel: 4,
    hillStartAssistHoldSec: 3.0,
    trailerEmergencyBrakingThreshold: "aggressive",
    suitableFor: "Зимние рейсы (Сибирь, Урал, перевал), заснеженные трассы, мокрый лед.",
  },
];

export const COMMON_DTC_DATABASE: Record<string, { title: string; desc: string; fix: string; ecu: EcuType }> = {
  "SPN 3226 FMI 9": {
    title: "Датчик NOx за нейтрализатором: ошибка CAN",
    desc: "Нет ответа от датчика оксидов азота на выходе SCR.",
    fix: "Проверить проводку и питание +24V, заменить сенсор 0281007817.",
    ecu: "EDC17",
  },
  "SPN 3216 FMI 9": {
    title: "Датчик NOx перед нейтрализатором: ошибка CAN",
    desc: "Нет ответа от датчика оксидов азота на входе SCR.",
    fix: "Проверить разъем под правой подножкой кабины.",
    ecu: "EDC17",
  },
  "SPN 1761 FMI 1": {
    title: "Низкий уровень AdBlue",
    desc: "Остаток мочевины в баке менее 5%.",
    fix: "Залить жидкость AUS 32.",
    ecu: "SCR_DCU",
  },
  "SPN 102 FMI 16": {
    title: "Давление наддува выше нормы (Передув)",
    desc: "Повышенное давление турбины во впускном тракте.",
    fix: "Проверить актуатор VGT турбокомпрессора Holset.",
    ecu: "EDC17",
  },
  "SPN 157 FMI 0": {
    title: "Давление топлива в рампе Common Rail выше нормы",
    desc: "Давление в рейке превысило 1850 Bar.",
    fix: "Проверить клапан дозирования на ТНВД (MeUN) и аварийный сбросной клапан PRV.",
    ecu: "EDC17",
  },
  "SPN 157 FMI 1": {
    title: "Давление топлива в рампе Common Rail ниже нормы",
    desc: "Просадка высокого давления под нагрузкой.",
    fix: "Заменить топливные фильтры тонкой и грубой очистки (сепаратор). Проверить слив форсунок в обратку.",
    ecu: "EDC17",
  },
  "SPN 190 FMI 0": {
    title: "Превышение максимально допустимых оборотов двигателя",
    desc: "Обороты коленвала превысили 2600 об/мин (оверспид под уклон).",
    fix: "Сбросить ошибку, проинструктировать водителя по использованию ретардера.",
    ecu: "EDC17",
  },
  "SPN 651 FMI 5": {
    title: "Форсунка Цилиндра №1: обрыв цепи",
    desc: "ЭБУ EDC17 зафиксировал разрыв цепи соленоида форсунки 1.",
    fix: "Снять клапанную крышку, проверить затяжку гаек на контактах форсунки №1 и проводку под крышкой.",
    ecu: "EDC17",
  },
  "SPN 597 FMI 2": {
    title: "Несоответствие сигналов датчиков педали тормоза",
    desc: "Разночтение между датчиком нажатия педали WABCO и микропереключателем.",
    fix: "Проверить главный тормозной кран и проводку к блоку EBS3.",
    ecu: "EBS3",
  },
  "SPN 520202 FMI 31": {
    title: "Спорадическая ошибка CAN2 CBCU",
    desc: "Потеря пакетов кузовной электроники.",
    fix: "Проверить переходной жгут кабины.",
    ecu: "CBCU",
  },
  "SPN 4334 FMI 18": {
    title: "Давление AdBlue в магистрали дозатора ниже нормы",
    desc: "Насос DeNOx не создает требуемое давление 9 Bar.",
    fix: "Заменить фильтр насоса мочевины, проверить сетку заборника в баке и нагревательные трубки.",
    ecu: "SCR_DCU",
  },
};

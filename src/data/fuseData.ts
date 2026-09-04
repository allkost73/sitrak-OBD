import { FuseItem, RelayItem } from "../types";

export const SITRAK_FUSES: FuseItem[] = [
  // ====================== СЕКЦИЯ 1: ДВИГАТЕЛЬ И ЭБУ ======================
  {
    id: "fuse-f1",
    slot: "F1",
    ratingAmps: 20,
    colorCode: "yellow",
    circuitName: "ЭБУ Двигателя EDC17CV44 (Постоянное питание +30)",
    description: "Главная силовая линия постоянного питания блока управления двигателем Bosch EDC17CV44 (Sinotruk MC13).",
    ecuConnection: "EDC17",
    category: "engine_ecu",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд A, гнездо 1",
    symptomsIfBlown: [
      "Двигатель не заводится (стартер крутит вхолостую)",
      "Нет связи с блоком EDC17 по CAN J1939 (ошибка связи на приборке)",
      "Не включается главное реле двигателя K2",
      "Приборная панель не отображает давление масла и температуру ОЖ"
    ],
    multimeterCheck: "Замер между контактом 1 гнезда и массой кабины: должно быть +24...28V всегда (даже при выключенном зажигании).",
    relatedDtcCodes: ["SPN 629 FMI 12", "SPN 168 FMI 1", "U0100"],
    wireColor: "Красный / Белая полоса (RD/WH)"
  },
  {
    id: "fuse-f2",
    slot: "F2",
    ratingAmps: 10,
    colorCode: "red",
    circuitName: "ЭБУ Двигателя EDC17CV44 (Зажигание +15)",
    description: "Управляющий сигнал включения зажигания Кл.15 на процессор EDC17 и датчики положения коленвала/распредвала.",
    ecuConnection: "EDC17",
    category: "engine_ecu",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд A, гнездо 2",
    symptomsIfBlown: [
      "Блок двигателя не просыпается при повороте ключа",
      "Чек горит тускло или отсутствует индикация свечей накала",
      "Двигатель мгновенно глохнет при отпускании ключа"
    ],
    multimeterCheck: "+24V появляется только во 2-м положении замка зажигания (Кл. 15 ON).",
    relatedDtcCodes: ["SPN 158 FMI 2", "SPN 636 FMI 2"],
    wireColor: "Черный / Синяя полоса (BK/BL)"
  },
  {
    id: "fuse-f3",
    slot: "F3",
    ratingAmps: 25,
    colorCode: "white",
    circuitName: "АКПП ZF TraXon 12TX2620 (Питание привода сцепления и соленоидов)",
    description: "Силовое питание электронного модуля управления и гидропневматических актуаторов коробки передач ZF TraXon.",
    ecuConnection: "TRAXON",
    category: "transmission_brakes",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд A, гнездо 3",
    symptomsIfBlown: [
      "АКПП зависает в нейтрали N, на дисплее символ 'TCU Failure' или прочерк",
      "Не происходит выжим сцепления при трогании",
      "Селектор передач D/R не реагирует на команды",
      "Коробка передач не выходит на диагностику по шине CAN"
    ],
    multimeterCheck: "+24V постоянное питание. При просадке ниже 21V актуатор TraXon блокирует включение передач.",
    relatedDtcCodes: ["SPN 2003 FMI 9", "SPN 563 FMI 2", "TCU 1024"],
    wireColor: "Красный / Желтая полоса (RD/YE)"
  },
  {
    id: "fuse-f4",
    slot: "F4",
    ratingAmps: 30,
    colorCode: "green",
    circuitName: "Тормозная система WABCO EBS3 / ABS тягача",
    description: "Питание электронного блока управления WABCO EBS3, переднего и заднего 2-канальных модуляторов давления.",
    ecuConnection: "EBS3",
    category: "transmission_brakes",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд A, гнездо 4",
    symptomsIfBlown: [
      "Горит красный сигнал неисправности тормозов EBS / ABS",
      "Торможение происходит в аварийном чисто пневматическом режиме (без антиблокировки)",
      "Не работает система курсовой устойчивости ESC и противобуксовка ASR",
      "Прицеп не растормаживается или тормозит с задержкой"
    ],
    multimeterCheck: "+24V постоянное питание. Проверьте ток покоя (норма 40-80 мА).",
    relatedDtcCodes: ["SPN 1056 FMI 2", "SPN 1058 FMI 3", "EBS 0102"],
    wireColor: "Красный / Черная полоса (RD/BK)"
  },
  {
    id: "fuse-f5",
    slot: "F5",
    ratingAmps: 20,
    colorCode: "yellow",
    circuitName: "Модулятор прицепа WABCO TCM (Trailer Control Module)",
    description: "Питание клапана управления тормозами прицепа TCM и розетки разъема ISO 7638 (EBS полуприцепа).",
    ecuConnection: "EBS3",
    category: "transmission_brakes",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд A, гнездо 5",
    symptomsIfBlown: [
      "Прицеп встает на стояночный заторможенный контур",
      "Нет связи с модулятором полуприцепа (ошибка Trailer ABS Warning)",
      "Перегрев тормозных барабанов/дисков полуприцепа из-за некорректного растормаживания"
    ],
    multimeterCheck: "Проверка на контактах 1 и 2 кабеля ISO 7638 (за кабиной): должно быть +24V.",
    relatedDtcCodes: ["SPN 1058 FMI 5", "SPN 1060 FMI 2"],
    wireColor: "Коричневый / Красная полоса (BN/RD)"
  },
  {
    id: "fuse-f6",
    slot: "F6",
    ratingAmps: 25,
    colorCode: "white",
    circuitName: "Система нейтрализации SCR DeNOx 2.2 / Насос AdBlue",
    description: "Питание блока дозирования мочевины, насосного модуля DeNOx, нагревателей трубок и бака AdBlue.",
    ecuConnection: "SCR_DCU",
    category: "scr_denox",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд A, гнездо 6",
    symptomsIfBlown: [
      "Горит значок 'Чек двигателя' и 'Низкое давление AdBlue'",
      "Через 50 км начнется ограничение крутящего момента двигателя на 25-40% (дерейтинг Sinotruk)",
      "Насос AdBlue не жужжит при включении зажигания и продувке",
      "Отказ подогревателя бака мочевины в мороз"
    ],
    multimeterCheck: "+24V постоянное питание. При перегорании проверьте ТЭН подогрева бака на короткое замыкание.",
    relatedDtcCodes: ["SPN 3226 FMI 9", "SPN 4364 FMI 18", "SPN 3361 FMI 5"],
    wireColor: "Синий / Белая полоса (BL/WH)"
  },
  {
    id: "fuse-f7",
    slot: "F7",
    ratingAmps: 15,
    colorCode: "blue",
    circuitName: "Датчики оксидов азота NOx (Входной и Выходной) + Датчик сажи DPF",
    description: "Питание подогревателей и электроники смарт-датчиков Continental/Bosch NOx до и после нейтрализатора.",
    ecuConnection: "SCR_DCU",
    category: "scr_denox",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд A, гнездо 7",
    symptomsIfBlown: [
      "Ошибка 'NOx Sensor 2 Circuit Malfunction' (SPN 3226 / 3216)",
      "Ограничение скорости тягача до 20 км/ч или мощности по регламенту Евро-5",
      "Датчик NOx не выходит на рабочую температуру 750°C",
      "CAN-сообщения от датчиков NOx не поступают в шину двигателя"
    ],
    multimeterCheck: "На 4-пиновом разъеме датчика NOx на выхлопной трубе: Пин 1 (+24V), Пин 2 (Масса), Пин 3 (CAN-H 2.6V), Пин 4 (CAN-L 2.4V).",
    relatedDtcCodes: ["SPN 3226 FMI 9", "SPN 3216 FMI 9", "P20EE"],
    wireColor: "Фиолетовый / Белая полоса (VT/WH)"
  },
  {
    id: "fuse-f8",
    slot: "F8",
    ratingAmps: 30,
    colorCode: "green",
    circuitName: "Кузовной блок CBCU-V3 (Главное питание +30)",
    description: "Основное силовое питание процессорного ядра кузовного контроллера Sinotruk CBCU.",
    ecuConnection: "CBCU",
    category: "cabin_comfort",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд B, гнездо 1",
    symptomsIfBlown: [
      "Полный отказ электрооборудования кабины: свет, замки, стеклоподъемники",
      "Не включается зажигание через замок",
      "Приборная панель не светится",
      "CBCU не выходит на связь по диагностике"
    ],
    multimeterCheck: "+24V постоянное питание от шины +30. Проверьте колодку CBCU CN1.",
    relatedDtcCodes: ["U0140", "CBCU 0012"],
    wireColor: "Красный толстый провод 4.0 мм²"
  },
  {
    id: "fuse-f9",
    slot: "F9",
    ratingAmps: 20,
    colorCode: "yellow",
    circuitName: "Кузовной блок CBCU-V3 (Цепи освещения и силовые реле)",
    description: "Питание выходных ключей наружного и внутреннего освещения кабины Sitrak S7H.",
    ecuConnection: "CBCU",
    category: "lighting_signals",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд B, гнездо 2",
    symptomsIfBlown: [
      "Не горят фары ближнего и дальнего света",
      "Не работает плафон освещения спального места и кабины",
      "Не работают контурные огни на спойлере крыши"
    ],
    multimeterCheck: "Замер напряжения на выходах разъемов CBCU CN2 и CN3 при включении подрулевого переключателя.",
    relatedDtcCodes: ["CBCU 0145", "CBCU 0146"],
    wireColor: "Желтый / Черная полоса (YE/BK)"
  },
  {
    id: "fuse-f10",
    slot: "F10",
    ratingAmps: 10,
    colorCode: "red",
    circuitName: "Приборная панель ICU и цифровой тахограф VDO / Sinotruk",
    description: "Питание цветного дисплея комбинации приборов, индикаторов бортового компьютера и блока тахографа.",
    ecuConnection: "ICU",
    category: "cabin_comfort",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд B, гнездо 3",
    symptomsIfBlown: [
      "Черный экран комбинации приборов, стрелки тахометра и спидометра лежат на нуле",
      "Тахограф отключается и выдает ошибку по питанию",
      "Зуммер предупреждений не звучит"
    ],
    multimeterCheck: "+24V на пине 1 и пине 18 разъема приборного щитка.",
    relatedDtcCodes: ["U0155", "ICU 0001"],
    wireColor: "Серый / Красная полоса (GY/RD)"
  },
  {
    id: "fuse-f11",
    slot: "F11",
    ratingAmps: 10,
    colorCode: "red",
    circuitName: "Диагностический разъем OBD-2 / ELM327 / CAN-шлюз",
    description: "Постоянное питание +24V на 16-й контакт диагностического разъема OBD-2 (для питания сканеров ELM327/ELM375/Sinotruk VCI).",
    category: "engine_ecu",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд B, гнездо 4",
    symptomsIfBlown: [
      "Диагностический адаптер ELM327 / ELM375 не включается (не горят светодиоды Power)",
      "Сканер пишет 'Нет питания на разъеме OBD' или 'Устройство не отвечает'",
      "Приложение не может подключиться к адаптеру"
    ],
    multimeterCheck: "Замер между контактом 16 (правый нижний) и контактами 4/5 (масса) разъема OBD-II: должно быть ровно +24...28V.",
    relatedDtcCodes: ["U0001", "OBD_PWR_LOSS"],
    wireColor: "Красный тонкий провод (RD)"
  },
  {
    id: "fuse-f12",
    slot: "F12",
    ratingAmps: 15,
    colorCode: "blue",
    circuitName: "Осушитель воздуха WABCO с электроподогревом патрона",
    description: "Питание нагревательного элемента сбросного клапана и термостата осушителя пневмосистемы (защита от замерзания конденсата).",
    category: "transmission_brakes",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд B, гнездо 5",
    symptomsIfBlown: [
      "В мороз замерзает сбросной клапан осушителя (компрессор не качает воздух или стравливает без остановки)",
      "Конденсат в ресиверах и замерзание тормозных кранов WABCO",
      "Ошибки по давлению воздуха в контурах 1 и 2"
    ],
    multimeterCheck: "+24V при температуре наружного воздуха ниже +5°C (когда срабатывает встроенный термостат подогревателя).",
    relatedDtcCodes: ["SPN 1087 FMI 2"],
    wireColor: "Коричневый / Синяя полоса (BN/BL)"
  },
  {
    id: "fuse-f13",
    slot: "F13",
    ratingAmps: 20,
    colorCode: "yellow",
    circuitName: "Автономный отопитель кабины (Фен 4 кВт / Webasto / Eberspächer)",
    description: "Питание свечи накала, нагнетателя воздуха и топливного насоса сухого автономного отопителя спального места.",
    category: "cabin_comfort",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд B, гнездо 6",
    symptomsIfBlown: [
      "Пульт управления автономкой не светится и не реагирует",
      "Отопитель выключается с ошибкой по обрыву питания при попытке розжига (в момент накала свечи 15-18A)",
      "Холодно в спальнике во время стоянки"
    ],
    multimeterCheck: "+24V постоянное питание. Проверьте разъем жгута под сиденьем пассажира.",
    relatedDtcCodes: ["HEATER_ERR_01"],
    wireColor: "Красный / Черная полоса (RD/BK)"
  },
  {
    id: "fuse-f14",
    slot: "F14",
    ratingAmps: 25,
    colorCode: "white",
    circuitName: "Подогрев топливного фильтра грубой очистки (Сепаратор PL420 / Mann)",
    description: "Питание ТЭН подогрева дизельного топлива в колбе сепаратора и датчика наличия воды.",
    category: "engine_ecu",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд B, гнездо 7",
    symptomsIfBlown: [
      "Запарафинивание фильтра грубой очистки в зимний период",
      "Потеря тяги под нагрузкой и провал давления в Common Rail (мотор 'задыхается' от нехватки солярки)",
      "Не работает сигнализация отстоя воды в фильтре"
    ],
    multimeterCheck: "+24V при включенном реле подогрева сепаратора K5.",
    relatedDtcCodes: ["SPN 97 FMI 3", "SPN 157 FMI 18"],
    wireColor: "Белый / Черная полоса (WH/BK)"
  },
  {
    id: "fuse-f15",
    slot: "F15",
    ratingAmps: 20,
    colorCode: "yellow",
    circuitName: "Электрообогрев зеркал заднего вида и лобового стекла",
    description: "Питание нагревательных элементов основных и сферических зеркал, зоны покоя стеклоочистителей.",
    category: "cabin_comfort",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд C, гнездо 1",
    symptomsIfBlown: [
      "Зеркала заднего вида запотевают или покрываются льдом в дождь и снегопад",
      "Не греется кнопка включения обогрева зеркал на водительской двери"
    ],
    multimeterCheck: "+24V появляется на разъемах дверей при нажатии клавиши обогрева.",
    relatedDtcCodes: ["CBCU_MIRROR_HEAT"],
    wireColor: "Оранжевый / Белая полоса (OG/WH)"
  },
  {
    id: "fuse-f16",
    slot: "F16",
    ratingAmps: 25,
    colorCode: "white",
    circuitName: "Электростеклоподъемники водителя и пассажира",
    description: "Силовое питание электромоторов механизмов подъема стекол дверей.",
    category: "cabin_comfort",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд C, гнездо 2",
    symptomsIfBlown: [
      "Стекла дверей не опускаются и не поднимаются ни с водительского, ни с пассажирского пульта",
      "При нажатии кнопок стеклоподъемников нет щелчков реле"
    ],
    multimeterCheck: "+24V при включенном зажигании на дверных модулях DDM / PDM.",
    relatedDtcCodes: ["DDM_POWER_ERR"],
    wireColor: "Зеленый / Желтая полоса (GN/YE)"
  },
  {
    id: "fuse-f17",
    slot: "F17",
    ratingAmps: 20,
    colorCode: "yellow",
    circuitName: "Центральный замок и электропривод гидронасоса подъема кабины",
    description: "Питание соленоидов замков дверей, радиомодуля брелока и электрогидростанции опрокидывания кабины.",
    category: "cabin_comfort",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд C, гнездо 3",
    symptomsIfBlown: [
      "Двери не закрываются с кнопки пульта ДУ",
      "Не работает электрический подъем/опускание кабины (приходится качать вручную ломом)",
      "Срабатывает тревога штатной сигнализации"
    ],
    multimeterCheck: "+24V постоянное питание. Проверьте проводку насоса опрокидывания кабины у правого крыла.",
    relatedDtcCodes: ["CAB_TILT_ERR"],
    wireColor: "Синий / Красная полоса (BL/RD)"
  },
  {
    id: "fuse-f18",
    slot: "F18",
    ratingAmps: 15,
    colorCode: "blue",
    circuitName: "Гнезда прикуривателя 24V и преобразователь 24V/12V (USB розетки)",
    description: "Питание силовых розеток на передней консоли, под спальником и USB-портов зарядки телефонов.",
    category: "cabin_comfort",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд C, гнездо 4",
    symptomsIfBlown: [
      "Не работает прикуриватель 24V (не греется гнездо)",
      "Отсутствует зарядка на штатных USB-портах панели",
      "Не работает видеорегистратор или радар-детектор, подключенный в розетку"
    ],
    multimeterCheck: "+24V в центральном контакте гнезда прикуривателя при положении замка ACC/ON.",
    relatedDtcCodes: ["AUX_SOCKET_PWR"],
    wireColor: "Черный / Желтая полоса (BK/YE)"
  },
  {
    id: "fuse-f19",
    slot: "F19",
    ratingAmps: 20,
    colorCode: "yellow",
    circuitName: "Холодильник кабины (Sinotruk Coolbox) и инвертор 220V",
    description: "Питание компрессорного холодильника под нижним спальником и штатного преобразователя 24V → 220V 1000W.",
    category: "cabin_comfort",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд C, гнездо 5",
    symptomsIfBlown: [
      "Штатный холодильник не морозит (индикатор на панели холодильника не светится)",
      "Розетка 220V под спальным местом обесточена",
      "Не работает чайник или микроволновка водителя"
    ],
    multimeterCheck: "+24V на клеммной колодке под выдвижным ящиком холодильника.",
    relatedDtcCodes: ["INVERTER_FAULT"],
    wireColor: "Красный / Зеленая полоса (RD/GN)"
  },
  {
    id: "fuse-f20",
    slot: "F20",
    ratingAmps: 15,
    colorCode: "blue",
    circuitName: "Электромагнитные клапаны пневмоподвески кабины и сиденья водителя ISRI",
    description: "Питание датчиков высоты кабины, амортизаторов с изменяемой жесткостью и пневмоподушки водительского кресла.",
    category: "cabin_comfort",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд C, гнездо 6",
    symptomsIfBlown: [
      "Кабина падает на отбойники или перекашивается на одну сторону",
      "Сиденье водителя опускается в нижнее положение и не накачивается воздухом",
      "Жесткие удары по раме на неровностях дороги"
    ],
    multimeterCheck: "+24V на клапанном блоке подвески кабины за задней стенкой.",
    relatedDtcCodes: ["CAB_SUSP_001"],
    wireColor: "Желтый / Синяя полоса (YE/BL)"
  },
  {
    id: "fuse-f21",
    slot: "F21",
    ratingAmps: 20,
    colorCode: "yellow",
    circuitName: "Пневмоподвеска ведущего моста WABCO ECAS",
    description: "Питание электронного блока управления подвеской ECAS, пульта регулировки уровня пола и датчиков положения моста.",
    ecuConnection: "EBS3",
    category: "transmission_brakes",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд D, гнездо 1",
    symptomsIfBlown: [
      "Не работает регулировка высоты седла с пульта в кабине (пульт не включается)",
      "Тягач не держит транспортное положение (падает на подушках)",
      "Горит ошибка 'ECAS System Warning'"
    ],
    multimeterCheck: "+24V постоянное питание на разъеме блока ECAS у перегородки кабины.",
    relatedDtcCodes: ["SPN 1070 FMI 2", "ECAS 0031"],
    wireColor: "Серый / Зеленая полоса (GY/GN)"
  },
  {
    id: "fuse-f22",
    slot: "F22",
    ratingAmps: 30,
    colorCode: "green",
    circuitName: "Климатическая установка (HVAC) и вентилятор печки кабины",
    description: "Силовое питание ШИМ-регулятора скорости мотора отопителя и сервоприводов заслонок смешения воздуха.",
    category: "cabin_comfort",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд D, гнездо 2",
    symptomsIfBlown: [
      "Вентилятор печки не дует ни на одной из скоростей",
      "Стекла кабины моментально затягивает конденсатом в дождь/снег",
      "Блок климат-контроля не регулирует температуру обдува"
    ],
    multimeterCheck: "+24V на толстом плюсовом проводе мотора печки за бардачком.",
    relatedDtcCodes: ["HVAC_BLOWER_ERR"],
    wireColor: "Красный / Черная полоса (RD/BK 3.0 мм²)"
  },
  {
    id: "fuse-f23",
    slot: "F23",
    ratingAmps: 10,
    colorCode: "red",
    circuitName: "Электромагнитная муфта компрессора кондиционера A/C",
    description: "Питание реле K4 и прижимной пластины шкива компрессора кондиционера (фреон R134a).",
    category: "cabin_comfort",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд D, гнездо 3",
    symptomsIfBlown: [
      "Кондиционер не охлаждает воздух при нажатии кнопки A/C (муфта не притягивается)",
      "Шкив компрессора вращается вхолостую без нагрузки"
    ],
    multimeterCheck: "+24V на одноконтактном разъеме компрессора кондиционера при включении кнопки A/C и давлении фреона > 2.0 Bar.",
    relatedDtcCodes: ["AC_CLUTCH_ERR"],
    wireColor: "Зеленый / Черная полоса (GN/BK)"
  },
  {
    id: "fuse-f24",
    slot: "F24",
    ratingAmps: 15,
    colorCode: "blue",
    circuitName: "Фары ближнего света LED / Галоген (Левая и Правая)",
    description: "Силовые каналы питания модулей ближнего света головной оптики Sitrak S7H.",
    category: "lighting_signals",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд D, гнездо 4",
    symptomsIfBlown: [
      "Обе фары ближнего света не горят",
      "На приборной панели мигает индикатор неисправности ламп головного света"
    ],
    multimeterCheck: "+24V на пинах фар головного света при включении реле K6.",
    relatedDtcCodes: ["CBCU_LOWBEAM_ERR"],
    wireColor: "Желтый / Белая полоса (YE/WH)"
  },
  {
    id: "fuse-f25",
    slot: "F25",
    ratingAmps: 20,
    colorCode: "yellow",
    circuitName: "Фары дальнего света и верхние прожекторы козырька крыши",
    description: "Питание дальнего света фар и дополнительных фонарей дальнего боя на спойлере высокой кабины.",
    category: "lighting_signals",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд D, гнездо 5",
    symptomsIfBlown: [
      "Не работает дальний свет фар и мигание рычагом на себя",
      "Не светят верхние прожекторы на козырьке кабины"
    ],
    multimeterCheck: "+24V на контактах реле дальнего света K7.",
    relatedDtcCodes: ["CBCU_HIGHBEAM_ERR"],
    wireColor: "Белый / Синяя полоса (WH/BL)"
  },
  {
    id: "fuse-f26",
    slot: "F26",
    ratingAmps: 15,
    colorCode: "blue",
    circuitName: "Передние противотуманные фары (ПТФ) и боковая подсветка поворотов",
    description: "Питание ламп в нижней части бампера и функции Cornering Light (подсветка при повороте руля).",
    category: "lighting_signals",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд D, гнездо 6",
    symptomsIfBlown: [
      "Не включаются передние противотуманки",
      "Не подсвечивается обочина при включении поворотника на малой скорости"
    ],
    multimeterCheck: "+24V на разъемах ПТФ в бампере при нажатии клавиши на панели.",
    relatedDtcCodes: ["CBCU_FOG_ERR"],
    wireColor: "Серый / Желтая полоса (GY/YE)"
  },
  {
    id: "fuse-f27",
    slot: "F27",
    ratingAmps: 10,
    colorCode: "red",
    circuitName: "Габаритные огни, подсветка номерного знака и подсветка приборов",
    description: "Питание передних LED габаритов 'ресничек', задних габаритных фонарей и подсветки кнопок торпедо.",
    category: "lighting_signals",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд E, гнездо 1",
    symptomsIfBlown: [
      "Не горят габариты по кругу тягача",
      "В темноте не подсвечиваются клавиши и регуляторы на панели приборов",
      "Не горит подсветка госномера"
    ],
    multimeterCheck: "+24V на контактах габаритов при 1-м положении переключателя света.",
    relatedDtcCodes: ["CBCU_PARKLAMP_ERR"],
    wireColor: "Коричневый / Белая полоса (BN/WH)"
  },
  {
    id: "fuse-f28",
    slot: "F28",
    ratingAmps: 15,
    colorCode: "blue",
    circuitName: "Стоп-сигналы тягача и фонари заднего хода",
    description: "Питание ламп стоп-сигналов при нажатии педали тормоза/ретардера и белых фонарей заднего хода.",
    category: "lighting_signals",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд E, гнездо 2",
    symptomsIfBlown: [
      "Не горят стоп-сигналы сзади при торможении (опасность ДТП)",
      "Не загорается свет заднего хода и не звучит предупреждающий зуммер при включении передачи R",
      "Прицеп не зажигает стоп-сигналы"
    ],
    multimeterCheck: "+24V появляется на сигнальном проводе датчика педали тормоза и клапана заднего хода.",
    relatedDtcCodes: ["CBCU_STOPLAMP_ERR"],
    wireColor: "Красный / Синяя полоса (RD/BL)"
  },
  {
    id: "fuse-f29",
    slot: "F29",
    ratingAmps: 15,
    colorCode: "blue",
    circuitName: "Указатели поворотов и аварийная световая сигнализация",
    description: "Питание электронного реле-прерывателя поворотников и повторителей на зеркалах.",
    category: "lighting_signals",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд E, гнездо 3",
    symptomsIfBlown: [
      "Не работают указатели поворотов (рычаг не дает эффекта, стрелки на приборке не мигают)",
      "Не включается кнопка аварийки"
    ],
    multimeterCheck: "+24V постоянное питание на аварийный контур CBCU.",
    relatedDtcCodes: ["CBCU_TURN_ERR"],
    wireColor: "Зеленый / Черная полоса (GN/BK)"
  },
  {
    id: "fuse-f30",
    slot: "F30",
    ratingAmps: 15,
    colorCode: "blue",
    circuitName: "Пневматический звуковой сигнал (Тифон на крыше) и электросигнал",
    description: "Питание электромагнитного воздушного клапана тифона и электрического клаксона за решеткой радиатора.",
    category: "cabin_comfort",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд E, гнездо 4",
    symptomsIfBlown: [
      "Звуковой сигнал не срабатывает при нажатии на рулевое колесо",
      "Не щелкает пневмоклапан тифона на крыше"
    ],
    multimeterCheck: "+24V на клемме реле K8 при замыкании контактов подрулевого шлейфа (улитки).",
    relatedDtcCodes: ["HORN_ERR_01"],
    wireColor: "Оранжевый / Черная полоса (OG/BK)"
  },
  {
    id: "fuse-f31",
    slot: "F31",
    ratingAmps: 20,
    colorCode: "yellow",
    circuitName: "Стеклоочиститель и насос омывателя лобового стекла",
    description: "Питание двухскоростного электромотора щеток стеклоочистителя и насоса подачи омывающей жидкости.",
    category: "cabin_comfort",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд E, гнездо 5",
    symptomsIfBlown: [
      "Дворники замирают в любом положении на стекле и не реагируют на рычаг",
      "Не работает моторчик омывателя стекла (нет подачи воды)"
    ],
    multimeterCheck: "+24V на контактах 1 и 2 колодки мотора трапеции стеклоочистителя.",
    relatedDtcCodes: ["WIPER_FUSE_ERR"],
    wireColor: "Синий / Желтая полоса (BL/YE)"
  },
  {
    id: "fuse-f32",
    slot: "F32",
    ratingAmps: 15,
    colorCode: "blue",
    circuitName: "Мультимедиа Sinotruk Smart Touch 10' и камеры кругового обзора 360°",
    description: "Питание головного мультимедийного устройства на Android, блока обработки видеокамер 360 и навигации.",
    category: "cabin_comfort",
    location: "cabin_main",
    locationDetails: "Главный блок под панелью пассажира, ряд E, гнездо 6",
    symptomsIfBlown: [
      "Центральный планшет не включается (черный экран)",
      "Не работают камеры кругового обзора и камера заднего хода при маневрировании",
      "Нет звука радио и Bluetooth связи"
    ],
    multimeterCheck: "+24V постоянное питание +30 и сигнал зажигания ACC на колодке мультимедиа.",
    relatedDtcCodes: ["RADIO_PWR_OFF"],
    wireColor: "Желтый / Зеленая полоса (YE/GN)"
  },

  // ====================== СЕКЦИЯ 2: СИЛОВОЙ БЛОК АКБ (MEGA / MAXI) ======================
  {
    id: "fuse-mf1",
    slot: "MF1",
    ratingAmps: 200,
    colorCode: "blue",
    circuitName: "Главный ввод электропитания тягача (Силовая шина кабины)",
    description: "Высокотоковый предохранитель типа Mega Fuse на плюсовой шине аккумулятора. Защищает всю бортовую сеть кабины.",
    category: "battery_power",
    location: "battery_box",
    locationDetails: "В ящике АКБ на раме слева, под пластиковой защитной крышкой",
    symptomsIfBlown: [
      "Полное обесточивание тягача: не горит ничего, зажигание не включается",
      "Тягач абсолютно 'мертв', замок зажигания не реагирует",
      "Напряжение на клеммах АКБ 25.4V, но в кабину ток не поступает"
    ],
    multimeterCheck: "Замер напряжения на обоих болтах предохранителя: если на одном +25.4V, а на втором 0V — предохранитель сгорел.",
    relatedDtcCodes: ["TOTAL_POWER_OUTAGE"],
    wireColor: "Силовой провод 50 мм² в бронерукаве"
  },
  {
    id: "fuse-mf2",
    slot: "MF2",
    ratingAmps: 150,
    colorCode: "orange",
    circuitName: "Силовая цепь втягивающего реле стартера 24V / 6.0 kW",
    description: "Защита мощного тягового реле стартера редукторного типа Sinotruk / Mitsubishi.",
    category: "battery_power",
    location: "battery_box",
    locationDetails: "В ящике АКБ на раме слева, шина стартера",
    symptomsIfBlown: [
      "При повороте ключа в положение 'Старт' раздается щелчок реле в кабине, но стартер даже не пытается крутить",
      "Приборка при попытке пуска не просаживается, стартер молчит"
    ],
    multimeterCheck: "+24V на силовом болте стартера M10 относительно корпуса двигателя.",
    relatedDtcCodes: ["STARTER_NO_CRANK"],
    wireColor: "Черный силовой провод 35 мм²"
  },
  {
    id: "fuse-mf3",
    slot: "MF3",
    ratingAmps: 150,
    colorCode: "orange",
    circuitName: "Электроподогреватель воздуха на впуске (Grid Heater / Свеча факельная)",
    description: "Силовой ТЭН подогрева впускного коллектора двигателя MC13 для уверенного холодного пуска до -40°C.",
    category: "battery_power",
    location: "battery_box",
    locationDetails: "В ящике АКБ на раме слева",
    symptomsIfBlown: [
      "Тяжелый запуск двигателя в мороз (белый дым, долгая прокрутка стартером)",
      "Спираль подогрева на приборной панели быстро гаснет или мигает ошибкой",
      "Холодный впускной коллектор после цикла предпускового прогрева"
    ],
    multimeterCheck: "Ток потребления при включении зажигания в мороз должен быть 90-120A в течение 20 секунд.",
    relatedDtcCodes: ["SPN 729 FMI 5", "GRID_HEATER_ERR"],
    wireColor: "Красный толстый провод 25 мм²"
  },
  {
    id: "fuse-mf4",
    slot: "MF4",
    ratingAmps: 125,
    colorCode: "green",
    circuitName: "Силовая розетка гидроборта / питания оборудования прицепа",
    description: "Защита силовой линии задней розетки для гидроборта (Dhollandia / Zepro) или самосвальной установки.",
    category: "battery_power",
    location: "battery_box",
    locationDetails: "В ящике АКБ на раме слева, разъем за кабиной",
    symptomsIfBlown: [
      "Гидроборт полуприцепа не поднимается и не опускается",
      "Нет питания на силовых клеммах в задней части рамы тягача"
    ],
    multimeterCheck: "+24V на силовой двухполюсной розетке гидроборта NATO.",
    relatedDtcCodes: ["TAILLIFT_PWR_ERR"],
    wireColor: "Черный/Красный кабель 35 мм²"
  },
  {
    id: "fuse-mf5",
    slot: "MF5",
    ratingAmps: 100,
    colorCode: "yellow",
    circuitName: "Генератор 28V / 110A (Силовая цепь заряда АКБ)",
    description: "Защита выхода силового диодного моста генератора Bosch / Sinotruk к аккумуляторам.",
    category: "battery_power",
    location: "battery_box",
    locationDetails: "В ящике АКБ на раме слева",
    symptomsIfBlown: [
      "Горит красный индикатор 'Нет заряда аккумулятора' на панели приборов",
      "При работающем моторе напряжение в сети падает до 23-22V (тягач едет чисто на аккумуляторах)",
      "Быстрый разряд батарей через 2-3 часа движения с фарами"
    ],
    multimeterCheck: "На клемме B+ генератора должно быть +28.2...28.6V при заведенном двигателе.",
    relatedDtcCodes: ["SPN 168 FMI 1", "GEN_CHARGE_FAIL"],
    wireColor: "Красный кабель 25 мм²"
  }
];

export const SITRAK_RELAYS: RelayItem[] = [
  {
    id: "relay-k1",
    slot: "K1",
    name: "Главное реле зажигания (Клемма 15)",
    type: "power_macro",
    description: "Подключает силовую шину +15 ко всем системам управления при включении ключа зажигания.",
    controlCircuit: "Замок зажигания / Ключ зажигания контакт 15/54",
    loadCircuit: "Блоки ЭБУ, приборная панель, датчики, клапаны трансмиссии",
    location: "cabin_relays",
    symptomsIfFailed: [
      "Зажигание не включается, лампы на приборке не загораются",
      "Стартер не крутит",
      "Все системы кабины обесточены в режиме движения"
    ],
    testSteps: "Проверить щелчок реле при повороте ключа. Замкнуть перемычкой силовые контакты 30 и 87 для проверки цепи."
  },
  {
    id: "relay-k2",
    slot: "K2",
    name: "Главное реле ЭБУ Двигателя EDC17 (+30 Main Relay)",
    type: "standard_mini",
    description: "Управляется напрямую процессором EDC17 для удержания питания при сохранении адаптаций в память EEPROM после выключения зажигания (Power-Latching).",
    controlCircuit: "Выходной ключ ЭБУ EDC17CV44 (Пин K04)",
    loadCircuit: "Форсунки Common Rail, датчик давления рейки, дозатор ТНВД, сервопривод VGT",
    location: "cabin_relays",
    symptomsIfFailed: [
      "Мотор заводится и сразу глохнет",
      "Ошибки по сбросу адаптаций форсунок и калибровок клапанов",
      "Потеря связи с EDC17"
    ],
    testSteps: "После выключения ключа зажигания реле должно оставаться замкнутым еще 5-10 секунд для записи параметров в EEPROM."
  },
  {
    id: "relay-k3",
    slot: "K3",
    name: "Реле стартера (Блокировка пуска от АКПП TraXon)",
    type: "power_macro",
    description: "Подает питание на втягивающее реле стартера только при подтверждении нейтрали (N) от контроллера коробки передач.",
    controlCircuit: "Блок CBCU + сигнал разрешения от АКПП ZF TraXon",
    loadCircuit: "Втягивающее реле стартера 24V",
    location: "cabin_relays",
    symptomsIfFailed: [
      "Стартер не крутит даже при горящей нейтрали 'N' на дисплее",
      "Слышны щелчки под панелью, но стартер не срабатывает"
    ],
    testSteps: "Замерить управляющее напряжение +24V на катушке реле (контакты 85-86) в момент поворота ключа на старт."
  },
  {
    id: "relay-k4",
    slot: "K4",
    name: "Реле электромагнитной муфты компрессора кондиционера",
    type: "standard_mini",
    description: "Включает прижимную пластину кондиционера по запросу климат-контроля и датчика давления фреона.",
    controlCircuit: "Блок климата HVAC / датчик давления 3-pin",
    loadCircuit: "Электромагнитная муфта компрессора A/C",
    location: "cabin_relays",
    symptomsIfFailed: [
      "Кондиционер дует теплым воздухом при исправном газе в системе",
      "Муфта компрессора не щелкает"
    ],
    testSteps: "Проверить сопротивление обмотки муфты (норма 12-18 Ом). Подать принудительно +24V на контакт 87."
  },
  {
    id: "relay-k5",
    slot: "K5",
    name: "Реле электроподогревателя топлива PL420",
    type: "standard_mini",
    description: "Включает нагреватель фильтра-сепаратора при температуре топлива ниже +2°C.",
    controlCircuit: "Термовыключатель на корпусе сепаратора",
    loadCircuit: "ТЭН подогрева фильтра грубой очистки",
    location: "cabin_relays",
    symptomsIfFailed: [
      "Фильтр холодный в мороз, парафин забивает сетку",
      "Ограничение тяги мотора зимой"
    ],
    testSteps: "Проверить ток нагрузки при включенном реле (должен быть 8-10A)."
  },
  {
    id: "relay-k6",
    slot: "K6",
    name: "Реле ближнего света фар",
    type: "standard_mini",
    description: "Коммутирует питание ламп ближнего света обеих блок-фар по сигналу от блока CBCU.",
    controlCircuit: "Кузовной блок CBCU",
    loadCircuit: "Фары ближнего света LED/Галоген",
    location: "cabin_relays",
    symptomsIfFailed: [
      "Не горит ближний свет с обеих сторон",
      "Индикация на приборке активна, но фары темные"
    ],
    testSteps: "Поменять местами с соседним реле K7 для быстрой проверки."
  },
  {
    id: "relay-k7",
    slot: "K7",
    name: "Реле дальнего света фар и прожекторов",
    type: "standard_mini",
    description: "Включает дальний свет фар и верхние люстры на крыше кабины.",
    controlCircuit: "Кузовной блок CBCU / подрулевой переключатель",
    loadCircuit: "Дальний свет фар + прожекторы",
    location: "cabin_relays",
    symptomsIfFailed: [
      "Не работает дальний свет при переключении подрулевого рычага"
    ],
    testSteps: "Проверить контакты 30 и 87 колодки реле на предмет подгорания."
  },
  {
    id: "relay-k8",
    slot: "K8",
    name: "Реле пневматического тифона / звукового сигнала",
    type: "standard_mini",
    description: "Подает сигнал на электропневмоклапан воздушного тифона на крыше.",
    controlCircuit: "Кнопка на рулевом колесе (шлейф руля)",
    loadCircuit: "Электромагнитный клапан пневмосигнала",
    location: "cabin_relays",
    symptomsIfFailed: [
      "Тифон не гудит при нажатии на руль"
    ],
    testSteps: "Проверить подачу +24V на клемму пневмоклапана под обшивкой крыши."
  },
  {
    id: "relay-k9",
    slot: "K9",
    name: "Реле подогрева зеркал заднего вида",
    type: "standard_mini",
    description: "Включает обогрев зеркал с автоматическим таймером отключения на 15 минут.",
    controlCircuit: "Кнопка обогрева на двери / CBCU",
    loadCircuit: "Нагревательные элементы 4-х зеркал кабины",
    location: "cabin_relays",
    symptomsIfFailed: [
      "Зеркала не оттаивают от наледи"
    ],
    testSteps: "Замерить ток цепи (суммарно около 6-8A)."
  },
  {
    id: "relay-k10",
    slot: "K10",
    name: "Реле нагревателя патрона осушителя WABCO",
    type: "standard_mini",
    description: "Включает электроподогрев сбросного клапана при отрицательных температурах.",
    controlCircuit: "Датчик наружной температуры / термостат",
    loadCircuit: "Нагревательный элемент осушителя воздуха",
    location: "cabin_relays",
    symptomsIfFailed: [
      "Замерзание сбросного клапана влагоотделителя зимой"
    ],
    testSteps: "Проверить наличие питания +24V на разъеме осушителя у правого лонжерона рамы."
  },
  {
    id: "relay-k11",
    slot: "K11",
    name: "Реле стеклоочистителей (Высокая скорость)",
    type: "standard_mini",
    description: "Переключает обмотки электромотора трапеции дворников в режим максимальной скорости очистки.",
    controlCircuit: "Подрулевой переключатель режим HI",
    loadCircuit: "Вторая скоростная обмотка мотора стеклоочистителя",
    location: "cabin_relays",
    symptomsIfFailed: [
      "Дворники работают только на 1-й медленной скорости"
    ],
    testSteps: "Проверить переключение контактов при переводе рычага в крайнее верхнее положение."
  },
  {
    id: "relay-k12",
    slot: "K12",
    name: "Реле питания систем полуприцепа (ISO 12098 / ISO 7638)",
    type: "power_macro",
    description: "Коммутирует силовое питание для электрооборудования и габаритов полуприцепа.",
    controlCircuit: "Блок CBCU при распознавании подключения прицепа",
    loadCircuit: "Розетки тягача 24N / 24S / 15-pin ISO",
    location: "cabin_relays",
    symptomsIfFailed: [
      "На прицепе не работают габариты или поворотники при исправной проводке тягача"
    ],
    testSteps: "Проверить контакты в 15-пиновой розетке за кабиной."
  }
];

export const FUSE_COLOR_MAP: Record<string, { bg: string; text: string; border: string; hex: string }> = {
  red: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/50", hex: "#ef4444" },
  blue: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/50", hex: "#3b82f6" },
  yellow: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/50", hex: "#f59e0b" },
  white: { bg: "bg-slate-200/20", text: "text-slate-200", border: "border-slate-300/50", hex: "#e2e8f0" },
  green: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/50", hex: "#10b981" },
  orange: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/50", hex: "#f97316" }
};

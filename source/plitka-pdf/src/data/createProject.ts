import { applyCompanyProfileToProject } from '../app/projectContactOperations';
import { clone, createId } from '../utils/clone';
import { defaultCompanyProfile } from './defaultTexts';
import { getTemplate } from './pageTemplates';
import type { DocumentSchemeId } from './documentSchemes';
import { Project, PresetId, Page, PageFormat, CompanyProfile, TableRow, IconZone } from '../types/project';

type PresetDefinition = {
  label: string;
  projectTitle: string;
  templateIds: string[];
  libraryStatus?: 'core' | 'legacy' | 'hidden';
  preferredSchemeId?: DocumentSchemeId;
  pageFormat?: PageFormat;
  showLogos?: boolean;
  companyProfile?: Partial<CompanyProfile>;
  customize?: (project: Project) => Project;
};

type ScenarioDataset = {
  collectionName: string;
  projectLine?: string;
  yearMark?: string;
};

export type VisiblePresetSummary = {
  id: PresetId;
  label: string;
  description: string;
  audience: string;
  pageCount: number;
};

function patchTextZone(page: Page, zoneId: string, value: string): Page {
  const zone = page.zones[zoneId];
  if (!zone || zone.kind !== 'text') return page;
  return {
    ...page,
    zones: {
      ...page.zones,
      [zoneId]: { ...zone, value }
    }
  };
}

function patchTextZones(page: Page, valuesByZoneId: Record<string, string>): Page {
  return Object.entries(valuesByZoneId).reduce(
    (nextPage, [zoneId, value]) => patchTextZone(nextPage, zoneId, value),
    page
  );
}

function patchTableZone(page: Page, zoneId: string, rows: TableRow[]): Page {
  const zone = page.zones[zoneId];
  if (!zone || zone.kind !== 'table') return page;
  return {
    ...page,
    zones: {
      ...page.zones,
      [zoneId]: { ...zone, rows }
    }
  };
}

function patchIconZone(page: Page, zoneId: string, valuesByItemId: Record<string, string>): Page {
  const zone = page.zones[zoneId];
  if (!zone || zone.kind !== 'icon') return page;
  if (zone.mode !== 'row' || !zone.items?.length) return page;

  const nextZone: IconZone = {
    ...zone,
    items: zone.items.map((item) => (
      valuesByItemId[item.id] ? { ...item, value: valuesByItemId[item.id] } : item
    ))
  };

  return {
    ...page,
    zones: {
      ...page.zones,
      [zoneId]: nextZone
    }
  };
}

function patchPagesByTemplate(project: Project, templateId: string, patch: (page: Page) => Page): Project {
  return {
    ...project,
    pages: project.pages.map((page) => (page.templateId === templateId ? patch(page) : page))
  };
}

const visiblePresetIds: PresetId[] = [
  'premium_catalog',
  'outdoor_collection',
  'slab_catalog',
  'wood_catalog',
  'editorial_catalog',
  'dealer_presentation',
  'client_offer',
  'price_list',
  'selection'
];

const presetDescriptions: Record<PresetId, string> = {
  mini_catalog: 'Короткий каталог с обзором серии, ассортиментом и контактом.',
  commercial_offer: 'Коммерческая сборка с техстраницами, прайсом и контактами.',
  price_list: 'Ассортимент и расчёт.',
  selection: 'Стиль, сцены и фактуры.',
  technical_package: 'Техническая подборка с таблицами, форматами и спецификацией.',
  moodboard_presentation: 'Moodboard-сценарий для подбора фактур и визуального сравнения.',
  premium_catalog: 'История, сцены и контакт.',
  outdoor_collection: 'Сцены, 20 мм и укладка.',
  slab_catalog: 'Слэб, толщины и форматы.',
  wood_catalog: 'Дуб, пол, стена и столешница.',
  editorial_catalog: 'Главы, цитата и коллаж.',
  dealer_presentation: 'Материалы, SKU и прайс.',
  client_offer: 'Кейс, сцены и расчёт.',
  empty: 'Пустой документ без стартовых страниц.'
};

const presetAudiences: Record<PresetId, string> = {
  mini_catalog: 'бренд / клиент',
  commercial_offer: 'менеджер / клиент',
  price_list: 'дилер / клиент',
  selection: 'клиент / проект',
  technical_package: 'менеджер / дилер',
  moodboard_presentation: 'клиент / проект',
  premium_catalog: 'бренд / клиент',
  outdoor_collection: 'бренд / дилер',
  slab_catalog: 'бренд / проект',
  wood_catalog: 'бренд / клиент',
  editorial_catalog: 'бренд / клиент',
  dealer_presentation: 'дилер / менеджер',
  client_offer: 'клиент',
  empty: 'с нуля'
};

const dealerRows: TableRow[] = [
  { article: 'ST-601', title: 'Sierra Stone Warm', format: '60x60', surface: 'матовая', thickness: '9 мм', quantity: 120, price: 2190, total: '' },
  { article: 'ST-612', title: 'Sierra Stone Large', format: '60x120', surface: 'матовая', thickness: '9 мм', quantity: 80, price: 2990, total: '' },
  { article: 'MR-601', title: 'Linea Marmo Ivory', format: '60x60', surface: 'сатин', thickness: '9 мм', quantity: 54, price: 2490, total: '' },
  { article: 'MR-612', title: 'Linea Marmo Vein', format: '60x120', surface: 'сатин', thickness: '9 мм', quantity: 36, price: 3290, total: '' }
];

const dealerSkuRows: TableRow[] = [
  { article: 'ST-601', title: 'Sierra Stone Warm', format: '60x60', surface: 'матовая', thickness: '9 мм', usage: 'пол / стены' },
  { article: 'ST-612', title: 'Sierra Stone Large', format: '60x120', surface: 'матовая', thickness: '9 мм', usage: 'пол / стены' },
  { article: 'MR-601', title: 'Linea Marmo Ivory', format: '60x60', surface: 'сатин', thickness: '9 мм', usage: 'стены / акцент' },
  { article: 'MR-612', title: 'Linea Marmo Vein', format: '60x120', surface: 'сатин', thickness: '9 мм', usage: 'стены / shower' },
  { article: 'WD-212', title: 'Oakline Soft', format: '20x120', surface: 'матовая', thickness: '9 мм', usage: 'жилые зоны' }
];

const clientRows: TableRow[] = [
  { article: 'ST-612', title: 'Sierra Stone Large', format: '60x120', surface: 'матовая', thickness: '9 мм', quantity: 68, price: 3290, total: '' },
  { article: 'MR-612', title: 'Linea Marmo Vein', format: '60x120', surface: 'сатин', thickness: '9 мм', quantity: 22, price: 3540, total: '' },
  { article: 'WD-212', title: 'Oakline Soft', format: '20x120', surface: 'матовая', thickness: '9 мм', quantity: 31, price: 2980, total: '' }
];

const premiumProfile: Partial<CompanyProfile> = {
  companyName: 'Vilray Studio',
  managerName: 'Каталожный отдел',
  phone: '+7 (495) 120-24-26',
  messenger: '@vilray_catalog',
  email: 'catalog@vilray.studio',
  website: 'vilray.studio/catalogs',
  address: 'Москва'
};

const dealerProfile: Partial<CompanyProfile> = {
  companyName: 'Vilray Studio',
  managerName: 'Отдел дилерских продаж',
  phone: '+7 (495) 560-33-12',
  messenger: 'Telegram / WhatsApp',
  email: 'dealer@vilray.studio',
  website: 'vilray.studio/dealers',
  address: 'Москва / региональные поставки'
};

const clientProfile: Partial<CompanyProfile> = {
  companyName: 'Vilray Studio',
  managerName: 'Анна Миронова',
  phone: '+7 (495) 240-18-06',
  messenger: 'Telegram / WhatsApp',
  email: 'hello@vilray.studio',
  website: 'vilray.studio',
  address: 'Москва'
};

const outdoorProfile: Partial<CompanyProfile> = {
  companyName: 'Vilray Studio',
  managerName: 'Отдел outdoor-коллекций',
  phone: '+7 (495) 120-24-26',
  messenger: '@vilray_catalog',
  email: 'outdoor@vilray.studio',
  website: 'vilray.studio/outdoor',
  address: 'Москва'
};

const slabProfile: Partial<CompanyProfile> = {
  companyName: 'Vilray Studio',
  managerName: 'Каталожный отдел',
  phone: '+7 (495) 120-24-26',
  messenger: '@vilray_catalog',
  email: 'catalog@vilray.studio',
  website: 'vilray.studio/catalogs',
  address: 'Москва'
};

const woodProfile: Partial<CompanyProfile> = {
  companyName: 'Vilray Studio',
  managerName: 'Каталожный отдел',
  phone: '+7 (495) 120-24-26',
  messenger: '@vilray_catalog',
  email: 'catalog@vilray.studio',
  website: 'vilray.studio/catalogs',
  address: 'Москва'
};

const editorialProfile: Partial<CompanyProfile> = {
  companyName: 'Vilray Studio',
  managerName: 'Каталожный отдел',
  phone: '+7 (495) 120-24-26',
  messenger: '@vilray_catalog',
  email: 'catalog@vilray.studio',
  website: 'vilray.studio/catalogs',
  address: 'Москва'
};

function customizePremiumCatalog(project: Project): Project {
  const scenario: ScenarioDataset = {
    collectionName: 'Pietra Nuvola',
    projectLine: 'Interior / Outdoor porcelain surfaces',
    yearMark: '2026 / PREMIUM EDITION'
  };
  let nextProject = patchPagesByTemplate(project, 'cover_reference_year_statement', (page) => {
    return patchTextZones(page, {
      year: '26',
      title: `${scenario.collectionName.toUpperCase()}\nCOLLECTION`,
      statement: 'Керамогранит с мягкой каменной фактурой для жилых, SPA и общественных интерьеров.',
      issue: scenario.yearMark ?? ''
    });
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_reference_material_bands', (page) => {
    return patchTextZones(page, {
      brandBadge: 'Curated palette',
      heading: 'Материальная палитра',
      intro: 'Три направления, на которых строится премиальная подача серии: база под камень, графичный мраморный акцент и тёплый компаньон для жилых зон.',
      label1: '01  CLOUD STONE / warm ivory',
      label2: '02  VEIN MARBLE / soft graphic',
      label3: '03  OAK BLEND / architectural wood',
      footerNote: 'Единая палитра для вашего пространства'
    });
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_reference_room_palette', (page) => {
    let nextPage = patchTextZones(page, {
      heading: 'Коллекция в интерьере',
      intro: 'Крупный интерьерный кадр, вертикальная палитра и основной формат серии на одной странице.',
      selected: 'PN-612\n60x120 / матовая\nPietra Nuvola'
    });
    nextPage = patchIconZone(nextPage, 'quickIcons', {
      'palette-size': '60x120',
      'palette-use': 'пол / стены'
    });
    return nextPage;
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_reference_dual_scene', (page) => {
    return patchTextZones(page, {
      heading: 'Один материал. Два сценария.',
      caption1: 'Светлая master bathroom',
      caption2: 'Контрастная lounge-зона'
    });
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_collection_comparison', (page) => {
    return patchTextZones(page, {
      heading: 'Сравнение коллекций',
      intro: 'Премиальная подача быстро объясняет разницу между базой, акцентом и более тёплым вариантом для жилых пространств.',
      note: 'Камень, мрамор и дерево — три характера одной коллекции.'
    });
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_reference_color_story', (page) => {
    return patchTextZones(page, {
      heading: 'Цветовая история',
      intro: 'База, полутона и акцентные поверхности складываются в спокойную премиальную палитру, которую легко продавать как архитектурное решение.',
      paletteNote: 'BASE  warm ivory\nMID  greige stone\nACCENT  marble vein\nOUTDOOR  sand'
    });
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_brand_technology_story', (page) => {
    return patchTextZones(page, {
      heading: 'Технология и контроль',
      intro: 'Короткий брендовый блок для каталога и презентации: технология, стабильность фактуры и контроль партий.',
      note: 'Точность формата. Стабильность оттенка. Внимание к каждой детали.'
    });
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_reference_dark_index', (page) => {
    return patchTextZones(page, {
      heading: `INDEX /\n${scenario.collectionName.toUpperCase()}`,
      section1: '01\nStone',
      section2: '02\nVein',
      section3: '03\nOutdoor',
      note1: 'Main palette\nPages 02-03',
      note2: 'Scene applications\nPages 04-05',
      note3: 'Outdoor story\nPages 06-07'
    });
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_reference_outdoor_story', (page) => {
    const nextPage = patchTextZones(page, {
      heading: 'Материал для интерьера и террасы',
      story: 'Одна палитра для дома и террасы. Материалы объединяют внутреннее и внешнее пространство.',
      materialText: 'PIETRA SAND\n60x60 / 20 mm\nструктурная поверхность'
    });
    return nextPage;
  });

  nextProject = patchPagesByTemplate(nextProject, 'contacts_next_step', (page) => {
    return patchTextZones(page, {
      heading: 'Образцы\nи расчёт',
      nextStep: 'Следующий шаг: подтвердить нужные поверхности, получить образцы и согласовать итоговую версию каталога, PDF или клиентского КП.'
    });
  });

  return nextProject;
}

function customizeDealerPresentation(project: Project): Project {
  let nextProject = patchPagesByTemplate(project, 'cover_architectural_catalog', (page) => {
    return patchTextZones(page, {
      brandBadge: 'Dealer presentation',
      title: 'Sierra Stone',
      subtitle: 'Презентация для дилеров: ходовые поверхности, артикулы, складская логика и аргументы для продажи серии в салоне.',
      issue: 'DEALER DECK 2026\nformats / stock / applications'
    });
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_reference_material_bands', (page) => {
    return patchTextZones(page, {
      brandBadge: 'Material archive',
      heading: 'Материалы и тона серии',
      intro: 'Быстрый экран для менеджера: чем отличаются каменная база, мраморный акцент и тёплый компаньон. Подходит для первой минуты разговора в салоне.',
      label1: '01  CORE STONE / warm greige',
      label2: '02  VEIN MARBLE / ivory satin',
      label3: '03  OAK PLANK / soft wood'
    });
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_series_overview', (page) => {
    return patchTextZones(page, {
      heading: 'Sierra Stone Dealer Overview',
      intro: 'Серия для showroom-продаж: понятные базовые тона, ходовые форматы, спокойная фактура и предсказуемое применение в жилых проектах.'
    });
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_reference_room_palette', (page) => {
    const nextPage = patchTextZones(page, {
      heading: 'Интерьер и базовая палитра',
      intro: 'Страница для быстрой презентации серии в салоне и подбора стартового набора образцов.',
      selected: 'ST-612\n60x120 / матовая\nSierra Stone Large'
    });
    return nextPage;
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_product_rows', (page) => (
    patchTextZones(page, {
      heading: 'Ходовые позиции серии',
      row1: 'ST-601  Sierra Stone Warm\n60x60 / матовая / 9 мм\nбаза для пола и стены',
      row2: 'MR-612  Linea Marmo Vein\n60x120 / сатин / 9 мм\nакцент для ванной и shower',
      row3: 'WD-212  Oakline Soft\n20x120 / матовая / 9 мм\nкомпаньон для жилых зон'
    })
  ));

  nextProject = patchPagesByTemplate(nextProject, 'catalog_sku_family_table', (page) => {
    let nextPage = patchTextZones(page, {
      heading: 'SKU-матрица дилерской серии',
      caption1: 'ST-601\n60x60',
      caption2: 'ST-612\n60x120',
      caption3: 'MR-601\n60x60',
      notes: 'Таблица для дилера: удобно показывать ходовые SKU, формат, поверхность и сценарий применения в одном экране.'
    });
    nextPage = patchTableZone(nextPage, 'table', dealerSkuRows);
    return nextPage;
  });

  nextProject = patchPagesByTemplate(nextProject, 'price_visual_quote', (page) => {
    let nextPage = patchTextZone(page, 'heading', 'Дилерский расчёт');
    nextPage = patchTextZone(nextPage, 'summary', 'Рекомендованный объём для стартового склада, ориентиры по цене и следующий шаг для подтверждения закупки.');
    nextPage = patchTableZone(nextPage, 'table', dealerRows);
    nextPage = patchTextZone(nextPage, 'totalBlock', 'Итого считается автоматически:\nцена x количество\nс учётом дилерской матрицы');
    return nextPage;
  });

  nextProject = patchPagesByTemplate(nextProject, 'table_packaging_price_matrix', (page) => {
    let nextPage = patchTextZones(page, {
      heading: 'Упаковка, склад и цена',
      intro: 'Коммерческий лист для закупки: упаковка, палеты, ориентир по цене и логистика поставки в дилерский канал.',
      note: 'Матрицу можно использовать как дилерский прайс-лист или приложить к внутреннему согласованию закупки.'
    });
    nextPage = patchIconZone(nextPage, 'icons', {
      'pack-box': '1,44 м2',
      'pack-pallet': '46,08 м2',
      'pack-warehouse': 'MSK / SPB',
      'pack-delivery': '3-7 дней'
    });
    nextPage = patchTableZone(nextPage, 'table', dealerRows);
    return nextPage;
  });

  nextProject = patchPagesByTemplate(nextProject, 'contacts_manager_card', (page) => {
    return patchTextZones(page, {
      heading: 'Ваш менеджер\nпо дилерскому каналу',
      address: 'Москва / региональные отгрузки\nрезерв и условия поставки подтверждаются отделом продаж',
      finalNote: 'В финальном PDF этот блок удобно менять на условия дилерской программы, QR на портал или таблицу статусов поставки.'
    });
  });

  return nextProject;
}

function customizeClientOffer(project: Project): Project {
  let nextProject = patchPagesByTemplate(project, 'cover_materials_intro', (page) => {
    return patchTextZones(page, {
      title: 'Плитка для\nRiverside',
      subtitle: 'Готовый набор материалов, форматов и интерьерных сцен для согласования с клиентом, дизайнером и подрядчиком.',
      specChip: 'stone / marble / wood / warm'
    });
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_collection_story', (page) => {
    return patchTextZones(page, {
      heading: 'Спокойная база\nдля жилого проекта',
      body: 'Подборка строится вокруг нейтральной каменной фактуры, которая держит интерьер и даёт гибкость в мебели, свете и декоративных акцентах.'
    });
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_reference_room_palette', (page) => {
    let nextPage = patchTextZones(page, {
      heading: 'Основной материал проекта',
      intro: 'Базовый интерьер, палитра поверхностей и главный формат для жилого проекта Riverside Residence.',
      selected: 'RS-612\n60x120 / матовая\nRiver Stone Warm'
    });
    nextPage = patchIconZone(nextPage, 'quickIcons', {
      'palette-size': '60x120',
      'palette-use': 'пол / стены'
    });
    return nextPage;
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_reference_dual_scene', (page) => {
    return patchTextZones(page, {
      heading: 'Две сцены для согласования',
      caption1: 'Master bathroom',
      caption2: 'Kitchen / dining'
    });
  });

  nextProject = patchPagesByTemplate(nextProject, 'price_summary_offer', (page) => {
    let nextPage = patchTextZones(page, {
      brandBadge: 'Client offer',
      heading: 'Резюме предложения',
      summary: 'Подборка: 3 позиции\nПлощадь: 121 м2\nДоставка: 7-10 дней',
      next: 'Следующий шаг: подтвердить подборку, получить финальный счёт и согласовать доставку на объект.'
    });
    nextPage = patchTableZone(nextPage, 'table', clientRows);
    return nextPage;
  });

  nextProject = patchPagesByTemplate(nextProject, 'contacts_next_step', (page) => {
    return patchTextZones(page, {
      heading: 'Согласовать\nподборку',
      nextStep: 'После согласования менеджер отправит финальный расчёт, подтвердит наличие и подготовит заказ к отгрузке.',
      companyName: 'Vilray Studio'
    });
  });

  return nextProject;
}

function customizeSelection(project: Project): Project {
  let nextProject = patchPagesByTemplate(project, 'catalog_collection_comparison', (page) => {
    return patchTextZones(page, {
      heading: 'Сравнение коллекций',
      intro: 'Показываем несколько вариантов сразу, чтобы сократить круг согласования по стилю и бюджету.',
      note: 'Страница полезна, когда клиент выбирает между базовой, акцентной и более спокойной серией.'
    });
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_project_case', (page) => {
    return patchTextZones(page, {
      heading: 'Проектный кейс',
      intro: 'Пара готовых сценариев использования помогает перевести подборку в реальный интерьер.',
      note: 'Кейс можно менять по объекту без перестройки всей подборки.'
    });
  });

  nextProject = patchPagesByTemplate(nextProject, 'catalog_two_interiors_two_tiles', (page) => {
    return patchTextZones(page, {
      heading: 'Материалы для одного проекта',
      caption1: 'Основная ванная',
      caption2: 'Гостиная и кухня'
    });
  });

  return nextProject;
}

const presetDefinitions: Record<PresetId, PresetDefinition> = {
  mini_catalog: {
    label: 'Мини-каталог',
    projectTitle: 'Мини-каталог Sierra Stone',
    libraryStatus: 'legacy',
    templateIds: [
      'cover_architectural_catalog',
      'catalog_collection_index',
      'catalog_series_overview',
      'catalog_interior_large_tile_focus',
      'catalog_two_interiors_two_tiles',
      'catalog_product_cards_6',
      'catalog_standard_range_page',
      'table_collection_technical_sheet',
      'contacts_next_step'
    ]
  },
  commercial_offer: {
    label: 'Коммерческое предложение',
    projectTitle: 'Коммерческое предложение',
    libraryStatus: 'legacy',
    templateIds: [
      'cover_architectural_catalog',
      'catalog_full_interior_slab_specs',
      'catalog_split_scene_tile_table',
      'catalog_sku_family_table',
      'catalog_application_spec',
      'price_visual_quote',
      'table_packaging_price_matrix',
      'contacts_manager_card'
    ]
  },
  price_list: {
    label: 'Прайс',
    projectTitle: 'Прайс',
    libraryStatus: 'core',
    templateIds: [
      'cover_catalog_hero',
      'catalog_cross_sell_companions',
      'catalog_product_grid_9',
      'catalog_standard_range_page',
      'catalog_sku_family_table',
      'price_room_estimate',
      'contacts_next_step'
    ]
  },
  selection: {
    label: 'Подбор',
    projectTitle: 'Подборка',
    libraryStatus: 'core',
    templateIds: [
      'cover_materials_intro',
      'catalog_collection_comparison',
      'catalog_project_case',
      'catalog_two_interiors_two_tiles',
      'catalog_cross_sell_companions',
      'catalog_surface_finish_detail',
      'catalog_product_cards_6',
      'contacts_next_step'
    ],
    customize: customizeSelection
  },
  technical_package: {
    label: 'Технический пакет',
    projectTitle: 'Технический пакет',
    libraryStatus: 'legacy',
    templateIds: [
      'cover_architectural_catalog',
      'catalog_collection_index',
      'catalog_split_scene_tile_table',
      'table_collection_technical_sheet',
      'table_packaging_price_matrix',
      'catalog_format_comparison',
      'catalog_standard_range_page',
      'catalog_sku_family_table',
      'contacts_manager_card'
    ]
  },
  moodboard_presentation: {
    label: 'Moodboard-презентация',
    projectTitle: 'Moodboard-презентация',
    libraryStatus: 'legacy',
    templateIds: [
      'cover_materials_intro',
      'catalog_moodboard_modern',
      'catalog_cross_sell_companions',
      'catalog_interior_two_large_tiles',
      'catalog_surface_finish_detail',
      'contacts_next_step'
    ]
  },
  premium_catalog: {
    label: 'Премиум',
    projectTitle: 'Pietra Nuvola Premium Catalogue',
    libraryStatus: 'core',
    templateIds: [
      'cover_reference_year_statement',
      'catalog_reference_material_bands',
      'catalog_reference_room_palette',
      'catalog_collection_comparison',
      'catalog_reference_dual_scene',
      'catalog_brand_technology_story',
      'catalog_reference_outdoor_story',
      'contacts_next_step'
    ],
    preferredSchemeId: 'minimal',
    showLogos: false,
    companyProfile: premiumProfile,
    customize: customizePremiumCatalog
  },
  outdoor_collection: {
    label: 'Терраса',
    projectTitle: 'Outdoor Collection Catalogue',
    libraryStatus: 'core',
    templateIds: [
      'catalog_outdoor_collection_scene',
      'catalog_outdoor_sku_quad',
      'catalog_outdoor_sku_mixed',
      'catalog_outdoor_sku_planks',
      'catalog_outdoor_install_cards',
      'catalog_outdoor_install_guide'
    ],
    preferredSchemeId: 'warm_catalog',
    pageFormat: 'a4_landscape',
    showLogos: false,
    companyProfile: outdoorProfile
  },
  slab_catalog: {
    label: 'Слэб',
    projectTitle: 'Slab Format Catalogue',
    libraryStatus: 'core',
    templateIds: [
      'catalog_slab_statement_cover',
      'catalog_slab_origin_formats',
      'catalog_slab_tone_scale',
      'catalog_slab_bookmatch',
      'catalog_slab_wet_interior',
      'catalog_slab_thickness_trio',
      'catalog_slab_finish_row',
      'catalog_slab_format_ladder',
      'catalog_slab_architecture'
    ],
    preferredSchemeId: 'premium_graphite',
    pageFormat: 'a4_landscape',
    showLogos: false,
    companyProfile: slabProfile
  },
  wood_catalog: {
    label: 'Планки',
    projectTitle: 'Wood Plank Catalogue',
    libraryStatus: 'core',
    templateIds: [
      'catalog_wood_opener',
      'catalog_wood_tone_story',
      'catalog_wood_full_scene',
      'catalog_wood_surface_split',
      'catalog_wood_plank_row',
      'catalog_wood_herringbone',
      'catalog_wood_companions',
      'catalog_wood_grain_macro',
      'catalog_wood_usage_icons'
    ],
    preferredSchemeId: 'warm_catalog',
    pageFormat: 'a4_landscape',
    showLogos: false,
    companyProfile: woodProfile
  },
  editorial_catalog: {
    label: 'Lookbook',
    projectTitle: 'Collection Lookbook',
    libraryStatus: 'core',
    templateIds: [
      'catalog_editorial_chapter',
      'catalog_editorial_quote',
      'catalog_editorial_dual_lifestyle',
      'catalog_editorial_collage',
      'catalog_editorial_index',
      'catalog_editorial_palette_ribbon',
      'catalog_editorial_side_caption',
      'catalog_editorial_project_case',
      'catalog_editorial_next_step'
    ],
    preferredSchemeId: 'minimal',
    pageFormat: 'a4_landscape',
    showLogos: false,
    companyProfile: editorialProfile
  },
  dealer_presentation: {
    label: 'Дилеру',
    projectTitle: 'Sierra Stone Dealer Presentation',
    libraryStatus: 'core',
    templateIds: [
      'cover_architectural_catalog',
      'catalog_reference_material_bands',
      'catalog_series_overview',
      'catalog_reference_room_palette',
      'catalog_product_rows',
      'catalog_sku_family_table',
      'price_visual_quote',
      'table_packaging_price_matrix',
      'contacts_manager_card'
    ],
    preferredSchemeId: 'dealer',
    showLogos: false,
    companyProfile: dealerProfile,
    customize: customizeDealerPresentation
  },
  client_offer: {
    label: 'Клиенту',
    projectTitle: 'КП по проекту Riverside Residence',
    libraryStatus: 'core',
    templateIds: [
      'cover_materials_intro',
      'catalog_collection_story',
      'catalog_project_case',
      'catalog_reference_room_palette',
      'catalog_reference_dual_scene',
      'price_summary_offer',
      'contacts_next_step'
    ],
    preferredSchemeId: 'warm_catalog',
    showLogos: false,
    companyProfile: clientProfile,
    customize: customizeClientOffer
  },
  empty: {
    label: 'Пустой документ',
    projectTitle: 'Пустой документ',
    libraryStatus: 'hidden',
    templateIds: []
  }
};

export const presetLabels: Record<PresetId, string> = Object.fromEntries(
  visiblePresetIds.map((id) => [id, presetDefinitions[id].label])
) as Record<PresetId, string>;

export const visiblePresetSummaries: VisiblePresetSummary[] = visiblePresetIds.map((id) => ({
  id,
  label: presetDefinitions[id].label,
  description: presetDescriptions[id],
  audience: presetAudiences[id],
  pageCount: presetDefinitions[id].templateIds.length
}));

export function getPresetLabel(preset: PresetId): string {
  return presetDefinitions[preset].label;
}

export function getPresetPreferredSchemeId(preset: PresetId): DocumentSchemeId | undefined {
  return presetDefinitions[preset].preferredSchemeId;
}

export function getPresetPresentationOverrides(preset: PresetId): Pick<Project, 'showLogos'> {
  return {
    showLogos: presetDefinitions[preset].showLogos ?? false
  };
}

export function createPageFromTemplate(templateId: string, order: number): Page {
  const template = getTemplate(templateId);
  return {
    id: createId('page'),
    templateId: template.id,
    title: template.title,
    order,
    zones: clone(template.defaultZones)
  };
}

export function createBlankPage(order: number): Page {
  return {
    id: createId('page'),
    templateId: 'blank',
    title: 'Пустая страница',
    order,
    zones: {}
  };
}

export function createProject(preset: PresetId = 'mini_catalog'): Project {
  const now = new Date().toISOString();
  const definition = presetDefinitions[preset];
  const baseProject: Project = {
    id: createId('project'),
    title: definition.projectTitle,
    preset,
    pageFormat: definition.pageFormat ?? 'a4_portrait',
    documentTheme: 'light',
    documentAccent: 'purple',
    documentAccentColor: undefined,
    documentBackgroundColor: undefined,
    documentTextPalette: 'classic',
    documentTextPrimaryColor: undefined,
    documentTextSecondaryColor: undefined,
    showLogos: definition.showLogos ?? false,
    showDividers: true,
    showPageNumbers: true,
    theme: { mode: 'light', accent: 'purple' },
    pages: definition.templateIds.map((templateId, index) => createPageFromTemplate(templateId, index)),
    mediaAssets: [],
    companyProfile: { ...defaultCompanyProfile, ...definition.companyProfile },
    createdAt: now,
    updatedAt: now
  };

  const projectWithContacts = applyCompanyProfileToProject(baseProject, baseProject.companyProfile);
  return definition.customize ? definition.customize(projectWithContacts) : projectWithContacts;
}

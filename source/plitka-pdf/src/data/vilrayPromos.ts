export type VilrayPromoId = 'interior_images' | 'catalogs' | 'websites' | 'compare_tiles';

export type VilrayPromoAccent = 'violet' | 'sand' | 'blue' | 'graphite';

export type VilrayPromoVariant = {
  id: VilrayPromoId;
  eyebrow: string;
  title: string;
  description: string;
  buttonLabel: string;
  modalTitle: string;
  modalLead: string;
  benefits: string[];
  resultItems: string[];
  scenarioTitle: string;
  scenarioText: string;
  accent: VilrayPromoAccent;
};

const ROTATION_KEY = 'vilray_promo_rotation_index';

export const vilrayPromoVariants: VilrayPromoVariant[] = [
  {
    id: 'interior_images',
    eyebrow: 'Интерьерные изображения',
    title: 'Нужны красивые интерьеры с вашей плиткой?',
    description: 'Подготовим визуализации коллекций для сайта, каталога, менеджеров и дилеров.',
    buttonLabel: 'Посмотреть формат',
    modalTitle: 'Интерьерные изображения с плиткой на заказ',
    modalLead:
      'Vilray Studio помогает показать плитку в живом интерьере: аккуратно, реалистично и без случайных стоковых решений.',
    benefits: [
      'Сцены под коллекцию, формат бренда и задачу продаж',
      'Визуализация плитки в ванной, кухне, прихожей или коммерческом интерьере',
      'Единый стиль для сайта, карточек товара, PDF и презентаций',
      'Материалы, которые удобно отдавать менеджерам и дилерам'
    ],
    resultItems: [
      'Подбор сценариев и ракурсов',
      'Готовые изображения для digital и печати',
      'Пакет обложек и превью для коллекций',
      'Адаптации под сайт, соцсети и PDF'
    ],
    scenarioTitle: 'Когда особенно полезно',
    scenarioText:
      'Вы запускаете новую коллекцию, но пока нет фотосъёмки, шоурума или готовых объектов. Визуализации помогают быстрее показать продукт и собрать первые заявки.',
    accent: 'violet'
  },
  {
    id: 'catalogs',
    eyebrow: 'Каталоги и PDF',
    title: 'Нужен каталог или презентация под ключ?',
    description: 'Соберём структуру, визуалы и аккуратный PDF для коллекций, дилеров и клиентов.',
    buttonLabel: 'Открыть пример услуги',
    modalTitle: 'Каталоги, презентации и PDF-материалы под ключ',
    modalLead:
      'Помогаем превратить коллекцию, прайс или набор изображений в понятный материал, который можно отправлять клиентам и использовать в продажах.',
    benefits: [
      'Логичная структура вместо набора разрозненных страниц',
      'Аккуратная подача SKU, размеров, фактур и преимуществ',
      'PDF, который удобно отправлять менеджерам, дилерам и архитекторам',
      'Единый визуальный язык для линейки материалов'
    ],
    resultItems: [
      'Каталог коллекции или серии',
      'Презентация для B2B и дилеров',
      'PDF-листовка или коммерческий материал',
      'Версии для экрана и печати'
    ],
    scenarioTitle: 'Типовой сценарий',
    scenarioText:
      'У вас есть коллекция, изображения, характеристики и позиционирование. Мы собираем это в продающий, спокойный и понятный PDF без перегруза.',
    accent: 'sand'
  },
  {
    id: 'websites',
    eyebrow: 'Сайты и лендинги',
    title: 'Нужен сайт для коллекции, услуги или B2B-продаж?',
    description: 'Спроектируем страницу, которая показывает продукт и помогает менеджерам получать заявки.',
    buttonLabel: 'Посмотреть подход',
    modalTitle: 'Сайты и лендинги для коллекций, услуг и B2B-продаж',
    modalLead:
      'Делаем спокойные, современные страницы для компаний из сферы дома, ремонта, интерьера, материалов и недвижимости.',
    benefits: [
      'Первый экран сразу показывает продукт или услугу',
      'Структура под реальные вопросы клиента и менеджера',
      'Блоки для коллекций, преимуществ, кейсов, документов и заявки',
      'Визуальный стиль без рекламной истерики и шаблонного шума'
    ],
    resultItems: [
      'Прототип и структура страницы',
      'Дизайн в стиле бренда',
      'Адаптивная вёрстка',
      'Подготовка контента для запуска'
    ],
    scenarioTitle: 'Где это работает',
    scenarioText:
      'Подходит для отдельной коллекции плитки, услуги для дилеров, новой линейки, B2B-направления или посадочной страницы под рекламу.',
    accent: 'blue'
  },
  {
    id: 'compare_tiles',
    eyebrow: 'Сравни плитку',
    title: 'Хотите удобно показывать и сравнивать плитку?',
    description: 'Сервис помогает визуально сравнить варианты и быстрее объяснить выбор клиенту.',
    buttonLabel: 'Открыть идею сервиса',
    modalTitle: 'Сервис «Сравни плитку» для показа и визуального сравнения',
    modalLead:
      'Формат для менеджеров, дизайнеров и клиентов: несколько вариантов плитки можно быстро сопоставить по виду, сценарию и ощущениям в интерьере.',
    benefits: [
      'Наглядное сравнение коллекций без длинных объяснений',
      'Удобный формат для консультации в шоуруме или онлайн',
      'Можно показывать похожие варианты, замены и комплекты',
      'Поддерживает продажу через визуальный выбор, а не только через характеристики'
    ],
    resultItems: [
      'Экран сравнения вариантов',
      'Визуальные сценарии применения',
      'Подборки для менеджеров',
      'Материалы для консультаций и отправки клиенту'
    ],
    scenarioTitle: 'Зачем бизнесу',
    scenarioText:
      'Клиент часто выбирает глазами, но менеджеру трудно быстро показать разницу между похожими коллекциями. Сравнение делает консультацию понятнее и короче.',
    accent: 'graphite'
  }
];

export function getVilrayPromoById(id?: string): VilrayPromoVariant {
  return vilrayPromoVariants.find((variant) => variant.id === id) ?? vilrayPromoVariants[0];
}

export function getNextVilrayPromoVariant(): VilrayPromoVariant {
  if (typeof window === 'undefined') {
    return vilrayPromoVariants[0];
  }

  try {
    const rawIndex = window.localStorage.getItem(ROTATION_KEY);
    const parsedIndex = rawIndex ? Number.parseInt(rawIndex, 10) : 0;
    const safeIndex = Number.isFinite(parsedIndex) && parsedIndex >= 0 ? parsedIndex : 0;
    const variant = vilrayPromoVariants[safeIndex % vilrayPromoVariants.length];
    window.localStorage.setItem(ROTATION_KEY, String((safeIndex + 1) % vilrayPromoVariants.length));
    return variant;
  } catch {
    return vilrayPromoVariants[0];
  }
}

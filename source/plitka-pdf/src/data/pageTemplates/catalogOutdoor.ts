import { ImageZone } from '../../types/project';
import { PageTemplate } from '../../types/templates';
import { placeholderImages, style, styled, text, badge, image, iconRow, productCell, template } from './shared';

function plankSample(id: string, src: string, x: number, y: number, w = 18, h = 8): ImageZone {
  return styled(image(id, 'Планка 20x120', src, 'product', '1:2', { x, y, w, h }), style.imagePlain);
}

type OutdoorSceneSpec = {
  id: string;
  title: string;
  description: string;
  heading: string;
  story: string;
  caption: string;
  badge: string;
  formatNote: string;
  sceneSrc: string;
};

function outdoorCollectionScene(spec: OutdoorSceneSpec): PageTemplate {
  return template(
    spec.id,
    'catalog_interior',
    spec.title,
    spec.description,
    placeholderImages.previewInteriorProducts,
    {
      heading: styled(text('heading', 'Название коллекции', spec.heading, 'h1', { x: 7, y: 9.2, w: 52, h: 7.5 }), style.darkText),
      installBadge: styled(badge('installBadge', spec.badge, { x: 68, y: 9.8, w: 25, h: 4.8 }), style.accentBadge),
      scene: styled(image('scene', 'Outdoor-сцена', spec.sceneSrc, 'interior', '16:9', { x: 7, y: 18.5, w: 86, h: 46 }), style.imageShadow),
      story: styled(text('story', 'Описание', spec.story, 'body', { x: 7, y: 67.5, w: 54, h: 16 }), style.mutedText),
      caption: styled(text('caption', 'Подпись сцены', spec.caption, 'small', { x: 64, y: 67.5, w: 29, h: 10 }), style.darkText),
      formatNote: styled(text('formatNote', 'Формат', spec.formatNote, 'small', { x: 64, y: 79, w: 29, h: 6 }), style.mutedText)
    }
  );
}

export const catalogOutdoorTemplates: PageTemplate[] = [
  outdoorCollectionScene({
    id: 'catalog_outdoor_collection_scene',
    title: 'Outdoor: сцена коллекции',
    description: 'Крупная outdoor-сцена, название коллекции, короткий текст и плашка способа укладки.',
    heading: 'Классический камень',
    story: 'Спокойная каменная фактура для террас, дорожек и зон у воды. Крупный формат держит плоскость и не спорит с озеленением, мебелью и светом.',
    caption: 'Терраса на газоне\nкерамогранит под камень',
    badge: '20 мм · газон',
    formatNote: '60x120 · 20 мм',
    sceneSrc: placeholderImages.catalogInteriorWarm
  }),

  template(
    'catalog_outdoor_copy_column',
    'catalog_interior',
    'Outdoor: сцена и текст',
    'Текстовая колонка слева и крупная деревянная outdoor-сцена справа — для планочных коллекций.',
    placeholderImages.previewInteriorProducts,
    {
      heading: styled(text('heading', 'Название коллекции', 'Outdoor-дуб', 'h1', { x: 7, y: 9.2, w: 30, h: 8 }), style.darkText),
      story: styled(text('story', 'Описание', 'Древесная планка для террас и зон отдыха. Рисунок дерева сохраняется в уличной эксплуатации, а формат 20x120 собирает настил без лишней графики швов.', 'body', { x: 7, y: 20, w: 28, h: 42 }), style.mutedText),
      formatNote: styled(text('formatNote', 'Формат', '20x120 · 20 мм\nструктурная поверхность\nтерраса / настил', 'small', { x: 7, y: 66, w: 28, h: 14 }), style.darkText),
      scene: styled(image('scene', 'Деревянная терраса', placeholderImages.catalogInteriorWood, 'interior', '16:9', { x: 39, y: 10, w: 54, h: 62 }), style.imageShadow),
      caption: styled(text('caption', 'Подпись сцены', 'Терраса · планка 20x120', 'small', { x: 39, y: 74, w: 54, h: 10 }), style.mutedText)
    }
  ),

  template(
    'catalog_outdoor_dual_scene',
    'catalog_interior',
    'Outdoor: две сцены',
    'Две сцены подряд: внутренний пол и терраса из одного материала, с подписями толщин.',
    placeholderImages.previewInteriorProducts,
    {
      heading: styled(text('heading', 'Заголовок', 'Один материал внутри и снаружи', 'h1', { x: 7, y: 9.2, w: 50, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Непрерывность пола между домом и террасой. Торцевой элемент закрывает срез и держит линию настила.', 'body', { x: 58, y: 9.4, w: 35, h: 8 }), style.mutedText),
      scene1: styled(image('scene1', 'Внутренний пол', placeholderImages.catalogInteriorLiving, 'interior', '16:9', { x: 7, y: 20, w: 86, h: 30 }), style.imageShadow),
      scene2: styled(image('scene2', 'Терраса', placeholderImages.catalogInteriorWarm, 'interior', '16:9', { x: 7, y: 52, w: 86, h: 28 }), style.imageShadow),
      caption1: styled(text('caption1', 'Подпись 1', 'Внутренний пол · 9 мм', 'small', { x: 7, y: 82, w: 40, h: 6 }), style.darkText),
      caption2: styled(text('caption2', 'Подпись 2', 'Терраса · 20 мм', 'small', { x: 50, y: 82, w: 43, h: 6 }), style.darkText)
    }
  ),

  template(
    'catalog_outdoor_sku_quad',
    'catalog_grid',
    'Outdoor: ассортимент 20 мм',
    'Четыре коллекции толстого формата 60x120: образец, название и толщина 20 мм.',
    placeholderImages.previewSampleGrid,
    {
      heading: styled(text('heading', 'Заголовок', 'Ассортимент 20 мм', 'h1', { x: 7, y: 9.2, w: 48, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', '60x120 · керамогранит для улицы', 'body', { x: 58, y: 10, w: 35, h: 6 }), style.mutedText),
      sample1: productCell('sample1', placeholderImages.tile120Stone, 8, 24, 18),
      sample2: productCell('sample2', placeholderImages.textureGreige, 50, 24, 18),
      sample3: productCell('sample3', placeholderImages.tile120Marble, 8, 56, 18),
      sample4: productCell('sample4', placeholderImages.tile60Stone, 50, 56, 18),
      text1: styled(text('text1', 'Позиция 1', 'Классический камень\n60x120\n20 мм / структурная', 'small', { x: 29, y: 25, w: 18, h: 14 }), style.darkText),
      text2: styled(text('text2', 'Позиция 2', 'Конгломерат\n60x120\n20 мм / структурная', 'small', { x: 71, y: 25, w: 22, h: 14 }), style.darkText),
      text3: styled(text('text3', 'Позиция 3', 'Светлая поверхность\n60x120\n20 мм / структурная', 'small', { x: 29, y: 57, w: 18, h: 14 }), style.darkText),
      text4: styled(text('text4', 'Позиция 4', 'Песчаный бетон\n60x120\n20 мм / структурная', 'small', { x: 71, y: 57, w: 22, h: 14 }), style.darkText),
      note: styled(text('note', 'Примечание', 'Образцы заменяются на фото партии. Формат и толщина правятся в подписи.', 'small', { x: 8, y: 84, w: 70, h: 5 }), style.mutedText)
    }
  ),

  template(
    'catalog_outdoor_sku_mixed',
    'catalog_grid',
    'Outdoor: смешанные форматы',
    'Смешанный лист 60x120 и 120x120 для тонкой линейки 9 мм — внутри дома и на террасе.',
    placeholderImages.previewSampleGrid,
    {
      heading: styled(text('heading', 'Заголовок', 'Форматы 9 мм', 'h1', { x: 7, y: 9.2, w: 42, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Тонкая линейка для внутренних полов и продолжения на террасу там, где не нужен 20 мм.', 'body', { x: 50, y: 9.6, w: 43, h: 8 }), style.mutedText),
      rowLabel1: styled(text('rowLabel1', 'Подпись ряда', '60x120', 'h2', { x: 7, y: 20, w: 20, h: 5 }), style.darkText),
      p1: productCell('p1', placeholderImages.tile120Stone, 8, 26, 14),
      p2: productCell('p2', placeholderImages.tile120Marble, 30, 26, 14),
      p3: productCell('p3', placeholderImages.textureGreige, 52, 26, 14),
      p4: productCell('p4', placeholderImages.tile60Stone, 74, 26, 14),
      l1: styled(text('l1', 'SKU 1', 'Камень светлый\n60x120 / 9 мм', 'small', { x: 8, y: 38, w: 18, h: 7 }), style.darkText),
      l2: styled(text('l2', 'SKU 2', 'Камень тёплый\n60x120 / 9 мм', 'small', { x: 30, y: 38, w: 18, h: 7 }), style.darkText),
      l3: styled(text('l3', 'SKU 3', 'Конгломерат\n60x120 / 9 мм', 'small', { x: 52, y: 38, w: 18, h: 7 }), style.darkText),
      l4: styled(text('l4', 'SKU 4', 'Бетон песочный\n60x120 / 9 мм', 'small', { x: 74, y: 38, w: 18, h: 7 }), style.darkText),
      rowLabel2: styled(text('rowLabel2', 'Подпись ряда', '120x120', 'h2', { x: 7, y: 48, w: 22, h: 5 }), style.darkText),
      p5: productCell('p5', placeholderImages.tile60Marble, 8, 54, 18),
      p6: productCell('p6', placeholderImages.tile60Stone, 36, 54, 18),
      p7: productCell('p7', placeholderImages.textureGreige, 64, 54, 18),
      l5: styled(text('l5', 'SKU 5', 'Светлая поверхность\n120x120 / 9 мм', 'small', { x: 8, y: 70, w: 24, h: 7 }), style.darkText),
      l6: styled(text('l6', 'SKU 6', 'Чистая фактура\n120x120 / 9 мм', 'small', { x: 36, y: 70, w: 24, h: 7 }), style.darkText),
      l7: styled(text('l7', 'SKU 7', 'Южный камень\n120x120 / 9 мм', 'small', { x: 64, y: 70, w: 24, h: 7 }), style.darkText),
      note: styled(text('note', 'Примечание', '9 мм — для внутренних зон и клеевой укладки. Для приподнятого настила используйте лист 20 мм.', 'small', { x: 8, y: 84, w: 78, h: 5 }), style.mutedText)
    }
  ),

  template(
    'catalog_outdoor_sku_planks',
    'catalog_grid',
    'Outdoor: деревянные планки',
    'Горизонтальный ряд планок 20x120: две древесные линейки с подписями оттенков.',
    placeholderImages.previewSampleGrid,
    {
      heading: styled(text('heading', 'Заголовок', 'Деревянные планки 20x120', 'h1', { x: 7, y: 9.2, w: 62, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Две линейки под дерево для террас и зон отдыха.', 'body', { x: 7, y: 17.5, w: 70, h: 5 }), style.mutedText),
      rowLabel1: styled(text('rowLabel1', 'Подпись ряда', 'Outdoor-дуб', 'h2', { x: 7, y: 24, w: 28, h: 5 }), style.darkText),
      plank1: plankSample('plank1', placeholderImages.tileWood, 7, 30, 20, 9),
      plank2: plankSample('plank2', placeholderImages.floatingWood, 29, 30, 20, 9),
      plank3: plankSample('plank3', placeholderImages.tileWood, 51, 30, 20, 9),
      plank4: plankSample('plank4', placeholderImages.catalogInteriorWood, 73, 30, 20, 9),
      t1: styled(text('t1', 'Планка 1', 'Дуб светлый\n20x120 / 20 мм', 'small', { x: 7, y: 40.5, w: 20, h: 7 }), style.darkText),
      t2: styled(text('t2', 'Планка 2', 'Дуб натуральный\n20x120 / 20 мм', 'small', { x: 29, y: 40.5, w: 20, h: 7 }), style.darkText),
      t3: styled(text('t3', 'Планка 3', 'Дуб тёплый\n20x120 / 20 мм', 'small', { x: 51, y: 40.5, w: 20, h: 7 }), style.darkText),
      t4: styled(text('t4', 'Планка 4', 'Дуб графит\n20x120 / 20 мм', 'small', { x: 73, y: 40.5, w: 20, h: 7 }), style.darkText),
      rowLabel2: styled(text('rowLabel2', 'Подпись ряда', 'Древесные планки', 'h2', { x: 7, y: 50, w: 50, h: 5 }), style.darkText),
      plank5: plankSample('plank5', placeholderImages.floatingWood, 7, 56, 26, 10),
      plank6: plankSample('plank6', placeholderImages.tileWood, 36, 56, 26, 10),
      plank7: plankSample('plank7', placeholderImages.catalogInteriorWood, 65, 56, 28, 10),
      t5: styled(text('t5', 'Планка 5', 'Ясень натуральный\n20x120 / 20 мм', 'small', { x: 7, y: 67.5, w: 26, h: 7 }), style.darkText),
      t6: styled(text('t6', 'Планка 6', 'Орех тёплый\n20x120 / 20 мм', 'small', { x: 36, y: 67.5, w: 26, h: 7 }), style.darkText),
      t7: styled(text('t7', 'Планка 7', 'Венге мягкий\n20x120 / 20 мм', 'small', { x: 65, y: 67.5, w: 28, h: 7 }), style.darkText),
      note: styled(text('note', 'Примечание', 'Планки удобно показывать широкими зонами: изображение вписывается целиком и не обрезается.', 'small', { x: 7, y: 84, w: 78, h: 5 }), style.mutedText)
    }
  ),

  template(
    'catalog_outdoor_install_cards',
    'catalog_specs',
    'Outdoor: способы укладки',
    'Четыре карточки систем укладки: газон, клей, регулируемые опоры и гравий.',
    placeholderImages.previewTechnicalIcons,
    {
      heading: styled(text('heading', 'Заголовок', 'Способы укладки', 'h1', { x: 7, y: 9.2, w: 48, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Один материал — четыре основания. Карточки показывают принцип, а не монтажную инструкцию.', 'body', { x: 56, y: 9.6, w: 37, h: 8 }), style.mutedText),
      img1: styled(image('img1', 'Укладка на газон', placeholderImages.catalogInteriorWarm, 'interior', '16:9', { x: 7, y: 21, w: 40, h: 18 }), style.imageShadow),
      img2: styled(image('img2', 'Укладка на клей', placeholderImages.catalogInteriorLiving, 'interior', '16:9', { x: 53, y: 21, w: 40, h: 18 }), style.imageShadow),
      title1: styled(text('title1', 'Название способа', 'На газон или грунт', 'h2', { x: 7, y: 40.5, w: 40, h: 5 }), style.darkText),
      title2: styled(text('title2', 'Название способа', 'На клеевой состав', 'h2', { x: 53, y: 40.5, w: 40, h: 5 }), style.darkText),
      text1: styled(text('text1', 'Описание способа', 'Плиты 20 мм укладываются на подготовленный грунт или газон. Подходит для дорожек и зон с озеленением.', 'small', { x: 7, y: 46, w: 40, h: 9 }), style.mutedText),
      text2: styled(text('text2', 'Описание способа', 'Классический клеевой монтаж на стабильное основание. Даёт цельную плоскость для террас и входных групп.', 'small', { x: 53, y: 46, w: 40, h: 9 }), style.mutedText),
      img3: styled(image('img3', 'Укладка на опоры', placeholderImages.floatingStone, 'interior', '16:9', { x: 7, y: 57, w: 40, h: 16 }), style.imageShadow),
      img4: styled(image('img4', 'Укладка на гравий', placeholderImages.textureGreige, 'interior', '16:9', { x: 53, y: 57, w: 40, h: 16 }), style.imageShadow),
      title3: styled(text('title3', 'Название способа', 'На регулируемые опоры', 'h2', { x: 7, y: 74.5, w: 40, h: 5 }), style.darkText),
      title4: styled(text('title4', 'Название способа', 'На гравийное основание', 'h2', { x: 53, y: 74.5, w: 40, h: 5 }), style.darkText),
      text3: styled(text('text3', 'Описание способа', 'Приподнятый настил скрывает коммуникации и выравнивает перепады. Нужна плита 20 мм.', 'small', { x: 7, y: 80, w: 40, h: 8 }), style.mutedText),
      text4: styled(text('text4', 'Описание способа', 'Дренажное основание из гравия. Плиты лежат свободно, вода уходит в слой, плоскость остаётся ремонтопригодной.', 'small', { x: 53, y: 80, w: 40, h: 8 }), style.mutedText)
    }
  ),

  template(
    'catalog_outdoor_install_guide',
    'catalog_specs',
    'Outdoor: руководство по монтажу',
    'Три колонки: клей, опоры и гравий — с коротким текстом и ключевыми ограничениями.',
    placeholderImages.previewTechnicalIcons,
    {
      heading: styled(text('heading', 'Заголовок', 'Как выбрать систему монтажа', 'h1', { x: 7, y: 9.2, w: 70, h: 7 }), style.darkText),
      intro: styled(text('intro', 'Описание', 'Короткий ориентир для проекта: основание, толщина плиты и что проверить до заказа. Не заменяет проектную документацию.', 'body', { x: 7, y: 17.5, w: 86, h: 8 }), style.mutedText),
      colTitle1: styled(text('colTitle1', 'Название способа', 'Клеевой монтаж', 'h2', { x: 7, y: 28, w: 26, h: 6 }), style.darkText),
      colTitle2: styled(text('colTitle2', 'Название способа', 'Регулируемые опоры', 'h2', { x: 37, y: 28, w: 26, h: 6 }), style.darkText),
      colTitle3: styled(text('colTitle3', 'Название способа', 'Гравий и грунт', 'h2', { x: 67, y: 28, w: 26, h: 6 }), style.darkText),
      colBody1: styled(text('colBody1', 'Описание способа', 'Стабильная стяжка, уклон для воды, клей и затирка по рекомендации производителя. Подходит для 9 мм и 20 мм, если основание рассчитано на выбранный формат.', 'body', { x: 7, y: 36, w: 26, h: 28 }), style.mutedText),
      colBody2: styled(text('colBody2', 'Описание способа', 'Только 20 мм. Опоры выставляют горизонт, под настилом остаётся вентзазор и место для коммуникаций. Край настила закрывают торцевым элементом или профилем.', 'body', { x: 37, y: 36, w: 26, h: 28 }), style.mutedText),
      colBody3: styled(text('colBody3', 'Описание способа', 'Только 20 мм. Гравий или грунт должны быть уплотнены и дренированы. Плиты лежат свободно: плоскость можно разобрать без разрушения основания.', 'body', { x: 67, y: 36, w: 26, h: 28 }), style.mutedText),
      icons: styled(iconRow('icons', 'Ключевые параметры', { x: 7, y: 67, w: 86, h: 11 }, [
        { id: 'guide-thickness', iconId: 'thickness', label: 'Толщина', value: '9 / 20 мм' },
        { id: 'guide-frost', iconId: 'frost', label: 'Мороз', value: 'стойкая' },
        { id: 'guide-slip', iconId: 'abrasion', label: 'Сцепление', value: 'R11' },
        { id: 'guide-zone', iconId: 'floor', label: 'Зона', value: 'улица' }
      ]), style.softPanel),
      note: styled(text('note', 'Примечание', 'Параметры, уклоны и допустимые нагрузки уточняются по артикулу, партии и проекту. Страница задаёт структуру каталога, а не монтажный регламент.', 'small', { x: 7, y: 82, w: 86, h: 7 }), style.mutedText)
    }
  )
];

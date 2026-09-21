import { placeholderImages, catalogRows, rangeRows, priceColumns, productColumns, rangeColumns, packagingColumns, techIcons, style, styled, text, badge, table, iconRow, productCell, template } from './shared';

export const tableTemplates = [
  template('table_collection_technical_sheet', 'table', 'Техлист: коллекция полностью', 'Полноценный технический лист коллекции: форматы, финиш, применение и упаковка.', placeholderImages.previewTechnicalIcons, {
    brandBadge: styled(badge('brandBadge', 'Technical sheet', { x: 8, y: 8, w: 27, h: 4.6 }), style.accentBadge),
    heading: styled(text('heading', 'Заголовок', 'Технический лист коллекции', 'h1', { x: 40, y: 8, w: 45, h: 7 }), style.darkText),
    sample: productCell('sample', placeholderImages.tile120Stone, 8, 24, 18),
    icons: styled(iconRow('icons', 'Иконки', { x: 34, y: 23, w: 58, h: 15 }, [
      ...techIcons,
      { id: 'sheet-rectified', iconId: 'rectified', label: 'Край', value: 'ректиф.' },
      { id: 'sheet-frost', iconId: 'frost', label: 'Мороз', value: 'да' }
    ]), style.softPanel),
    table: styled(table('table', 'Спецификация', rangeColumns, rangeRows, { x: 8, y: 48, w: 84, h: 27 }), style.whitePanel),
    note: styled(text('note', 'Примечание', 'Все технические значения являются демонстрационными и уточняются по партии, складу и производителю.', 'body', { x: 8, y: 83, w: 70, h: 8 }), style.mutedText)
  }),

  template('table_packaging_price_matrix', 'table', 'Техлист: упаковка и цена', 'Упаковка, палеты, склад, цена и поставка в одной таблице.', placeholderImages.previewTechnicalIcons, {
    heading: styled(text('heading', 'Заголовок', 'Упаковка, склад и цена', 'h1', { x: 8, y: 8, w: 50, h: 7 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Плотная таблица для коммерческой части каталога или дилерского прайса.', 'body', { x: 8, y: 19, w: 54, h: 8 }), style.mutedText),
    icons: styled(iconRow('icons', 'Логистика', { x: 8, y: 34, w: 84, h: 13 }, [
      { id: 'pack-box', iconId: 'box', label: 'Коробка', value: '1,44 м2' },
      { id: 'pack-pallet', iconId: 'pallet', label: 'Палета', value: '43,2 м2' },
      { id: 'pack-warehouse', iconId: 'warehouse', label: 'Склад', value: 'уточнить' },
      { id: 'pack-delivery', iconId: 'delivery', label: 'Доставка', value: 'расчет' }
    ]), style.softPanel),
    table: styled(table('table', 'Матрица цены', packagingColumns, catalogRows, { x: 8, y: 57, w: 84, h: 26 }), style.whitePanel),
    note: styled(text('note', 'Примечание', 'Матрицу можно использовать как страницу прайса, КП или технического приложения.', 'small', { x: 8, y: 86.8, w: 65, h: 5 }), style.mutedText)
  }),

  template('table_technical_icons', 'table', 'Техлист: иконки и таблица', 'Техническая страница с иконками формата, финиша, толщины и применения.', placeholderImages.previewTechnicalIcons, {
    brandBadge: styled(badge('brandBadge', 'Характеристики', { x: 8, y: 8, w: 26, h: 4.6 }), style.accentBadge),
    heading: styled(text('heading', 'Заголовок', 'Технические параметры', 'h1', { x: 36, y: 8, w: 42, h: 7 }), style.darkText),
    techIcons: styled(iconRow('techIcons', 'Иконки характеристик', { x: 8, y: 22, w: 84, h: 16 }, [
      ...techIcons,
      { id: 'tech-rectified', iconId: 'rectified', label: 'Край', value: 'ректиф.' },
      { id: 'tech-water', iconId: 'water', label: 'Влажные зоны', value: 'да' }
    ]), style.softPanel),
    table: styled(table('table', 'Спецификация', productColumns, catalogRows.slice(0, 4), { x: 8, y: 46, w: 57, h: 26 }), style.whitePanel),
    slab: productCell('slab', placeholderImages.floatingStone, 73, 47, 15),
    notes: styled(text('notes', 'Примечание', 'Параметры можно уточнить под конкретный объект: партию, остатки, коробки и сроки поставки.', 'body', { x: 8, y: 79, w: 62, h: 10 }), style.mutedText)
  }),

  template('table_surface_usage_icons', 'table', 'Техлист: применение', 'Страница для зон применения, поверхностей, упаковки и логистики.', placeholderImages.previewTechnicalIcons, {
    heading: styled(text('heading', 'Заголовок', 'Где использовать', 'h1', { x: 8, y: 9, w: 40, h: 7 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Короткая техническая выжимка для менеджера, дилера или клиента.', 'body', { x: 8, y: 20, w: 42, h: 8 }), style.mutedText),
    usageIcons: styled(iconRow('usageIcons', 'Применение', { x: 8, y: 34, w: 84, h: 16 }, [
      { id: 'usage-floor', iconId: 'floor', label: 'Пол', value: 'да' },
      { id: 'usage-wall', iconId: 'wall', label: 'Стены', value: 'да' },
      { id: 'usage-bath', iconId: 'bathroom', label: 'Санузел', value: 'да' },
      { id: 'usage-kitchen', iconId: 'kitchen', label: 'Кухня', value: 'да' },
      { id: 'usage-heat', iconId: 'heated-floor', label: 'Теплый пол', value: 'да' }
    ]), style.softPanel),
    packIcons: styled(iconRow('packIcons', 'Логистика', { x: 8, y: 58, w: 84, h: 14 }, [
      { id: 'pack-box', iconId: 'box', label: 'Коробка', value: '1,44 м2' },
      { id: 'pack-pallet', iconId: 'pallet', label: 'Палета', value: '43,2 м2' },
      { id: 'pack-warehouse', iconId: 'warehouse', label: 'Склад', value: 'уточнить' },
      { id: 'pack-delivery', iconId: 'delivery', label: 'Доставка', value: 'по запросу' }
    ]), style.whitePanel),
    note: styled(text('note', 'Примечание', 'Блоки с иконками можно менять под конкретную коллекцию: морозостойкость, истираемость, упаковка, склад.', 'body', { x: 8, y: 81, w: 70, h: 10 }), style.mutedText)
  }),

  template('table_specification_dense', 'table', 'Техлист: плотная спецификация', 'Деловая страница со спецификацией, примечаниями и мини-образцами.', placeholderImages.previewTechnicalIcons, {
    heading: styled(text('heading', 'Заголовок', 'Спецификация поставки', 'h1', { x: 8, y: 8, w: 45, h: 7 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Страница для менеджера: артикулы, форматы, поверхности и базовые параметры.', 'body', { x: 8, y: 19, w: 52, h: 8 }), style.mutedText),
    table: styled(table('table', 'Спецификация', productColumns, catalogRows, { x: 8, y: 34, w: 67, h: 31 }), style.whitePanel),
    sample1: productCell('sample1', placeholderImages.tile60Stone, 79, 34, 12),
    sample2: productCell('sample2', placeholderImages.tile120Marble, 79, 51, 12),
    sample3: productCell('sample3', placeholderImages.tileWood, 79, 68, 12),
    notes: styled(text('notes', 'Примечание', 'Поля можно использовать для остатков, склада, резерва, партии и сроков поставки.', 'body', { x: 8, y: 76, w: 57, h: 10 }), style.mutedText),
    icons: styled(iconRow('icons', 'Иконки', { x: 67, y: 80, w: 25, h: 9 }, [
      { id: 'spec-approved', iconId: 'approved', label: 'Согласовать', value: 'да' }
    ]), style.softPanel)
  }),

  template('table_logistics_packaging', 'table', 'Техлист: упаковка и логистика', 'Страница для упаковки, палет, склада, доставки и сроков.', placeholderImages.previewTechnicalIcons, {
    brandBadge: styled(badge('brandBadge', 'Логистика', { x: 8, y: 8, w: 20, h: 4.6 }), style.accentBadge),
    heading: styled(text('heading', 'Заголовок', 'Упаковка и поставка', 'h1', { x: 35, y: 8, w: 42, h: 7 }), style.darkText),
    packIcons: styled(iconRow('packIcons', 'Иконки упаковки', { x: 8, y: 24, w: 84, h: 16 }, [
      { id: 'log-box', iconId: 'box', label: 'Коробка', value: 'уточнить' },
      { id: 'log-pallet', iconId: 'pallet', label: 'Палета', value: 'по партии' },
      { id: 'log-warehouse', iconId: 'warehouse', label: 'Склад', value: 'наличие' },
      { id: 'log-delivery', iconId: 'delivery', label: 'Доставка', value: 'расчет' },
      { id: 'log-time', iconId: 'lead-time', label: 'Срок', value: 'по запросу' }
    ]), style.softPanel),
    table: styled(table('table', 'Поставочные данные', priceColumns.slice(0, 5), catalogRows.slice(0, 4), { x: 8, y: 50, w: 84, h: 22 }), style.whitePanel),
    note: styled(text('note', 'Примечание', 'Логистический блок помогает сразу отделить цену материала от доставки, резерва и сроков.', 'body', { x: 8, y: 81, w: 70, h: 9 }), style.mutedText)
  })
];

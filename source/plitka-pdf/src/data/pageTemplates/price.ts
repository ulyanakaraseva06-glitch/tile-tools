import { placeholderImages, catalogRows, priceColumns, style, styled, text, badge, image, table, iconRow, template } from './shared';

export const priceTemplates = [
  template('price_visual_quote', 'price', 'КП: визуальный расчет', 'Визуальный блок, расчетная таблица, итоги и бизнес-иконки.', placeholderImages.previewPriceQuote, {
    image: styled(image('image', 'Интерьер 4:3', placeholderImages.catalogInteriorDark, 'interior', '4:3', { x: 8, y: 9, w: 34, h: 24 }), style.imageShadow),
    brandBadge: styled(badge('brandBadge', 'Расчет', { x: 49, y: 9, w: 16, h: 4.6 }), style.accentBadge),
    heading: styled(text('heading', 'Заголовок', 'Коммерческий расчет', 'h1', { x: 49, y: 19, w: 42, h: 7 }), style.darkText),
    summary: styled(text('summary', 'Описание', 'Позиции, количество, актуальная цена и следующий шаг для согласования.', 'body', { x: 49, y: 30, w: 38, h: 10 }), style.mutedText),
    table: styled(table('table', 'Расчетная таблица', priceColumns, catalogRows, { x: 8, y: 48, w: 84, h: 28 }), style.whitePanel),
    totalBlock: styled(text('totalBlock', 'Итог', 'Итого считается автоматически:\nцена x количество', 'body', { x: 56, y: 82, w: 36, h: 10 }), style.darkPanel),
    businessIcons: styled(iconRow('businessIcons', 'Бизнес-иконки', { x: 8, y: 82, w: 41, h: 10 }, [
      { id: 'quote-price', iconId: 'price', label: 'Цена', value: 'актуальна' },
      { id: 'quote-delivery', iconId: 'delivery', label: 'Доставка', value: 'по запросу' },
      { id: 'quote-lead', iconId: 'lead-time', label: 'Срок', value: 'уточнить' }
    ]), style.softPanel)
  }),

  template('price_summary_offer', 'price', 'КП: короткое резюме', 'Страница-резюме с визуальным блоком, суммой и условиями.', placeholderImages.previewPriceQuote, {
    image: styled(image('image', 'Интерьер 16:9', placeholderImages.catalogInteriorLiving, 'interior', '16:9', { x: 8, y: 9, w: 44, h: 26 }), style.imageShadow),
    brandBadge: styled(badge('brandBadge', 'Итог', { x: 61, y: 10, w: 16, h: 4.6 }), style.accentBadge),
    heading: styled(text('heading', 'Заголовок', 'Резюме предложения', 'h1', { x: 57, y: 21, w: 36, h: 12 }), style.darkText),
    summary: styled(text('summary', 'Итог', 'Подборка: 5 позиций\nПлощадь: 147 м2\nДоставка: по запросу', 'body', { x: 61, y: 36, w: 28, h: 11 }), style.darkText),
    table: styled(table('table', 'Расчет', priceColumns, catalogRows.slice(0, 4), { x: 8, y: 52, w: 84, h: 23 }), style.whitePanel),
    next: styled(text('next', 'Следующий шаг', 'Следующий шаг: подтвердить количество, резерв и срок поставки.', 'body', { x: 8, y: 83, w: 53, h: 8 }), style.mutedText),
    icons: styled(iconRow('icons', 'Иконки', { x: 65, y: 81, w: 27, h: 10 }, [
      { id: 'offer-approved', iconId: 'approved', label: 'КП', value: 'готово' }
    ]), style.softPanel)
  }),

  template('price_room_estimate', 'price', 'Прайс: расчет по помещениям', 'Страница для расчета по зонам: санузел, кухня, гостиная или объект.', placeholderImages.previewPriceQuote, {
    heading: styled(text('heading', 'Заголовок', 'Расчет по помещениям', 'h1', { x: 7, y: 8, w: 45, h: 7 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Удобный формат, когда клиенту важно видеть не только SKU, но и зоны применения.', 'body', { x: 7, y: 19, w: 58, h: 8 }), style.mutedText),
    icons: styled(iconRow('icons', 'Помещения', { x: 8, y: 34, w: 84, h: 13 }, [
      { id: 'room-bath', iconId: 'bathroom', label: 'Санузел', value: '28 м2' },
      { id: 'room-kitchen', iconId: 'kitchen', label: 'Кухня', value: '34 м2' },
      { id: 'room-floor', iconId: 'floor', label: 'Общий пол', value: '85 м2' }
    ]), style.softPanel),
    table: styled(table('table', 'Расчет', priceColumns, catalogRows.slice(0, 4), { x: 8, y: 57, w: 84, h: 25 }), style.whitePanel),
    note: styled(text('note', 'Примечание', 'Формат подходит для КП по объекту: легко заменить помещения на зоны или этапы поставки.', 'small', { x: 8, y: 86.2, w: 62, h: 5.4 }), style.mutedText)
  })
];

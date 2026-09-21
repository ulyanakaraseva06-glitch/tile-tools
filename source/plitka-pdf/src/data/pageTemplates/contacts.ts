import { placeholderImages, style, styled, text, badge, image, logo, features, iconRow, template } from './shared';

export const contactsTemplates = [
  template('contacts_next_step', 'contacts', 'Контакты: следующий шаг', 'Финальная страница с контактами, логотипом и аккуратным next step.', placeholderImages.previewContacts, {
    logo: logo({ x: 82, y: 2.0, w: 11, h: 5.2 }),
    image: styled(image('image', 'Финальный интерьер', placeholderImages.catalogInteriorWarm, 'interior', '9:16', { x: 61, y: 20, w: 28, h: 40 }), style.imageShadow),
    brandBadge: styled(badge('brandBadge', 'Следующий шаг', { x: 8, y: 9, w: 24, h: 4.6 }), style.accentBadge),
    heading: styled(text('heading', 'Заголовок', 'Согласовать\nподборку', 'hero', { x: 8, y: 21, w: 46, h: 13 }), style.darkText),
    nextStep: styled(text('nextStep', 'Следующий шаг', 'Запросите финальный расчет, наличие и условия доставки у менеджера.', 'body', { x: 8, y: 43, w: 42, h: 11 }), style.mutedText),
    companyName: styled(text('companyName', 'Компания', 'Vilray Studio', 'h2', { x: 8, y: 61, w: 32, h: 6 }), style.darkText),
    contactIcons: styled(iconRow('contactIcons', 'Контактные иконки', { x: 8, y: 72, w: 47, h: 10 }, [
      { id: 'next-phone', iconId: 'phone', label: 'Телефон', value: '+7 (000) 000-00-00' },
      { id: 'next-email', iconId: 'email', label: 'Email', value: 'info@vilraystudio.ru' }
    ]), style.softPanel),
    website: styled(text('website', 'Сайт', 'plitka-pdf.ru', 'body', { x: 8, y: 87, w: 28, h: 5 }), style.darkText)
  }),

  template('contacts_manager_card', 'contacts', 'Контакты: карточка менеджера', 'Финальная страница для персонального контакта, сайта и адреса.', placeholderImages.previewContacts, {
    logo: logo({ x: 82, y: 2.0, w: 11, h: 5.2 }),
    heading: styled(text('heading', 'Заголовок', 'Ваш менеджер\nпо проекту', 'hero', { x: 8, y: 13, w: 46, h: 13 }), style.darkText),
    managerName: styled(text('managerName', 'Менеджер', 'Менеджер проекта', 'h2', { x: 8, y: 35, w: 36, h: 6 }), style.darkText),
    contactIcons: styled(iconRow('contactIcons', 'Контакты', { x: 8, y: 48, w: 48, h: 13 }, [
      { id: 'manager-phone', iconId: 'phone', label: 'Телефон', value: '+7 (000) 000-00-00' },
      { id: 'manager-email', iconId: 'email', label: 'Email', value: 'info@vilraystudio.ru' }
    ]), style.softPanel),
    address: styled(text('address', 'Адрес', 'Шоурум / склад / город\nусловия поставки уточняются отдельно', 'body', { x: 8, y: 69, w: 46, h: 10 }), style.mutedText),
    image: styled(image('image', 'Интерьер 3:4', placeholderImages.catalogInteriorMarble, 'interior', '3:4', { x: 62, y: 22, w: 27, h: 40 }), style.imageShadow),
    finalNote: styled(text('finalNote', 'Подпись', 'Поможем выбрать материал, заказать образцы и согласовать доставку.', 'small', { x: 62, y: 71, w: 28, h: 8 }), style.mutedText)
  }),

  template('contacts_qr_placeholder', 'contacts', 'Контакты: QR и реквизиты', 'Финальная страница с зоной под QR, контактами, сайтом и короткой подписью.', placeholderImages.previewContacts, {
    logo: logo({ x: 82, y: 2.0, w: 11, h: 5.2 }),
    heading: styled(text('heading', 'Заголовок', 'Связаться\nи согласовать', 'hero', { x: 8, y: 14, w: 43, h: 13 }), style.darkText),
    intro: styled(text('intro', 'Описание', 'Здесь можно разместить QR-код, ссылку на сайт, контакты менеджера или адрес шоурума.', 'body', { x: 8, y: 35, w: 45, h: 10 }), style.mutedText),
    qrBox: styled(features('qrBox', 'Зона QR', ['QR', 'сайт', 'контакт', 'карта'], { x: 62, y: 24, w: 25, h: 25 }), style.whitePanel),
    contactIcons: styled(iconRow('contactIcons', 'Контакты', { x: 8, y: 57, w: 48, h: 13 }, [
      { id: 'qr-phone', iconId: 'phone', label: 'Телефон', value: '+7 (000) 000-00-00' },
      { id: 'qr-email', iconId: 'email', label: 'Email', value: 'info@vilraystudio.ru' }
    ]), style.softPanel),
    address: styled(text('address', 'Адрес', 'Шоурум / склад / город\nусловия поставки уточняются отдельно', 'body', { x: 8, y: 78, w: 48, h: 10 }), style.mutedText),
    finalImage: styled(image('finalImage', 'Интерьер 3:4', placeholderImages.catalogInteriorWarm, 'interior', '3:4', { x: 64, y: 61, w: 25, h: 29 }), style.imageShadow)
  })
];

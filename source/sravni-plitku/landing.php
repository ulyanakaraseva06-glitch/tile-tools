<?php
/* ================================================================
   landing.php — публичный лендинг «Сравни плитку» (редизайн в стиле
   сервисных лендингов Vilray Studio). Открыт без авторизации.
   Гость -> регистрация/вход; вошедший -> сервис/кабинет.
   Стили в landing.css, лёгкая интерактивность в landing.js.
   Визуализатор (index.html/betavis.js/stylevis.css) НЕ затрагивается.
================================================================ */
require_once __DIR__ . '/auth/functions.php';
app_session_start();
$me = current_user();

$REG   = 'auth/register.php';   // получить доступ / попробовать / заявка
$LOGIN = 'auth/login.php';      // войти
$APP   = 'index.php';           // перейти в сервис (для вошедших)
$CAB   = 'auth/cabinet.php';    // личный кабинет
$STUDIO = 'https://vilraystudio.ru'; // сайт студии (контакты/услуги)

// Главный CTA доступа и вторичный «войти» — зависят от авторизации
$accessUrl   = $me ? $APP   : $REG;
$accessLabel = $me ? 'Перейти в сервис' : 'Попробовать сервис';
$loginUrl    = $me ? $CAB   : $LOGIN;
$loginLabel  = $me ? 'Личный кабинет' : 'Войти';

/* ---------- inline SVG line-иконки (stroke=currentColor) ---------- */
function lp_icon($name) {
    $o = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">';
    $c = '</svg>';
    switch ($name) {
        case 'grid':     return $o.'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'.$c;
        case 'refresh':  return $o.'<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>'.$c;
        case 'layers':   return $o.'<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="M3 14l9 5 9-5"/>'.$c;
        case 'image':    return $o.'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5L5 21"/>'.$c;
        case 'store':    return $o.'<path d="M4 7h16l-1 4a3 3 0 0 1-6 0 3 3 0 0 1-6 0L4 7z"/><path d="M5 11v8h14v-8"/><path d="M4 7l2-3h12l2 3"/>'.$c;
        case 'shop':     return $o.'<path d="M6 2 3 6v2a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V6l-3-4z"/><path d="M5 12v8h14v-8"/>'.$c;
        case 'factory':  return $o.'<path d="M3 21V9l6 4V9l6 4V5l6 4v12z"/><path d="M3 21h18"/>'.$c;
        case 'design':   return $o.'<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>'.$c;
        case 'room':     return $o.'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'.$c;
        case 'cursor':   return $o.'<path d="M5 3l15 6.5-6 2.2L11.8 18z"/>'.$c;
        case 'tile':     return $o.'<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>'.$c;
        case 'compare':  return $o.'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>'.$c;
        case 'download': return $o.'<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>'.$c;
        case 'alert':    return $o.'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'.$c;
        case 'gift':     return $o.'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9"/><path d="M12 8v13"/><path d="M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5h4z"/><path d="M12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5h-4z"/>'.$c;
        case 'check':    return $o.'<path d="M20 6 9 17l-5-5"/>'.$c;
        case 'x':        return $o.'<path d="M18 6 6 18"/><path d="M6 6l12 12"/>'.$c;
        case 'drop':     return $o.'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'.$c;
        case 'sun':      return $o.'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'.$c;
        case 'sliders':  return $o.'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'.$c;
        case 'heart':    return $o.'<path d="M19 14c1.5-1.5 3-3.3 3-5.5A4.5 4.5 0 0 0 12 5 4.5 4.5 0 0 0 2 8.5C2 10.7 3.5 12.5 5 14l7 7z"/>'.$c;
        case 'search':   return $o.'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'.$c;
        case 'user':     return $o.'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'.$c;
        case 'arrow':    return $o.'<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>'.$c;
        case 'mail':     return $o.'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'.$c;
        case 'send':     return $o.'<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'.$c;
        case 'spark':    return $o.'<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>'.$c;
        default:         return $o.'<circle cx="12" cy="12" r="9"/>'.$c;
    }
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>СравниПлитку — сравнение плитки в одном интерьере · сервис Vilray Studio</title>
<meta name="description" content="B2B-сервис для магазинов, дилеров и производителей плитки. Показывайте разные коллекции в одной интерьерной сцене, выбирайте зоны и скачивайте готовое изображение для клиента в JPG.">
<meta property="og:title" content="СравниПлитку — сравнение плитки в одном интерьере">
<meta property="og:description" content="Покажите клиенту разные варианты плитки в одной интерьерной сцене и скачайте готовый JPG. Без 3D-моделирования, прямо в браузере.">
<meta property="og:type" content="website">
<meta name="theme-color" content="#1E1E1E">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="landing.css">
</head>
<body class="lp-root">

<!-- ===== HEADER ===== -->
<header class="lp-header">
  <div class="lp-wrap lp-header__in">
    <a class="lp-logo" href="#top">
      <span class="lp-logo__mark"><?= lp_icon('compare') ?></span>
      <span class="lp-logo__txt">
        <strong>СравниПлитку</strong>
        <em>от Vilray Studio</em>
      </span>
    </a>
    <nav class="lp-nav" id="lpNav">
      <a href="#features">Возможности</a>
      <a href="#how">Как работает</a>
      <a href="#video">Видео</a>
      <a href="#pricing">Тарифы</a>
      <a href="#manufacturers">Производителям</a>
      <a href="#faq">FAQ</a>
      <a class="lp-nav__cta lp-nav__cta--primary" href="<?= $accessUrl ?>" data-event="click_register_burger"><?= $accessLabel ?></a>
      <a class="lp-nav__cta" href="<?= $loginUrl ?>" data-event="click_login_burger"><?= $loginLabel ?></a>
    </nav>
    <div class="lp-header__actions">
      <a class="lp-btn lp-btn--ghost lp-btn--sm" href="<?= $loginUrl ?>" data-event="click_login_header"><?= $loginLabel ?></a>
      <a class="lp-btn lp-btn--primary lp-btn--sm" href="<?= $accessUrl ?>" data-event="click_register_header"><?= $accessLabel ?> <?= lp_icon('arrow') ?></a>
      <button class="lp-burger" id="lpBurger" aria-label="Меню"><span></span></button>
    </div>
  </div>
</header>

<a id="top"></a>

<!-- ===== HERO ===== -->
<section class="lp-hero">
  <div class="lp-hero__glow" aria-hidden="true"></div>
  <div class="lp-wrap lp-hero__in">
    <div class="lp-hero__content">
      <span class="lp-eyebrow">B2B-сервис для магазинов, дилеров и производителей плитки</span>
      <h1 class="lp-hero__title">Сравнивайте плитку<br>в одном интерьере</h1>
      <p class="lp-hero__text">Сервис показывает разные коллекции плитки в одинаковой интерьерной сцене. Пользователь выбирает зону, применяет плитку из каталога и скачивает готовое изображение для клиента.</p>
      <div class="lp-hero__actions">
        <a class="lp-btn lp-btn--primary lp-btn--lg" href="<?= $accessUrl ?>" data-event="click_register_hero"><?= $accessLabel ?> <?= lp_icon('arrow') ?></a>
        <a class="lp-btn lp-btn--ghost-light lp-btn--lg" href="#video" data-event="click_watch_video_hero">Смотреть демонстрацию</a>
      </div>
      <ul class="lp-hero__facts">
        <li><?= lp_icon('check') ?> Работает в браузере</li>
        <li><?= lp_icon('check') ?> Готовые интерьерные сцены</li>
        <li><?= lp_icon('check') ?> Выбор зон по размеченным маскам</li>
        <li><?= lp_icon('check') ?> Экспорт результата в JPG</li>
      </ul>
    </div>

    <div class="lp-hero__visual">
      <!-- UI-мокап сервиса (статичная вёрстка, без логики визуализатора) -->
      <div class="lp-mockup" aria-hidden="true">
        <div class="lp-mockup__bar">
          <span class="lp-mockup__dot"></span><span class="lp-mockup__dot"></span><span class="lp-mockup__dot"></span>
          <span class="lp-mockup__url">vis.vilraystudio.ru</span>
        </div>
        <div class="lp-mockup__body">
          <div class="lp-mockup__toolbar">
            <span class="lp-mockup__chip"><?= lp_icon('sun') ?> Освещение</span>
            <span class="lp-mockup__chip"><?= lp_icon('sliders') ?> Экспозиция</span>
            <span class="lp-mockup__chip lp-mockup__chip--accent"><?= lp_icon('download') ?> Скачать JPG</span>
          </div>
          <div class="lp-mockup__stage">
            <div class="lp-scene">
              <div class="lp-scene__wall"></div>
              <div class="lp-scene__floor"></div>
              <div class="lp-scene__zone"><span>Зона</span></div>
              <div class="lp-scene__window"></div>
            </div>
            <div class="lp-catalog">
              <div class="lp-catalog__search"><?= lp_icon('search') ?><span></span></div>
              <div class="lp-catalog__grid">
                <span class="lp-swatch lp-swatch--1 is-active"></span>
                <span class="lp-swatch lp-swatch--2"></span>
                <span class="lp-swatch lp-swatch--3"></span>
                <span class="lp-swatch lp-swatch--4"></span>
                <span class="lp-swatch lp-swatch--5"></span>
                <span class="lp-swatch lp-swatch--6"></span>
              </div>
            </div>
          </div>
          <div class="lp-mockup__rooms">
            <span class="lp-room is-active"></span>
            <span class="lp-room"></span>
            <span class="lp-room"></span>
            <span class="lp-room"></span>
            <span class="lp-room"></span>
          </div>
        </div>
      </div>
      <div class="lp-float lp-float--1"><?= lp_icon('cursor') ?> Зона выбрана</div>
      <div class="lp-float lp-float--2"><?= lp_icon('tile') ?> Плитка применена</div>
      <div class="lp-float lp-float--3"><?= lp_icon('sun') ?> Свет настроен</div>
      <div class="lp-float lp-float--4"><?= lp_icon('check') ?> JPG готов</div>
    </div>
  </div>
</section>

<!-- ===== ПРОБЛЕМА И РЕШЕНИЕ ===== -->
<section class="lp-section" id="benefits">
  <div class="lp-wrap">
    <div class="lp-head">
      <span class="lp-tag">Проблема и решение</span>
      <h2 class="lp-h2">Плитку сложно сравнивать по разным фотографиям</h2>
      <p class="lp-sub">На сайтах производителей и поставщиков изображения отличаются по свету, ракурсу и качеству. Клиент смотрит не только на плитку, но и на разницу между картинками.</p>
    </div>
    <div class="lp-compare">
      <article class="lp-compare__card lp-compare__card--old">
        <span class="lp-compare__label"><?= lp_icon('alert') ?> Обычный подбор</span>
        <p>Менеджер показывает фото из каталогов, сайтов и переписок. У каждой картинки свой интерьер, освещение и масштаб — сравнение получается неточным.</p>
        <ul class="lp-checklist lp-checklist--cross">
          <li><?= lp_icon('x') ?> Разные фото и ракурсы</li>
          <li><?= lp_icon('x') ?> Разный свет и масштаб</li>
          <li><?= lp_icon('x') ?> Сравнение зависит от качества картинки</li>
          <li><?= lp_icon('x') ?> Менеджер объясняет словами</li>
        </ul>
      </article>
      <div class="lp-compare__arrow"><?= lp_icon('arrow') ?></div>
      <article class="lp-compare__card lp-compare__card--new">
        <span class="lp-compare__label lp-compare__label--accent"><?= lp_icon('compare') ?> Подбор через СравниПлитку</span>
        <p>Плитки применяются к одной интерьерной сцене. Клиент видит варианты в одинаковых условиях, а менеджер получает изображение, которое можно отправить после консультации.</p>
        <ul class="lp-checklist">
          <li><?= lp_icon('check') ?> Один интерьер для всех вариантов</li>
          <li><?= lp_icon('check') ?> Одинаковые свет и ракурс</li>
          <li><?= lp_icon('check') ?> Понятный визуальный результат</li>
          <li><?= lp_icon('check') ?> Готовый JPG для клиента</li>
        </ul>
      </article>
    </div>
  </div>
</section>

<!-- ===== СЦЕНАРИИ ИСПОЛЬЗОВАНИЯ ===== -->
<section class="lp-section lp-section--soft" id="use-cases">
  <div class="lp-wrap">
    <div class="lp-head">
      <span class="lp-tag">Сценарии</span>
      <h2 class="lp-h2">Где сервис помогает продавать и подбирать плитку</h2>
    </div>
    <div class="lp-grid lp-grid--3">
      <article class="lp-card">
        <span class="lp-ico"><?= lp_icon('shop') ?></span>
        <h3>Шоурум плитки</h3>
        <p>Менеджер показывает клиенту варианты прямо во время консультации. Один интерьер помогает сравнить цвет, формат и сочетание поверхностей.</p>
      </article>
      <article class="lp-card">
        <span class="lp-ico"><?= lp_icon('store') ?></span>
        <h3>Онлайн-продажи</h3>
        <p>Клиент получает не только карточку товара, но и изображение плитки в интерьерной сцене — без отдельной 3D-визуализации.</p>
      </article>
      <article class="lp-card">
        <span class="lp-ico"><?= lp_icon('factory') ?></span>
        <h3>Производитель плитки</h3>
        <p>Коллекции можно показывать в готовых сценах и использовать в презентациях, на сайте, в рассылках и материалах для дилеров.</p>
      </article>
      <article class="lp-card">
        <span class="lp-ico"><?= lp_icon('grid') ?></span>
        <h3>Дилерская сеть</h3>
        <p>Один инструмент помогает разным точкам продаж демонстрировать коллекции в едином визуальном формате.</p>
      </article>
      <article class="lp-card">
        <span class="lp-ico"><?= lp_icon('design') ?></span>
        <h3>Дизайнер или менеджер проекта</h3>
        <p>Сервис помогает быстро собрать несколько вариантов для обсуждения с клиентом и сохранить результат в JPG.</p>
      </article>
      <article class="lp-card lp-card--cta">
        <h3>Подходит вашему сценарию?</h3>
        <p>Откройте сервис и проверьте на своих коллекциях.</p>
        <a class="lp-btn lp-btn--primary lp-btn--sm" href="<?= $accessUrl ?>"><?= $accessLabel ?> <?= lp_icon('arrow') ?></a>
      </article>
    </div>
  </div>
</section>

<!-- ===== ДЕМОНСТРАЦИЯ (видео) ===== -->
<section class="lp-section" id="video">
  <div class="lp-wrap">
    <div class="lp-head">
      <span class="lp-tag">Демонстрация</span>
      <h2 class="lp-h2">Посмотрите, как работает сервис</h2>
      <p class="lp-sub">Короткая демонстрация показывает путь от выбора интерьера до скачивания итогового изображения.</p>
    </div>
    <div class="lp-video-shell">
      <!-- data-embed пуст: landing.js покажет аккуратное уведомление и не делает фейковый плеер.
           Когда появится ролик — впишите YouTube-embed URL в data-embed. -->
      <div class="lp-video" id="lpVideo" data-embed="">
        <div class="lp-video__preview">
          <div class="lp-scene lp-scene--lg">
            <div class="lp-scene__wall"></div>
            <div class="lp-scene__floor"></div>
            <div class="lp-scene__zone"><span>Зона</span></div>
            <div class="lp-scene__window"></div>
          </div>
        </div>
        <span class="lp-video__cap">Демонстрация сервиса</span>
      </div>
      <div class="lp-video-steps">
        <div class="lp-vstep"><b>01</b> Выбор сцены</div>
        <div class="lp-vstep"><b>02</b> Выбор зоны</div>
        <div class="lp-vstep"><b>03</b> Применение плитки</div>
        <div class="lp-vstep"><b>04</b> Скачивание JPG</div>
      </div>
    </div>
  </div>
</section>

<!-- ===== ЧТО ПОЛУЧАЕТ ПОЛЬЗОВАТЕЛЬ ===== -->
<section class="lp-section lp-section--soft">
  <div class="lp-wrap">
    <div class="lp-head">
      <span class="lp-tag">Результат</span>
      <h2 class="lp-h2">Результат, который можно использовать в работе с клиентом</h2>
    </div>
    <div class="lp-grid lp-grid--4">
      <article class="lp-card lp-card--result">
        <span class="lp-ico"><?= lp_icon('image') ?></span>
        <h3>Интерьер с выбранной плиткой</h3>
        <p>Изображение показывает, как коллекция выглядит на стене, полу или другой зоне сцены.</p>
      </article>
      <article class="lp-card lp-card--result">
        <span class="lp-ico"><?= lp_icon('compare') ?></span>
        <h3>Сравнение вариантов</h3>
        <p>Разные плитки можно проверить в одной сцене — без смены ракурса и освещения.</p>
      </article>
      <article class="lp-card lp-card--result">
        <span class="lp-ico"><?= lp_icon('send') ?></span>
        <h3>Материал для консультации</h3>
        <p>Готовый JPG можно отправить клиенту, приложить к подборке или использовать в переписке.</p>
      </article>
      <article class="lp-card lp-card--result">
        <span class="lp-ico"><?= lp_icon('cursor') ?></span>
        <h3>Аргумент для выбора</h3>
        <p>Менеджер показывает не отдельный образец, а результат в интерьерном контексте.</p>
      </article>
    </div>
  </div>
</section>

<!-- ===== КАК ЭТО РАБОТАЕТ ===== -->
<section class="lp-section" id="how">
  <div class="lp-wrap">
    <div class="lp-head">
      <span class="lp-tag">Как это работает</span>
      <h2 class="lp-h2">От интерьера до JPG за несколько действий</h2>
    </div>
    <div class="lp-workflow">
      <div class="lp-wstep">
        <span class="lp-wstep__num">1</span><span class="lp-wstep__ico"><?= lp_icon('room') ?></span>
        <h3>Выберите сцену</h3>
        <p>Готовые интерьерные ракурсы: ванные, зал, кухня-гостиная и другие сцены.</p>
      </div>
      <div class="lp-wstep">
        <span class="lp-wstep__num">2</span><span class="lp-wstep__ico"><?= lp_icon('cursor') ?></span>
        <h3>Укажите зону</h3>
        <p>Кликните по стене, полу или другой поверхности — зона станет активной.</p>
      </div>
      <div class="lp-wstep">
        <span class="lp-wstep__num">3</span><span class="lp-wstep__ico"><?= lp_icon('tile') ?></span>
        <h3>Примените плитку</h3>
        <p>Откройте каталог, используйте поиск и фильтры, выберите нужную плитку.</p>
      </div>
      <div class="lp-wstep">
        <span class="lp-wstep__num">4</span><span class="lp-wstep__ico"><?= lp_icon('sun') ?></span>
        <h3>Настройте свет</h3>
        <p>Освещение и экспозицию можно изменить перед сохранением результата.</p>
      </div>
      <div class="lp-wstep">
        <span class="lp-wstep__num">5</span><span class="lp-wstep__ico"><?= lp_icon('download') ?></span>
        <h3>Скачайте JPG</h3>
        <p>Сервис собирает сцену и сохраняет итоговое изображение.</p>
      </div>
    </div>
  </div>
</section>

<!-- ===== ЧТО ВНУТРИ СЕРВИСА ===== -->
<section class="lp-section lp-section--soft" id="features">
  <div class="lp-wrap">
    <div class="lp-head">
      <span class="lp-tag">Возможности</span>
      <h2 class="lp-h2">Функции, которые нужны для подбора плитки</h2>
    </div>
    <div class="lp-feature-grid">
      <article class="lp-feature"><span class="lp-ico lp-ico--sm"><?= lp_icon('room') ?></span><h3>Готовые сцены</h3><p>Интерьерные рендеры с размеченными зонами.</p></article>
      <article class="lp-feature"><span class="lp-ico lp-ico--sm"><?= lp_icon('cursor') ?></span><h3>Кликабельные зоны</h3><p>Выбор поверхности для применения материала.</p></article>
      <article class="lp-feature"><span class="lp-ico lp-ico--sm"><?= lp_icon('grid') ?></span><h3>Каталог плитки</h3><p>Карточки плитки с параметрами и изображениями.</p></article>
      <article class="lp-feature"><span class="lp-ico lp-ico--sm"><?= lp_icon('search') ?></span><h3>Поиск и фильтры</h3><p>Подбор по цвету, размеру, поверхности и дизайну.</p></article>
      <article class="lp-feature"><span class="lp-ico lp-ico--sm"><?= lp_icon('sun') ?></span><h3>Освещение</h3><p>Тёплый или холодный свет сцены.</p></article>
      <article class="lp-feature"><span class="lp-ico lp-ico--sm"><?= lp_icon('sliders') ?></span><h3>Экспозиция</h3><p>Ярче или темнее перед экспортом.</p></article>
      <article class="lp-feature"><span class="lp-ico lp-ico--sm"><?= lp_icon('heart') ?></span><h3>Избранное</h3><p>Сохранение вариантов, к которым нужно вернуться.</p></article>
      <article class="lp-feature"><span class="lp-ico lp-ico--sm"><?= lp_icon('download') ?></span><h3>Экспорт JPG</h3><p>Итоговое изображение для клиента или менеджера.</p></article>
      <article class="lp-feature"><span class="lp-ico lp-ico--sm"><?= lp_icon('user') ?></span><h3>Личный кабинет</h3><p>Доступ после регистрации и работа с аккаунтом.</p></article>
      <article class="lp-feature"><span class="lp-ico lp-ico--sm"><?= lp_icon('refresh') ?></span><h3>Месячный лимит</h3><p>Лимит скачиваний в рамках аккаунта.</p></article>
    </div>
  </div>
</section>

<!-- ===== ПОЧЕМУ ЛУЧШЕ СТАРОГО СПОСОБА ===== -->
<section class="lp-section">
  <div class="lp-wrap">
    <div class="lp-head">
      <span class="lp-tag">Сравнение</span>
      <h2 class="lp-h2">Один интерьер вместо набора разрозненных картинок</h2>
    </div>
    <div class="lp-vs">
      <div class="lp-vs__col lp-vs__col--old">
        <span class="lp-vs__label">Старый способ</span>
        <ul class="lp-checklist lp-checklist--cross">
          <li><?= lp_icon('x') ?> Разные фотографии</li>
          <li><?= lp_icon('x') ?> Разные условия съёмки</li>
          <li><?= lp_icon('x') ?> Сравнение зависит от исходников</li>
          <li><?= lp_icon('x') ?> Менеджер объясняет словами</li>
        </ul>
      </div>
      <div class="lp-vs__col lp-vs__col--new">
        <span class="lp-vs__label lp-vs__label--accent">СравниПлитку</span>
        <ul class="lp-checklist">
          <li><?= lp_icon('check') ?> Одна сцена</li>
          <li><?= lp_icon('check') ?> Одинаковый свет</li>
          <li><?= lp_icon('check') ?> Понятный визуальный результат</li>
          <li><?= lp_icon('check') ?> Скачиваемое изображение для клиента</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- ===== ТАРИФЫ ===== -->
<section class="lp-section lp-section--soft" id="pricing">
  <div class="lp-wrap">
    <div class="lp-head">
      <span class="lp-tag">Доступ</span>
      <h2 class="lp-h2">Начните с тестового доступа</h2>
      <p class="lp-sub">Доступ к визуализатору открывается после регистрации. У аккаунта есть месячный лимит скачиваний. Условия подписки и корпоративного доступа уточняются отдельно.</p>
    </div>
    <div class="lp-pricing">
      <article class="lp-price">
        <h3>Тестовый доступ</h3>
        <p>Проверьте сценарий работы: откройте сцены, примените плитку и оцените результат.</p>
        <a class="lp-btn lp-btn--dark lp-btn--block" href="<?= $REG ?>" data-event="click_price_trial">Зарегистрироваться</a>
      </article>
      <article class="lp-price lp-price--feature">
        <span class="lp-price__badge">Для команды</span>
        <h3>Доступ для команды</h3>
        <p>Для магазинов, дилеров и отделов продаж с регулярным подбором плитки для клиентов.</p>
        <a class="lp-btn lp-btn--primary lp-btn--block" href="<?= $STUDIO ?>" target="_blank" rel="noopener" data-event="click_price_team">Запросить условия</a>
      </article>
      <article class="lp-price">
        <h3>Производителям</h3>
        <p>Для брендов, которые хотят показать свои коллекции в готовых интерьерных сценах.</p>
        <a class="lp-btn lp-btn--dark lp-btn--block" href="#manufacturers" data-event="click_price_manuf">Обсудить размещение</a>
      </article>
    </div>
  </div>
</section>

<!-- ===== ПРОИЗВОДИТЕЛЯМ ===== -->
<section class="lp-section lp-section--dark" id="manufacturers">
  <div class="lp-wrap lp-manuf">
    <div class="lp-manuf__content">
      <span class="lp-tag lp-tag--light">Производителям плитки</span>
      <h2 class="lp-h2 lp-h2--light">Показывайте коллекции в готовых интерьерных сценах</h2>
      <p class="lp-sub lp-sub--light">Производитель может использовать сервис как демонстрационный инструмент для сайта, презентаций, дилеров и менеджеров. Коллекции показываются не как отдельные образцы, а как варианты применения в интерьере.</p>
      <ul class="lp-checklist lp-checklist--light">
        <li><?= lp_icon('check') ?> Размещение коллекций в каталоге</li>
        <li><?= lp_icon('check') ?> Демонстрация новинок в готовых сценах</li>
        <li><?= lp_icon('check') ?> Материалы для дилерской сети</li>
        <li><?= lp_icon('check') ?> Возможность обсудить брендированную версию</li>
      </ul>
      <a class="lp-btn lp-btn--primary lp-btn--lg" href="<?= $STUDIO ?>" target="_blank" rel="noopener" data-event="click_manuf_cta">Запросить условия для производителя <?= lp_icon('arrow') ?></a>
    </div>
    <div class="lp-manuf__visual" aria-hidden="true">
      <div class="lp-collection">
        <div class="lp-collection__head"><?= lp_icon('layers') ?> Каталог коллекций</div>
        <div class="lp-collection__grid">
          <span class="lp-swatch lp-swatch--1"></span><span class="lp-swatch lp-swatch--3"></span>
          <span class="lp-swatch lp-swatch--5"></span><span class="lp-swatch lp-swatch--2"></span>
          <span class="lp-swatch lp-swatch--6"></span><span class="lp-swatch lp-swatch--4"></span>
        </div>
        <div class="lp-collection__tag">Ваш бренд</div>
      </div>
    </div>
  </div>
</section>

<!-- ===== СОЗДАНО VILRAY STUDIO ===== -->
<section class="lp-section" id="studio">
  <div class="lp-wrap lp-studio">
    <div class="lp-studio__visual" aria-hidden="true">
      <div class="lp-studio__logo"><img src="images/logo-vilray.svg" alt="Vilray Studio"></div>
      <div class="lp-studio__stats">
        <div><b>3D</b><span>визуализация</span></div>
        <div><b>Web</b><span>сайты и сервисы</span></div>
        <div><b>UI</b><span>digital-инструменты</span></div>
      </div>
    </div>
    <div class="lp-studio__content">
      <span class="lp-tag">Кто создал сервис</span>
      <h2 class="lp-h2">Сервис создан студией, которая работает с визуальной продажей материалов</h2>
      <p class="lp-sub">Vilray Studio создаёт визуально-цифровые решения для компаний в сфере дома, ремонта, строительства, отделочных материалов и недвижимости: 3D-визуализация, сайты, презентации, каталоги и интерактивные инструменты для продаж.</p>
      <p class="lp-sub">«СравниПлитку» появился из практической задачи — дать продавцам и производителям инструмент, который показывает плитку в понятном интерьерном контексте.</p>
      <ul class="lp-pillars">
        <li><?= lp_icon('check') ?> Понимание рынка отделочных материалов</li>
        <li><?= lp_icon('check') ?> Опыт визуализации интерьерных продуктов</li>
        <li><?= lp_icon('check') ?> Разработка сайтов и интерактивных сервисов</li>
        <li><?= lp_icon('check') ?> Проектный подход к внедрению</li>
      </ul>
    </div>
  </div>
</section>

<!-- ===== CROSS-SELL ===== -->
<section class="lp-section lp-section--soft">
  <div class="lp-wrap lp-cross">
    <div class="lp-cross__text">
      <h2 class="lp-h2">Vilray Studio может подготовить материалы вокруг сервиса</h2>
      <p class="lp-sub">Если нужен не только доступ к сервису, студия поможет с визуализациями, сайтом, каталогом, презентацией или кастомным visual-инструментом под конкретный процесс продаж.</p>
    </div>
    <div class="lp-cross__items">
      <span><?= lp_icon('image') ?> Интерьерные и предметные визуализации</span>
      <span><?= lp_icon('grid') ?> Сайты и лендинги</span>
      <span><?= lp_icon('layers') ?> Каталоги и презентации</span>
      <span><?= lp_icon('spark') ?> Кастомные визуализаторы</span>
    </div>
    <a class="lp-btn lp-btn--dark lp-btn--lg" href="<?= $STUDIO ?>" target="_blank" rel="noopener" data-event="click_studio_services">Посмотреть услуги Vilray Studio <?= lp_icon('arrow') ?></a>
  </div>
</section>

<!-- ===== FAQ (механика landing.js: .lp-faq__item / __q / __a) ===== -->
<section class="lp-section" id="faq">
  <div class="lp-wrap lp-wrap--narrow">
    <div class="lp-head">
      <span class="lp-tag">FAQ</span>
      <h2 class="lp-h2">Ответы на частые вопросы</h2>
    </div>
    <div class="lp-faq">
      <div class="lp-faq__item">
        <button class="lp-faq__q" type="button">Нужно ли устанавливать программу?<i></i></button>
        <div class="lp-faq__a"><p>Нет. Сервис работает в браузере.</p></div>
      </div>
      <div class="lp-faq__item">
        <button class="lp-faq__q" type="button">Это полноценная 3D-визуализация?<i></i></button>
        <div class="lp-faq__a"><p>Нет. Сервис использует готовые интерьерные изображения и накладывает плитку по размеченным зонам. Это быстрее, чем готовить отдельный 3D-рендер для каждого варианта.</p></div>
      </div>
      <div class="lp-faq__item">
        <button class="lp-faq__q" type="button">Какие интерьеры есть в сервисе?<i></i></button>
        <div class="lp-faq__a"><p>Готовые интерьерные сцены: ванные комнаты разных ракурсов, зал и кухня-гостиная. Набор сцен может дополняться.</p></div>
      </div>
      <div class="lp-faq__item">
        <button class="lp-faq__q" type="button">Можно ли скачать результат?<i></i></button>
        <div class="lp-faq__a"><p>Да. Итоговую сцену можно сохранить в JPG.</p></div>
      </div>
      <div class="lp-faq__item">
        <button class="lp-faq__q" type="button">Нужна ли регистрация?<i></i></button>
        <div class="lp-faq__a"><p>Да. Доступ к визуализатору открывается после регистрации или входа.</p></div>
      </div>
      <div class="lp-faq__item">
        <button class="lp-faq__q" type="button">Есть ли лимит скачиваний?<i></i></button>
        <div class="lp-faq__a"><p>Да. У аккаунта есть месячный лимит скачиваний. Конкретные условия зависят от настроек доступа.</p></div>
      </div>
      <div class="lp-faq__item">
        <button class="lp-faq__q" type="button">Можно ли использовать сервис для производителя плитки?<i></i></button>
        <div class="lp-faq__a"><p>Да. Производитель может обсудить размещение коллекций или отдельную версию под свой бренд.</p></div>
      </div>
      <div class="lp-faq__item">
        <button class="lp-faq__q" type="button">Можно ли загрузить свои коллекции?<i></i></button>
        <div class="lp-faq__a"><p>Этот сценарий уточняется отдельно. Если нужна загрузка собственных коллекций, обсудите условия для производителя.</p></div>
      </div>
    </div>
  </div>
</section>

<!-- ===== ФИНАЛЬНЫЙ CTA ===== -->
<section class="lp-final">
  <div class="lp-wrap lp-final__in">
    <div class="lp-final__content">
      <h2>Проверьте, как ваши коллекции выглядят в интерьере</h2>
      <p>Зарегистрируйтесь, откройте визуализатор и соберите первое изображение для клиента.</p>
      <div class="lp-final__actions">
        <a class="lp-btn lp-btn--primary lp-btn--lg" href="<?= $accessUrl ?>" data-event="click_register_final"><?= $accessLabel ?> <?= lp_icon('arrow') ?></a>
        <a class="lp-btn lp-btn--ghost-light lp-btn--lg" href="#video" data-event="click_watch_video_final">Смотреть демонстрацию</a>
      </div>
      <span class="lp-final__note">Без установки · Готовые сцены · Экспорт в JPG</span>
    </div>
  </div>
</section>

<!-- ===== FOOTER ===== -->
<footer class="lp-footer">
  <div class="lp-wrap lp-footer__in">
    <div class="lp-footer__brand">
      <span class="lp-logo__mark"><?= lp_icon('compare') ?></span>
      <div>
        <strong>СравниПлитку</strong>
        <em>сервис от Vilray Studio</em>
      </div>
    </div>
    <nav class="lp-footer__nav">
      <a href="<?= $LOGIN ?>">Вход</a>
      <a href="<?= $REG ?>">Регистрация</a>
      <a href="#faq">FAQ</a>
      <a href="<?= $STUDIO ?>" target="_blank" rel="noopener">Vilray Studio</a>
    </nav>
    <div class="lp-footer__copy">© <?= date('Y') ?> СравниПлитку · Vilray Studio</div>
  </div>
</footer>

<script src="landing.js"></script>
</body>
</html>

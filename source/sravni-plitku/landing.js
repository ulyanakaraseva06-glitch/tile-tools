/* ================================================================
   landing.js — лёгкая интерактивность лендинга «Сравни плитку».
   Отдельный файл. Не зависит от betavis.js и не влияет на визуализатор.
   Без внешних библиотек.
================================================================ */
(function () {
  'use strict';

  /* ---------- мобильное меню ---------- */
  var burger = document.getElementById('lpBurger');
  var nav = document.getElementById('lpNav');
  if (burger && nav) {
    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      nav.classList.toggle('open');
    });
    // закрытие меню по клику на пункт и по клику вне
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') nav.classList.remove('open');
    });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('open') && !nav.contains(e.target) && !burger.contains(e.target)) {
        nav.classList.remove('open');
      }
    });
  }

  /* ---------- плавный скролл по якорям ---------- */
  var header = document.querySelector('.lp-header');
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var offset = (header ? header.offsetHeight : 0) + 10;
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

  /* ---------- FAQ-аккордеон ---------- */
  document.querySelectorAll('.lp-faq__item').forEach(function (item) {
    var q = item.querySelector('.lp-faq__q');
    var a = item.querySelector('.lp-faq__a');
    if (!q || !a) return;
    q.addEventListener('click', function () {
      var open = item.classList.contains('open');
      // закрываем остальные (поведение аккордеона)
      document.querySelectorAll('.lp-faq__item.open').forEach(function (other) {
        if (other !== item) {
          other.classList.remove('open');
          var oa = other.querySelector('.lp-faq__a');
          if (oa) oa.style.maxHeight = null;
        }
      });
      if (open) {
        item.classList.remove('open');
        a.style.maxHeight = null;
      } else {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  /* ---------- видео-заглушка ---------- */
  // Пока реального видео нет: если на .lp-video задан data-embed (URL YouTube embed),
  // по клику подставляем iframe. Иначе показываем мягкое уведомление.
  var video = document.getElementById('lpVideo');
  if (video) {
    video.addEventListener('click', function () {
      var embed = (video.getAttribute('data-embed') || '').trim();
      if (embed) {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'position:absolute;inset:0';
        var iframe = document.createElement('iframe');
        iframe.src = embed + (embed.indexOf('?') > -1 ? '&' : '?') + 'autoplay=1';
        iframe.allow = 'autoplay; encrypted-media; fullscreen';
        iframe.setAttribute('allowfullscreen', '');
        iframe.style.cssText = 'width:100%;height:100%;border:0';
        wrap.appendChild(iframe);
        video.innerHTML = '';
        video.appendChild(wrap);
      } else {
        var cap = video.querySelector('.lp-video__cap');
        if (cap) cap.textContent = 'Видео скоро будет добавлено';
      }
    });
  }

  /* ---------- перенос UTM-меток в ссылки регистрации/входа ---------- */
  // Если пользователь пришёл с рекламы/водяного знака/видео — сохраняем utm_* при переходе.
  try {
    var params = new URLSearchParams(window.location.search);
    var utm = [];
    params.forEach(function (val, key) {
      if (key.indexOf('utm_') === 0) utm.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
    });
    if (utm.length) {
      var qs = utm.join('&');
      document.querySelectorAll('a[href]').forEach(function (a) {
        var href = a.getAttribute('href');
        if (!href) return;
        // только внутренние ссылки на регистрацию/вход
        if (href.indexOf('auth/register.php') === 0 || href.indexOf('auth/login.php') === 0) {
          a.setAttribute('href', href + (href.indexOf('?') > -1 ? '&' : '?') + qs);
        }
      });
    }
  } catch (e) { /* URLSearchParams недоступен — пропускаем */ }

})();

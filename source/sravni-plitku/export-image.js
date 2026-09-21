/* ================================================================
   export-image.js — модуль формирования итогового JPG
   Отдельный модуль. Из основного файла (betavis.js) только вызывается:
       window.TileExport.generate({ ... })
   Композиция собирается на <canvas> в нативном разрешении исходных
   рендеров (без апскейла) → максимальное достижимое качество.
   Работает полностью на клиенте, серверная часть не нужна.
================================================================ */
(function (global) {
  'use strict';

  // Прозрачность накладываемых плиток — должна совпадать с превью в betavis.js
  const TILE_OPACITY = 0.92;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // Изображения отдаются с того же домена, что и страница, поэтому
      // crossOrigin НЕ ставим: холст не «пятнается», а главное — браузер
      // использует тот же кэш, что и SVG-слой рендера (иначе после экспорта
      // картинка перезагружалась бы заново).
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Не удалось загрузить: ' + src));
      img.src = src;
    });
  }

  // Рисуем изображение в прямоугольник по принципу "cover" (как SVG slice)
  function drawCover(ctx, img, dx, dy, dw, dh) {
    const ir = img.naturalWidth / img.naturalHeight;
    const dr = dw / dh;
    let sw, sh, sx, sy;
    if (ir > dr) {            // изображение шире — режем по бокам
      sh = img.naturalHeight;
      sw = sh * dr;
      sx = (img.naturalWidth - sw) / 2;
      sy = 0;
    } else {                  // изображение выше — режем сверху/снизу
      sw = img.naturalWidth;
      sh = sw / dr;
      sx = 0;
      sy = (img.naturalHeight - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // даём браузеру время начать загрузку, затем освобождаем память
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /**
   * Сформировать итоговый JPG.
   * @param {Object} o
   * @param {string} o.baseSrc   — путь к базовому рендеру комнаты
   * @param {{w:number,h:number}} o.viewBox — система координат SVG-масок
   * @param {Object} o.paths     — { zoneId: "d-строка SVG-пути" }
   * @param {string[]} o.order   — порядок наложения зон
   * @param {Object} o.renders   — { zoneId: "путь к рендеру плитки" } (только применённые)
   * @param {number} [o.quality] — качество JPEG 0..1 (по умолчанию 1)
   * @param {string} [o.filename]— имя файла
   * @param {number} [o.opacity] — прозрачность накладки (по умолчанию 0.92)
   * @returns {Promise<void>}
   */
  async function generate(o) {
    const quality  = o.quality  != null ? o.quality  : 1;
    const opacity  = o.opacity  != null ? o.opacity  : TILE_OPACITY;
    const filename = o.filename || 'sravni-plitku.jpg';
    const vbW = o.viewBox.w, vbH = o.viewBox.h;

    // 1) Базовый рендер
    const base = await loadImage(o.baseSrc);

    // 2) Размер холста: масштаб так, чтобы база рисовалась без увеличения
    //    (R = во сколько раз пиксели холста крупнее единиц viewBox)
    const R = Math.max(base.naturalWidth / vbW, base.naturalHeight / vbH);
    const W = Math.round(vbW * R);
    const H = Math.round(vbH * R);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 3) База на весь холст
    drawCover(ctx, base, 0, 0, W, H);

    // 4) Накладываем плитки по зонам, обрезая по SVG-маскам
    const matrix = new DOMMatrix([R, 0, 0, R, 0, 0]); // viewBox-единицы → пиксели холста
    const order = o.order || Object.keys(o.renders || {});
    for (const zoneId of order) {
      const src = o.renders && o.renders[zoneId];
      const d   = o.paths && o.paths[zoneId];
      if (!src || !d) continue;

      let img;
      try { img = await loadImage(src); }
      catch (e) { console.warn(e); continue; } // зону пропускаем, остальное собираем

      const clip = new Path2D();
      clip.addPath(new Path2D(d), matrix);

      ctx.save();
      ctx.clip(clip);
      ctx.globalAlpha = opacity;
      drawCover(ctx, img, 0, 0, W, H);
      ctx.restore();

      if (typeof o.onProgress === 'function') o.onProgress(zoneId);
    }

    // 4.5) Температура освещения — равномерный soft-light слой (паритет с превью)
    if (o.lightTempAlpha && o.lightTempColor) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = o.lightTempAlpha;
      ctx.fillStyle = o.lightTempColor;     // rgb(...), альфа задаётся globalAlpha
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // 4.6) Экспозиция — финальный фильтр по готовому кадру (паритет с превью)
    if (o.exposureFilter && o.exposureFilter !== 'none') {
      const flat = document.createElement('canvas');
      flat.width = W; flat.height = H;
      flat.getContext('2d').drawImage(canvas, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.filter = o.exposureFilter;
      ctx.drawImage(flat, 0, 0);
      ctx.filter = 'none';
    }

    // 5) Экспорт в JPG максимального качества
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('toBlob вернул пусто'))),
        'image/jpeg',
        quality
      );
    });

    triggerDownload(blob, filename);
  }

  global.TileExport = { generate };
})(window);

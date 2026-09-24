(() => {
  const MESSAGE_OPEN = 'tile-tools:open-tile-picker';
  const MESSAGE_RESULT = 'tile-tools:tile-picker-result';
  const accountUserId = document.querySelector('meta[name="account-user-id"]')?.content || '';
  let catalog = [];
  let catalogPromise = null;
  let request = null;
  let selectedTile = null;
  let selectedImageUrl = null;

  const isServiceFrame = (source) => [...document.querySelectorAll('iframe.service-frame')]
    .some((frame) => frame.contentWindow === source);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
  let favorites = new Set();

  const modal = document.createElement('div');
  modal.className = 'shared-catalog-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="shared-catalog-backdrop" data-picker-close></div>
    <section class="shared-catalog-dialog" role="dialog" aria-modal="true" aria-labelledby="shared-catalog-title">
      <header class="shared-catalog-header">
        <div>
          <button class="shared-catalog-back" type="button" data-picker-back hidden aria-label="Вернуться к каталогу">←</button>
          <h2 id="shared-catalog-title">Медиатека плитки</h2>
        </div>
        <button class="shared-catalog-close" type="button" data-picker-close aria-label="Закрыть">×</button>
      </header>
      <div class="shared-catalog-filters">
        <input type="search" data-picker-search placeholder="Поиск по названию, артикулу или бренду" autocomplete="off">
        <select data-picker-surface aria-label="Поверхность"><option value="">Все поверхности</option></select>
      </div>
      <div class="shared-catalog-status" data-picker-status>Загрузка медиатеки…</div>
      <div class="shared-catalog-grid" data-picker-grid></div>
      <div class="shared-catalog-detail" data-picker-detail hidden></div>
    </section>`;
  document.body.appendChild(modal);

  const search = modal.querySelector('[data-picker-search]');
  const surface = modal.querySelector('[data-picker-surface]');
  const grid = modal.querySelector('[data-picker-grid]');
  const detail = modal.querySelector('[data-picker-detail]');
  const status = modal.querySelector('[data-picker-status]');
  const back = modal.querySelector('[data-picker-back]');

  const loadCatalog = () => {
    if (!catalogPromise) {
      catalogPromise = fetch('/api/catalog/tiles.php')
        .then((response) => {
          if (!response.ok) throw new Error('catalog');
          return response.json();
        })
        .then((data) => {
          catalog = Array.isArray(data.items) ? data.items : [];
          if (data.authenticated) favorites = new Set(catalog.filter((tile) => tile.isFavorite).map((tile) => String(tile.id)));
          const values = [...new Set(catalog.flatMap((tile) => tile.surfaces || []).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
          surface.innerHTML = '<option value="">Все поверхности</option>' + values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
          return catalog;
        });
    }
    return catalogPromise;
  };

  function close() {
    modal.hidden = true;
    document.body.classList.remove('shared-catalog-open');
    request = null;
    selectedTile = null;
    selectedImageUrl = null;
  }

  function closeDetail() {
    selectedTile = null;
    selectedImageUrl = null;
    detail.hidden = true;
  }

  function send(tile, imageUrl) {
    if (!request?.source) return;
    request.source.postMessage({
      type: MESSAGE_RESULT,
      requestId: request.requestId,
      tile: { ...tile, selectedImageUrl: imageUrl || tile.previewUrl || tile.imageUrls?.[0] || null }
    }, '*');
    close();
  }

  async function toggleFavorite(tileId, button) {
    if (!accountUserId) {
      window.dispatchEvent(new CustomEvent('tile-tools:auth-required', { detail: { action: 'добавления в избранное' } }));
      return;
    }
    const id = String(tileId);
    const adding = !favorites.has(id);
    if (adding) favorites.add(id); else favorites.delete(id);
    button.classList.toggle('active', adding);
    button.textContent = adding ? '♥' : '♡';
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
    try {
      const response = await fetch('/api/favorites/index.php', {
        method: adding ? 'PUT' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrf, entityType: 'tile', entityId: id })
      });
      if (!response.ok) throw new Error('favorite_sync_failed');
    } catch (_) {
      if (adding) favorites.delete(id); else favorites.add(id);
      button.classList.toggle('active', !adding);
      button.textContent = adding ? '♡' : '♥';
    }
  }

  function renderGrid() {
    selectedTile = null;
    selectedImageUrl = null;
    detail.hidden = true;
    grid.hidden = false;
    back.hidden = true;
    const query = search.value.trim().toLocaleLowerCase('ru');
    const selectedSurface = surface.value;
    const items = catalog.filter((tile) => {
      const haystack = `${tile.name || ''} ${tile.shortName || ''} ${tile.brand || ''} ${tile.article || ''}`.toLocaleLowerCase('ru');
      return (!query || haystack.includes(query)) && (!selectedSurface || (tile.surfaces || []).includes(selectedSurface));
    }).sort((a, b) => Number(favorites.has(String(b.id))) - Number(favorites.has(String(a.id))) || String(a.shortName || a.name).localeCompare(String(b.shortName || b.name), 'ru'));
    status.hidden = Boolean(items.length);
    status.textContent = catalog.length ? 'По заданным параметрам плитка не найдена.' : 'В медиатеке пока нет плитки.';
    grid.innerHTML = items.map((tile, index) => {
      const image = tile.previewUrl || tile.imageUrls?.[0];
      const name = tile.shortName || tile.name;
      return `<article class="shared-catalog-card">
        <button class="shared-catalog-favorite${favorites.has(String(tile.id)) ? ' active' : ''}" type="button" data-favorite-index="${index}" data-tile-id="${escapeHtml(tile.id)}" aria-label="Добавить в избранное">${favorites.has(String(tile.id)) ? '♥' : '♡'}</button>
        <button class="shared-catalog-card-main" type="button" data-card-id="${escapeHtml(tile.id)}">
          <span class="shared-catalog-card-image">${image ? `<img src="${escapeHtml(image)}" alt="">` : `<i style="background:${escapeHtml(tile.hex || '#eee')}"></i>`}</span>
          <strong>${escapeHtml(name)}</strong>
          <small>${escapeHtml([tile.brand, tile.sizes?.[0] || 'Размер не указан'].filter(Boolean).join(' · '))}</small>
        </button>
      </article>`;
    }).join('');
  }

  function showDetail(tile) {
    selectedTile = tile;
    grid.hidden = false;
    detail.hidden = false;
    back.hidden = true;
    const images = (tile.imageUrls?.length ? tile.imageUrls : [tile.previewUrl]).filter(Boolean);
    selectedImageUrl = images[0] || null;
    const name = tile.shortName || tile.name;
    const attributes = tile.attributes && typeof tile.attributes === 'object' ? tile.attributes : {};
    const attributeFacts = Array.isArray(attributes)
      ? attributes.map((attribute) => [attribute?.name, Array.isArray(attribute?.values) ? attribute.values.join(', ') : attribute?.value])
      : Object.entries(attributes);
    const rawFacts = [
      ['Размер', (tile.sizes || []).join(', ')], ['Бренд', tile.brand], ['Артикул', tile.article],
      ['Поверхность', (tile.surfaces || []).join(', ')], ['Дизайн', (tile.designs || []).join(', ')],
      ...attributeFacts
    ].filter(([, value]) => value != null && String(value).trim());
    const seenFacts = new Set();
    const facts = rawFacts.filter(([label]) => {
      const key = String(label || '').trim().toLocaleLowerCase('ru');
      if (!key || seenFacts.has(key)) return false;
      seenFacts.add(key);
      return true;
    });
    detail.innerHTML = `<div class="shared-catalog-detail-backdrop" data-detail-close></div>
      <section class="shared-catalog-detail-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(name)}">
        <header class="shared-catalog-detail-head">
          <div><h3>${escapeHtml(name)}</h3><p>${escapeHtml(tile.sizes?.[0] || '')}</p></div>
          <button class="shared-catalog-detail-close" type="button" data-detail-close aria-label="Закрыть">×</button>
        </header>
        <div class="shared-catalog-detail-media${images.length > 1 ? '' : ' no-thumbs'}">
          <div class="shared-catalog-detail-photo">${selectedImageUrl ? `<img data-detail-image src="${escapeHtml(selectedImageUrl)}" alt="${escapeHtml(name)}">` : `<span style="background:${escapeHtml(tile.hex || '#eee')}"></span>`}</div>
          ${images.length > 1 ? `<div class="shared-catalog-detail-thumbs" style="--thumb-count:${images.length}">${images.map((image, index) => `<button type="button" class="${index === 0 ? 'active' : ''}" data-detail-thumb="${index}" title="Вариант ${index + 1}"><img src="${escapeHtml(image)}" alt=""></button>`).join('')}</div>` : ''}
        </div>
        ${facts.length ? `<dl class="shared-catalog-facts">${facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(Array.isArray(value) ? value.join(', ') : value)}</dd></div>`).join('')}</dl>` : ''}
        <button class="shared-catalog-use" type="button" data-use-selection>Выбрать</button>
      </section>`;
  }

  function open(nextRequest) {
    request = nextRequest;
    selectedTile = null;
    search.value = '';
    surface.value = '';
    modal.hidden = false;
    document.body.classList.add('shared-catalog-open');
    grid.hidden = true;
    detail.hidden = true;
    back.hidden = true;
    status.hidden = false;
    status.textContent = 'Загрузка медиатеки…';
    loadCatalog().then(renderGrid).catch(() => { status.textContent = 'Не удалось загрузить медиатеку. Попробуйте ещё раз.'; });
    window.setTimeout(() => search.focus(), 0);
  }

  search.addEventListener('input', renderGrid);
  surface.addEventListener('change', renderGrid);
  back.addEventListener('click', renderGrid);
  modal.addEventListener('click', (event) => {
    if (event.target.closest('[data-picker-close]')) { close(); return; }
    if (event.target.closest('[data-detail-close]')) { closeDetail(); return; }
    const thumb = event.target.closest('[data-detail-thumb]');
    if (thumb && selectedTile) {
      const images = (selectedTile.imageUrls?.length ? selectedTile.imageUrls : [selectedTile.previewUrl]).filter(Boolean);
      selectedImageUrl = images[Number(thumb.dataset.detailThumb)] || images[0] || null;
      const image = detail.querySelector('[data-detail-image]');
      if (image && selectedImageUrl) image.src = selectedImageUrl;
      detail.querySelectorAll('[data-detail-thumb]').forEach((button) => button.classList.toggle('active', button === thumb));
      return;
    }
    if (event.target.closest('[data-use-selection]') && selectedTile) {
      send(selectedTile, request?.mode === 'image' ? selectedImageUrl : null);
      return;
    }
    const favorite = event.target.closest('[data-tile-id]');
    if (favorite) { event.stopPropagation(); void toggleFavorite(favorite.dataset.tileId, favorite); return; }
    const card = event.target.closest('[data-card-id]');
    if (card) { const tile = catalog.find((item) => String(item.id) === card.dataset.cardId); if (tile) showDetail(tile); return; }
  });
  document.addEventListener('keydown', (event) => { if (!modal.hidden && event.key === 'Escape') close(); });
  window.addEventListener('message', (event) => {
    if (event.data?.type !== MESSAGE_OPEN || !isServiceFrame(event.source)) return;
    open({ source: event.source, requestId: event.data.requestId, mode: event.data.mode === 'image' ? 'image' : 'model' });
  });
})();

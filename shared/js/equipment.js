(() => {
  const root = document.querySelector('[data-equipment-page]');
  if (!root) return;

  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const searchForm = root.querySelector('[data-equipment-search]');
  const queryInput = root.querySelector('[name="q"]');
  const list = root.querySelector('[data-equipment-list]');
  const empty = root.querySelector('[data-equipment-empty]');
  const count = root.querySelector('[data-equipment-count]');
  const dialog = document.querySelector('[data-equipment-dialog]');
  const dialogContent = dialog?.querySelector('[data-dialog-content]');
  const categoryLabels = { stands: 'Стенды', expositors: 'Экспозиторы', panels: 'Панели', samples: 'Образцы', showrooms: 'Шоурумы', lighting: 'Освещение', accessories: 'Аксессуары' };
  const labels = { category: categoryLabels, availability: { in_stock: 'В наличии', on_order: 'Под заказ' } };
  let latestItems = [];
  let accountFavorites = new Set();
  const accountUserId = document.querySelector('meta[name="account-user-id"]')?.content || '';

  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]);
  const notify = (message) => {
    const toast = document.querySelector('#app-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => { toast.hidden = true; }, 4500);
  };
  const selected = (name) => root.querySelector(`[name="${name}"]`)?.value || '';
  const currentParams = () => new URLSearchParams(Object.fromEntries(['q', 'category', 'brand', 'purpose', 'availability', 'type', 'sort'].map((key) => [key, key === 'q' ? queryInput.value.trim() : selected(key)]).filter(([, value]) => value !== '')));
  const isFavorite = (id) => accountFavorites.has(id);

  const options = (name, values, pretty = {}) => {
    const select = root.querySelector(`[name="${name}"]`);
    if (!select) return;
    const current = select.value;
    const first = select.options[0].textContent;
    select.innerHTML = `<option value="">${escapeHtml(first)}</option>${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(pretty[value] || value)}</option>`).join('')}`;
    select.value = current;
  };
  const card = (item) => {
    const availability = item.availability === 'in_stock' ? 'В наличии' : 'Под заказ';
    const action = item.availability === 'in_stock' ? 'В проект' : 'Запросить условия';
    return `<article class="equipment-card" data-equipment-id="${escapeHtml(item.id)}"><div class="equipment-photo equipment-${escapeHtml(item.visual_key)}"><span class="equipment-brand">${escapeHtml(item.brand)}</span><i></i><b></b></div><button class="equipment-heart ${isFavorite(item.id) ? 'is-favorite' : ''}" type="button" data-equipment-favorite="${escapeHtml(item.id)}" aria-label="Добавить в избранное" aria-pressed="${isFavorite(item.id)}">${isFavorite(item.id) ? '♥' : '♡'}</button><h2>${escapeHtml(item.name)}</h2><p class="equipment-brand-line">${escapeHtml(item.brand)}</p><p class="equipment-dimensions">${escapeHtml(item.dimensions || item.equipment_type)}</p><p class="equipment-description">${escapeHtml(item.short_description)}</p><p class="availability ${item.availability === 'in_stock' ? 'in-stock' : 'on-order'}"><span></span>${availability}</p><div class="equipment-card-actions"><button class="button button-secondary" type="button" data-equipment-action="${item.availability === 'in_stock' ? 'project' : 'lead'}" data-equipment-id="${escapeHtml(item.id)}">▱ ${action}</button><button type="button" class="more-button" data-equipment-details="${escapeHtml(item.id)}" aria-label="Подробнее">•••</button></div></article>`;
  };
  const render = (items) => {
    latestItems = items;
    list.innerHTML = items.map(card).join('');
    count.textContent = `${items.length} ${items.length === 1 ? 'товар' : items.length < 5 ? 'товара' : 'товаров'}`;
    empty.hidden = items.length !== 0;
  };
  const load = async () => {
    list.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(`/api/equipment/?${currentParams().toString()}`, { headers: { Accept: 'application/json' } });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || 'Не удалось загрузить каталог.');
      options('category', payload.facets.category, labels.category);
      options('brand', payload.facets.brand);
      options('purpose', payload.facets.purpose);
      options('type', payload.facets.type);
      render(payload.items);
    } catch (error) {
      list.innerHTML = '';
      empty.hidden = false;
      empty.innerHTML = `<strong>Каталог временно недоступен</strong><p>${escapeHtml(error.message)}</p>`;
    } finally {
      list.removeAttribute('aria-busy');
    }
  };
  const openDialog = (html) => { dialogContent.innerHTML = html; dialog.showModal(); };
  const api = async (url, options = {}) => {
    const response = await fetch(url, { headers: { Accept: 'application/json', ...(options.headers || {}) }, ...options });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      const error = new Error(payload.error?.message || 'Не удалось выполнить действие.');
      error.status = response.status;
      throw error;
    }
    return payload;
  };
  const syncFavorites = async () => {
    try {
      const payload = await api('/api/favorites/');
      accountFavorites = new Set(payload.items.filter((item) => item.entity_type === 'equipment').map((item) => item.entity_id));
      if (latestItems.length) render(latestItems);
    } catch (_) { accountFavorites = new Set(); }
  };
  const leadForm = (item) => `<h2>${item ? 'Запросить условия' : 'Подбор оборудования'}</h2><p>${item ? `Оставьте контакты — подготовим условия для «${escapeHtml(item.name)}».` : 'Расскажите о задаче — поможем подобрать оборудование для вашего шоурума.'}</p><form data-equipment-lead-form><input type="hidden" name="equipmentId" value="${item ? escapeHtml(item.id) : ''}"><label>Ваше имя<input class="input" name="name" required minlength="2" placeholder="Алексей"></label><label>Телефон, e-mail или Telegram<input class="input" name="contact" required minlength="3" placeholder="@username или +7 999 123-45-67"></label><label>Комментарий<textarea class="input" name="message" rows="4" placeholder="Например: нужен стенд для крупноформатной плитки"></textarea></label><button class="button button-primary" type="submit">Отправить запрос</button></form>`;
  const details = (item) => `<h2>${escapeHtml(item.name)}</h2><div class="dialog-visual equipment-photo equipment-${escapeHtml(item.visual_key)}"><span class="equipment-brand">${escapeHtml(item.brand)}</span><i></i><b></b></div><dl class="equipment-details"><div><dt>Бренд</dt><dd>${escapeHtml(item.brand)}</dd></div><div><dt>Категория</dt><dd>${escapeHtml(categoryLabels[item.category] || item.category)}</dd></div><div><dt>Назначение</dt><dd>${escapeHtml(item.purpose)}</dd></div><div><dt>Размер</dt><dd>${escapeHtml(item.dimensions || 'Уточняется')}</dd></div></dl><p>${escapeHtml(item.short_description)}</p><div class="button-row"><button class="button button-primary" type="button" data-lead-open data-equipment-id="${escapeHtml(item.id)}">Запросить условия</button><button class="button button-secondary" type="button" data-project-open data-equipment-id="${escapeHtml(item.id)}">В проект</button></div>`;
  const chooseProject = async (equipmentId) => {
    try {
      const payload = await api('/api/projects/');
      if (!payload.projects.length) { notify('Создайте проект, чтобы сохранить в него оборудование.'); return; }
      openDialog(`<h2>Сохранить в проект</h2><p>Выберите проект для добавления оборудования.</p><div class="project-picker">${payload.projects.map((project) => `<button type="button" data-project-choice="${escapeHtml(project.id)}" data-equipment-id="${escapeHtml(equipmentId)}"><b>${escapeHtml(project.title)}</b><small>${escapeHtml(project.project_type)} · ${escapeHtml(project.status)}</small></button>`).join('')}</div>`);
    } catch (error) { notify(error.status === 401 ? 'Для сохранения в проект войдите в аккаунт.' : error.message); }
  };

  searchForm.addEventListener('submit', (event) => { event.preventDefault(); load(); });
  root.querySelectorAll('select').forEach((select) => select.addEventListener('change', load));
  root.querySelector('[data-equipment-reset]').addEventListener('click', () => { queryInput.value = ''; root.querySelectorAll('.equipment-filters select').forEach((select) => { select.value = ''; }); root.querySelector('[name="sort"]').value = 'popular'; root.querySelectorAll('[data-category]').forEach((button) => button.classList.toggle('is-active', button.dataset.category === '')); load(); });
  root.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => { root.querySelector('[name="category"]').value = button.dataset.category; root.querySelectorAll('[data-category]').forEach((item) => item.classList.toggle('is-active', item === button)); load(); }));
  root.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => { list.classList.toggle('is-list', button.dataset.view === 'list'); root.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('is-active', item === button)); }));
  document.addEventListener('click', (event) => {
    const close = event.target.closest('[data-dialog-close]');
    if (close) dialog.close();
    const favorite = event.target.closest('[data-equipment-favorite]');
    if (favorite) { const id = favorite.dataset.equipmentFavorite; if (!accountUserId) { notify('Войдите в аккаунт, чтобы пользоваться избранным.'); return; } const next = !isFavorite(id); favorite.disabled = true; api('/api/favorites/', { method: next ? 'PUT' : 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csrf, entityType: 'equipment', entityId: id }) }).then(() => { if (next) accountFavorites.add(id); else accountFavorites.delete(id); favorite.classList.toggle('is-favorite', next); favorite.setAttribute('aria-pressed', String(next)); favorite.textContent = next ? '♥' : '♡'; notify(next ? 'Добавлено в избранное аккаунта.' : 'Удалено из избранного аккаунта.'); }).catch((error) => notify(error.status === 401 ? 'Войдите в аккаунт, чтобы пользоваться избранным.' : error.message)).finally(() => { favorite.disabled = false; }); }
    const detail = event.target.closest('[data-equipment-details]');
    if (detail) { const item = latestItems.find((candidate) => candidate.id === detail.dataset.equipmentDetails); if (item) openDialog(details(item)); }
    const action = event.target.closest('[data-equipment-action]');
    if (action) { const item = latestItems.find((candidate) => candidate.id === action.dataset.equipmentId); if (action.dataset.equipmentAction === 'lead' && item) openDialog(leadForm(item)); else chooseProject(action.dataset.equipmentId); }
    const lead = event.target.closest('[data-lead-open]');
    if (lead) { const item = latestItems.find((candidate) => candidate.id === lead.dataset.equipmentId); openDialog(leadForm(item)); }
    const project = event.target.closest('[data-project-open]');
    if (project) chooseProject(project.dataset.equipmentId);
    const choice = event.target.closest('[data-project-choice]');
    if (choice) { api('/api/equipment/project.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csrf, equipmentId: choice.dataset.equipmentId, projectId: choice.dataset.projectChoice }) }).then((payload) => { dialog.close(); notify(payload.created ? 'Оборудование добавлено в проект.' : 'Эта позиция уже есть в выбранном проекте.'); }).catch((error) => notify(error.message)); }
  });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-equipment-lead-form]');
    if (!form) return;
    event.preventDefault();
    const body = Object.fromEntries(new FormData(form)); body.csrf = csrf;
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    try { const response = await fetch('/api/equipment/lead.php', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok || !payload.ok) throw new Error(payload.error?.message || 'Не удалось отправить заявку.'); dialog.close(); notify('Заявка сохранена. Мы свяжемся с вами по указанному контакту.'); } catch (error) { notify(error.message); } finally { submit.disabled = false; }
  });
  load();
  syncFavorites();
})();

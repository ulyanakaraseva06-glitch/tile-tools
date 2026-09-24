(() => {
  const root = document.querySelector('[data-projects-page]');
  if (!root) return;
  const accountUserId = document.querySelector('meta[name="account-user-id"]')?.content || '';
  const REGISTRY_KEY = `tile_tools_projects_v2_user_${accountUserId}`;
  const STATUS_LABELS = { draft: 'Черновик', active: 'В работе', done: 'Завершён', archived: 'Архив' };
  const TYPE_LABELS = { visualization: 'Сравни плитку', calculation: 'Посчитай плитку', pdf: 'PDF и документы' };
  const ROUTES = { visualization: '/index.php?page=visualizer', calculation: '/index.php?page=calculator', pdf: '/index.php?page=pdf' };
  const els = { list: root.querySelector('[data-project-list]'), empty: root.querySelector('[data-project-empty]'), summary: root.querySelector('[data-project-summary]'), search: root.querySelector('[data-project-search]'), status: root.querySelector('[data-project-status]'), type: root.querySelector('[data-project-type]'), sort: root.querySelector('[data-project-sort]'), dialog: document.querySelector('[data-project-dialog]') };
  let projects = [];
  let view = 'all';
  const safeParse = (raw, fallback = null) => { try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; } };
  const readRegistry = () => safeParse(localStorage.getItem(REGISTRY_KEY), []) || [];
  const writeRegistry = (items) => localStorage.setItem(REGISTRY_KEY, JSON.stringify(items.slice(0, 100)));
  const validStatus = (status) => Object.hasOwn(STATUS_LABELS, status) ? status : 'draft';
  const asBoolean = (value) => value === true || value === 1 || value === '1';
  const localId = (type, id) => `local:${type}:${id}`;
  const metricFor = (type, payload) => {
    if (type === 'calculation') return `${payload?.surfaces?.length || 0} поверхн. · ${payload?.materials?.length || 0} матер.`;
    if (type === 'pdf') return `${payload?.pages?.length || 0} стр. · ${payload?.mediaAssets?.length || 0} медиа`;
    const selection = payload?.selection && typeof payload.selection === 'object' ? Object.keys(payload.selection).length : 0;
    return `${selection} выбранных зон`;
  };
  const normalize = (item) => ({ id: String(item.id), serverId: item.serverId || null, source: item.source || (String(item.id).startsWith('local:') ? 'local' : 'server'), type: item.type || item.projectType || item.project_type || 'calculation', title: item.title || 'Без названия', status: validStatus(item.status), favorite: asBoolean(item.favorite) || asBoolean(item.isFavorite) || asBoolean(item.is_favorite), payload: item.payload || null, updatedAt: item.updatedAt || item.updated_at || item.createdAt || item.created_at || new Date().toISOString(), createdAt: item.createdAt || item.created_at || item.updatedAt || item.updated_at || new Date().toISOString(), metric: item.metric || (item.item_count != null ? `${item.item_count} позиций` : metricFor(item.type || item.projectType || item.project_type, item.payload)), previewUrl: item.previewUrl || item.preview_url || (item.preview_media_id ? `/api/media/file.php?id=${encodeURIComponent(item.preview_media_id)}` : null) });

  async function loadProjects() {
    const cacheByServerId = new Map(readRegistry().filter((item) => item.serverId).map((item) => [String(item.serverId), item]));
    try {
      const response = await fetch('/api/projects/');
      if (!response.ok) throw new Error('projects_load_failed');
      const data = await response.json();
      projects = (data.projects || []).map((item) => {
        const cached = cacheByServerId.get(String(item.id));
        return normalize({ ...cached, ...item, id: String(item.id), serverId: String(item.id), source: 'server', payload: cached?.payload || null });
      });
    } catch (_) { projects = []; }
    render();
  }
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const formatDate = (value) => { const date = new Date(value); if (Number.isNaN(date.getTime())) return '—'; return `${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)}<small>${new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date)}</small>`; };
  function filteredProjects() {
    const query = els.search.value.trim().toLocaleLowerCase('ru');
    return projects.filter((project) => {
      if (view === 'active' && project.status !== 'active') return false; if (view === 'done' && project.status !== 'done') return false; if (view === 'favorite' && !project.favorite) return false; if (view === 'archived' && project.status !== 'archived') return false;
      if (view !== 'archived' && view !== 'all' && project.status === 'archived') return false; if (els.status.value && project.status !== els.status.value) return false; if (els.type.value && project.type !== els.type.value) return false;
      return !query || project.title.toLocaleLowerCase('ru').includes(query) || (TYPE_LABELS[project.type] || '').toLocaleLowerCase('ru').includes(query);
    }).sort((a, b) => els.sort.value === 'title' ? a.title.localeCompare(b.title, 'ru') : els.sort.value === 'updated-asc' ? new Date(a.updatedAt) - new Date(b.updatedAt) : new Date(b.updatedAt) - new Date(a.updatedAt));
  }
  function updateCounts() {
    const counts = { all: projects.length, active: projects.filter((p) => p.status === 'active').length, done: projects.filter((p) => p.status === 'done').length, favorite: projects.filter((p) => p.favorite).length, archived: projects.filter((p) => p.status === 'archived').length };
    Object.entries(counts).forEach(([key, value]) => { const el = root.querySelector(`[data-project-count="${key}"]`); if (el) el.textContent = value; });
  }
  function render() {
    updateCounts(); const visible = filteredProjects(); els.empty.hidden = visible.length > 0;
    els.list.innerHTML = visible.map((project) => `<article class="project-row" data-project-id="${escapeHtml(project.id)}"><div class="project-main"><div class="project-thumb project-thumb-${escapeHtml(project.type)}">${project.previewUrl ? `<img src="${escapeHtml(project.previewUrl)}" alt="">` : '<i></i>'}</div><div><strong>${escapeHtml(project.title)}</strong><small>Сохранён в аккаунте</small></div></div><div><span class="project-type-icon">${project.type === 'visualization' ? '◩' : project.type === 'pdf' ? '▤' : '⊞'}</span>${escapeHtml(TYPE_LABELS[project.type] || project.type)}</div><time datetime="${escapeHtml(project.updatedAt)}">${formatDate(project.updatedAt)}</time><div class="project-metric">${escapeHtml(project.metric)}</div><label class="project-status"><span class="sr-only">Статус проекта</span><select data-project-status-change class="status-${escapeHtml(project.status)}"><option value="draft" ${project.status === 'draft' ? 'selected' : ''}>Черновик</option><option value="active" ${project.status === 'active' ? 'selected' : ''}>В работе</option><option value="done" ${project.status === 'done' ? 'selected' : ''}>Завершён</option><option value="archived" ${project.status === 'archived' ? 'selected' : ''}>Архив</option></select></label><div class="project-actions"><button class="project-resume" type="button" data-project-resume>Вернуться к работе</button><button class="project-heart ${project.favorite ? 'is-favorite' : ''}" type="button" data-project-favorite aria-label="Избранное" aria-pressed="${project.favorite}">${project.favorite ? '♥' : '♡'}</button><button class="project-more" type="button" data-project-archive aria-label="${project.status === 'archived' ? 'Вернуть из архива' : 'В архив'}">•••<span>${project.status === 'archived' ? 'Вернуть в работу' : 'Переместить в архив'}</span></button></div></article>`).join('');
    els.summary.textContent = `Показано ${visible.length} из ${projects.length} проектов`;
  }
  function saveLocalChange(project) { const registry = readRegistry().filter((item) => String(item.id) !== project.id && String(item.serverId || '') !== String(project.serverId || project.id)); writeRegistry([project, ...registry]); }
  async function updateStatus(project, status) {
    project.status = validStatus(status); project.updatedAt = new Date().toISOString(); saveLocalChange(project); render();
    const serverId = project.serverId || (project.source === 'server' ? project.id : null);
    if (serverId) { try { await fetch(`/api/projects/item.php?id=${encodeURIComponent(serverId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || '' }, body: JSON.stringify({ status: project.status }) }); } catch (_) {} }
  }
  async function resume(project) {
    let payload = project.payload;
    if (!payload && project.source === 'server') { try { const response = await fetch(`/api/projects/item.php?id=${encodeURIComponent(project.id)}`); if (response.ok) payload = (await response.json()).project?.payload; } catch (_) {} }
    if (payload) {
      project.payload = payload;
      saveLocalChange(project);
      sessionStorage.setItem(`tile_tools_resume_${project.id}`, JSON.stringify(payload));
    }
    window.location.href = `${ROUTES[project.type] || ROUTES.calculation}&project=${encodeURIComponent(project.id)}`;
  }
  async function toggleProjectFavorite(project) {
    const adding = !project.favorite;
    project.favorite = adding;
    render();
    try {
      const response = await fetch('/api/favorites/index.php', { method: adding ? 'PUT' : 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csrf: document.querySelector('meta[name="csrf-token"]')?.content || '', entityType: 'project', entityId: project.id }) });
      if (!response.ok) throw new Error('favorite_sync_failed');
      saveLocalChange(project);
    } catch (_) { project.favorite = !adding; render(); }
  }
  root.addEventListener('input', (event) => { if (event.target.matches('[data-project-search],[data-project-status],[data-project-type],[data-project-sort]')) render(); });
  root.addEventListener('change', (event) => { if (event.target.matches('[data-project-status],[data-project-type],[data-project-sort]')) { render(); return; } if (!event.target.matches('[data-project-status-change]')) return; const project = projects.find((item) => item.id === event.target.closest('[data-project-id]')?.dataset.projectId); if (project) void updateStatus(project, event.target.value); });
  root.addEventListener('click', (event) => {
    const viewButton = event.target.closest('[data-project-view]'); if (viewButton) { view = viewButton.dataset.projectView; root.querySelectorAll('[data-project-view]').forEach((button) => button.classList.toggle('is-active', button === viewButton)); render(); return; }
    const row = event.target.closest('[data-project-id]'); const project = row && projects.find((item) => item.id === row.dataset.projectId);
    if (project && event.target.closest('[data-project-resume]')) { void resume(project); return; } if (project && event.target.closest('[data-project-favorite]')) { void toggleProjectFavorite(project); return; } if (project && event.target.closest('[data-project-archive]')) void updateStatus(project, project.status === 'archived' ? 'active' : 'archived');
  });
  document.querySelectorAll('[data-new-project]').forEach((button) => button.addEventListener('click', () => els.dialog?.showModal()));
  document.querySelector('[data-project-dialog-close]')?.addEventListener('click', () => els.dialog?.close());
  els.dialog?.addEventListener('click', (event) => { if (event.target === els.dialog) els.dialog.close(); });
  void loadProjects();
})();

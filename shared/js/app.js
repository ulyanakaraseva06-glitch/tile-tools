(() => {
  const accountUserId = document.querySelector('meta[name="account-user-id"]')?.content || '';
  const GUEST_PROJECTS_KEY = 'tile_tools_projects_v2_guest';
  const LEGACY_PROJECTS_KEY = 'tile_tools_projects_v1';
  const PROJECTS_KEY = accountUserId ? `tile_tools_projects_v2_user_${accountUserId}` : GUEST_PROJECTS_KEY;
  const projectSyncTimers = new Map();
  const unsavedProjects = new Set();
  const projectVersions = new Map();
  const readProjects = () => {
    try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]'); } catch (_) { return []; }
  };
  const readProjectRegistry = (key) => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) { return []; }
  };
  const writeProjectRegistry = (key, projects) => localStorage.setItem(key, JSON.stringify(projects.slice(0, 100)));
  if (readProjectRegistry(GUEST_PROJECTS_KEY).length === 0) {
    const legacyGuestProjects = readProjectRegistry(LEGACY_PROJECTS_KEY).filter((project) => !project.serverId && project?.payload);
    if (legacyGuestProjects.length) writeProjectRegistry(GUEST_PROJECTS_KEY, legacyGuestProjects);
  }
  const storeProject = (incoming) => {
    if (!incoming || !['visualization', 'calculation', 'pdf'].includes(incoming.type) || !incoming.payload) return null;
    const id = String(incoming.id || `${incoming.type}-${Date.now()}`);
    const syncVersion = (projectVersions.get(id) || 0) + 1;
    projectVersions.set(id, syncVersion);
    unsavedProjects.add(id);
    const current = readProjects();
    const previous = current.find((item) => String(item.id) === id);
    const project = {
      ...previous,
      ...incoming,
      id,
      source: 'local',
      status: previous?.status || incoming.status || 'active',
      favorite: Boolean(previous?.favorite),
      syncVersion,
      pendingSync: Boolean(accountUserId),
      updatedAt: incoming.updatedAt || new Date().toISOString()
    };
    try {
      writeProjectRegistry(PROJECTS_KEY, [project, ...current.filter((item) => String(item.id) !== id)]);
      unsavedProjects.delete(id);
    } catch (_) { /* Предупреждение о закрытии останется, если локальное сохранение не удалось. */ }
    return project;
  };
  const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content || '';
  const syncProject = (project) => {
    if (!accountUserId) {
      return;
    }
    window.clearTimeout(projectSyncTimers.get(project.id));
    projectSyncTimers.set(project.id, window.setTimeout(async () => {
      const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken() };
      const body = { projectType: project.type, title: project.title, status: project.status, payload: project.payload };
      try {
        const response = project.serverId
          ? await fetch(`/api/projects/item.php?id=${encodeURIComponent(project.serverId)}`, { method: 'PATCH', headers, body: JSON.stringify(body) })
          : await fetch('/api/projects/', { method: 'POST', headers, body: JSON.stringify(body) });
        if (!response.ok) throw Object.assign(new Error('project_sync_failed'), { status: response.status });
        const data = await response.json();
        const current = readProjects();
        const saved = current.find((item) => String(item.id) === project.id);
        if (saved) {
          if (!saved.serverId && data.project?.id) saved.serverId = data.project.id;
          saved.pendingSync = false;
          writeProjectRegistry(PROJECTS_KEY, current);
        }
        if (projectVersions.get(project.id) === project.syncVersion) unsavedProjects.delete(project.id);
      } catch (error) {
        showNotice(error.status === 401 ? 'Войдите в аккаунт, чтобы сохранить проект.' : 'Не удалось синхронизировать проект с аккаунтом. Изменения сохранены локально и будут отправлены при следующем открытии.');
      }
    }, 1200));
  };

  const showNotice = (message) => {
    const toast = document.querySelector('#app-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showNotice.timeout);
    showNotice.timeout = window.setTimeout(() => { toast.hidden = true; }, 5200);
  };

  async function migrateGuestProjects() {
    if (!accountUserId) return;
    const guestProjects = readProjectRegistry(GUEST_PROJECTS_KEY);
    if (!guestProjects.length) return;
    let migrated = 0;
    for (const project of [...guestProjects]) {
      if (!project?.payload || !['visualization', 'calculation', 'pdf'].includes(project.type)) continue;
      try {
        const response = await fetch('/api/projects/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken() },
          body: JSON.stringify({ projectType: project.type, title: project.title || 'Без названия', status: project.status || 'active', payload: project.payload })
        });
        if (!response.ok) continue;
        const data = await response.json();
        const accountProjects = readProjects();
        const migratedProject = { ...project, serverId: data.project?.id || null, source: 'local', updatedAt: project.updatedAt || new Date().toISOString() };
        writeProjectRegistry(PROJECTS_KEY, [migratedProject, ...accountProjects.filter((item) => String(item.id) !== String(project.id))]);
        const remaining = readProjectRegistry(GUEST_PROJECTS_KEY).filter((item) => String(item.id) !== String(project.id));
        writeProjectRegistry(GUEST_PROJECTS_KEY, remaining);
        migrated += 1;
      } catch (_) { /* Проект останется в гостевом реестре для следующей попытки. */ }
    }
    if (migrated) showNotice(`Гостевые проекты перенесены в аккаунт: ${migrated}.`);
  }

  const navigationDialog = document.createElement('dialog');
  navigationDialog.className = 'unsaved-navigation-dialog';
  navigationDialog.innerHTML = '<div class="unsaved-navigation-icon">!</div><h2>Изменения ещё сохраняются</h2><p>Если перейти прямо сейчас, последние изменения могут не успеть сохраниться. Вы уверены, что хотите продолжить?</p><div><button class="button button-secondary" type="button" data-unsaved-stay>Остаться</button><button class="button button-primary" type="button" data-unsaved-leave>Перейти</button></div>';
  document.body.appendChild(navigationDialog);
  let pendingNavigation = '';
  let navigationApproved = false;

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-notice]');
    if (trigger) {
      event.preventDefault();
      showNotice(trigger.dataset.notice);
      return;
    }

    const link = event.target.closest('a[href]');
    if (!navigationApproved && link && !link.target && unsavedProjects.size > 0) {
      const url = new URL(link.href, window.location.href);
      if (url.origin === window.location.origin) {
        event.preventDefault();
        pendingNavigation = url.href;
        navigationDialog.showModal();
      }
    }

  });

  navigationDialog.querySelector('[data-unsaved-stay]')?.addEventListener('click', () => { pendingNavigation = ''; navigationDialog.close(); });
  navigationDialog.querySelector('[data-unsaved-leave]')?.addEventListener('click', () => {
    if (!pendingNavigation) return;
    navigationApproved = true;
    window.location.href = pendingNavigation;
  });

  window.addEventListener('tile-tools:auth-required', (event) => {
    showNotice(`Войдите в аккаунт для ${event.detail?.action || 'этого действия'}.`);
  });

  window.addEventListener('message', (event) => {
    if (event.source !== document.querySelector('.service-frame')?.contentWindow) return;
    if (event.data?.type === 'tile-tools:dirty-state') {
      const key = String(event.data.projectId || 'active-service');
      if (event.data.dirty) unsavedProjects.add(key); else unsavedProjects.delete(key);
      return;
    }
    if (event.data?.type === 'tile-tools:project-saved') {
      const project = storeProject(event.data.project);
      if (project) syncProject(project);
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (navigationApproved || unsavedProjects.size === 0) return;
    event.preventDefault();
    event.returnValue = '';
  });

  const serviceFrame = document.querySelector('.service-frame');
  const resumedProjectId = new URLSearchParams(window.location.search).get('project');
  if (serviceFrame) {
    serviceFrame.addEventListener('load', () => {
      let payload = null;
      if (resumedProjectId) {
        try { payload = JSON.parse(sessionStorage.getItem(`tile_tools_resume_${resumedProjectId}`) || 'null'); } catch (_) {}
        if (!payload) payload = readProjects().find((item) => String(item.id) === resumedProjectId || String(item.serverId) === resumedProjectId)?.payload || null;
      } else {
        const pageType = { visualizer: 'visualization', calculator: 'calculation', pdf: 'pdf' }[new URLSearchParams(window.location.search).get('page') || ''];
        const candidates = [...readProjects(), ...(accountUserId ? readProjectRegistry(GUEST_PROJECTS_KEY) : [])]
          .filter((item) => item.type === pageType && item.payload)
          .sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));
        payload = candidates[0]?.payload || null;
      }
      if (payload) serviceFrame.contentWindow?.postMessage({ type: 'tile-tools:resume-project', payload }, '*');
    });
  }
  if (accountUserId) readProjects().filter((project) => project.pendingSync && project.payload).forEach(syncProject);
  void migrateGuestProjects();
})();

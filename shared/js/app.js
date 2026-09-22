(() => {
  const PROJECTS_KEY = 'tile_tools_projects_v1';
  const projectSyncTimers = new Map();
  const readProjects = () => {
    try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]'); } catch (_) { return []; }
  };
  const storeProject = (incoming) => {
    if (!incoming || !['visualization', 'calculation', 'pdf'].includes(incoming.type) || !incoming.payload) return null;
    const id = String(incoming.id || `${incoming.type}-${Date.now()}`);
    const current = readProjects();
    const previous = current.find((item) => String(item.id) === id);
    const project = {
      ...previous,
      ...incoming,
      id,
      source: 'local',
      status: previous?.status || incoming.status || 'active',
      favorite: Boolean(previous?.favorite),
      updatedAt: incoming.updatedAt || new Date().toISOString()
    };
    localStorage.setItem(PROJECTS_KEY, JSON.stringify([project, ...current.filter((item) => String(item.id) !== id)].slice(0, 100)));
    return project;
  };
  const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content || '';
  const syncProject = (project) => {
    window.clearTimeout(projectSyncTimers.get(project.id));
    projectSyncTimers.set(project.id, window.setTimeout(async () => {
      const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken() };
      const body = { projectType: project.type, title: project.title, status: project.status, payload: project.payload };
      try {
        const response = project.serverId
          ? await fetch(`/api/projects/item.php?id=${encodeURIComponent(project.serverId)}`, { method: 'PATCH', headers, body: JSON.stringify(body) })
          : await fetch('/api/projects/', { method: 'POST', headers, body: JSON.stringify(body) });
        if (!response.ok) return;
        const data = await response.json();
        if (!project.serverId && data.project?.id) {
          const current = readProjects();
          const saved = current.find((item) => String(item.id) === project.id);
          if (saved) { saved.serverId = data.project.id; localStorage.setItem(PROJECTS_KEY, JSON.stringify(current)); }
        }
      } catch (_) { /* Offline and guest modes keep the local project. */ }
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

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-notice]');
    if (trigger) {
      event.preventDefault();
      showNotice(trigger.dataset.notice);
      return;
    }

    const favorite = event.target.closest('[data-favorite]');
    if (favorite) {
      const selected = favorite.getAttribute('aria-pressed') === 'true';
      favorite.setAttribute('aria-pressed', String(!selected));
      favorite.classList.toggle('is-favorite', !selected);
      favorite.textContent = selected ? '♡' : '♥';
      showNotice('Демо-интерфейс: после входа избранное синхронизируется с единым API.');
    }
  });

  window.addEventListener('message', (event) => {
    if (event.source !== document.querySelector('.service-frame')?.contentWindow) return;
    if (event.data?.type === 'tile-tools:project-saved') {
      const project = storeProject(event.data.project);
      if (project) syncProject(project);
    }
  });

  const serviceFrame = document.querySelector('.service-frame');
  const resumedProjectId = new URLSearchParams(window.location.search).get('project');
  if (serviceFrame && resumedProjectId) {
    serviceFrame.addEventListener('load', () => {
      let payload = null;
      try { payload = JSON.parse(sessionStorage.getItem(`tile_tools_resume_${resumedProjectId}`) || 'null'); } catch (_) {}
      if (!payload) payload = readProjects().find((item) => String(item.id) === resumedProjectId)?.payload || null;
      if (payload) serviceFrame.contentWindow?.postMessage({ type: 'tile-tools:resume-project', payload }, '*');
    });
  }
})();

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
    const requestedId = String(incoming.id || `${incoming.type}-${Date.now()}`);
    const current = readProjects();
    const previous = current.find((item) => String(item.id) === requestedId
      || (incoming.serverId && String(item.serverId || '') === String(incoming.serverId))
      || String(item.serverId || '') === requestedId);
    const id = String(previous?.id || requestedId);
    const syncVersion = (projectVersions.get(id) || 0) + 1;
    projectVersions.set(id, syncVersion);
    unsavedProjects.add(id);
    const project = {
      ...previous,
      ...incoming,
      id,
      serverId: incoming.serverId || previous?.serverId || null,
      source: 'local',
      status: incoming.status || previous?.status || 'active',
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

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-notice]');
    if (trigger) {
      event.preventDefault();
      showNotice(trigger.dataset.notice);
      return;
    }

    const menu = document.querySelector('[data-header-menu]');
    if (menu?.open && !event.target.closest('[data-header-menu]')) menu.open = false;
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

  const serviceFrame = document.querySelector('.service-frame');
  const serviceToolbarHost = document.querySelector('[data-service-toolbar]');
  const servicePage = ['visualizer', 'calculator', 'pdf'].find((name) => document.body.classList.contains(`page-${name}`));
  const toolbarConfigs = {
    visualizer: {
      selector: '.app-header',
      collapse: '.app-header{position:fixed!important;left:-200vw!important;top:0!important;width:100vw!important}.app-body{height:100vh!important;min-height:100vh!important}'
    },
    calculator: {
      selector: '.app-shell > .topbar',
      collapse: '.app-shell{grid-template-rows:minmax(0,1fr)!important}.app-shell>.topbar{position:fixed!important;left:-200vw!important;top:0!important;width:100vw!important}'
    },
    pdf: {
      selector: '.app-shell > .top-bar',
      collapse: '.app-shell>.top-bar{position:fixed!important;left:-200vw!important;top:0!important;width:100vw!important}.workspace{height:100vh!important;min-height:100vh!important}'
    }
  };

  function fitMirroredToolbar(toolbar) {
    if (!serviceToolbarHost || !toolbar?.isConnected) return;
    const availableWidth = Math.max(1, serviceToolbarHost.clientWidth - 4);
    toolbar.style.setProperty('zoom', '1');
    toolbar.style.setProperty('width', `${availableWidth}px`, 'important');
    toolbar.style.setProperty('min-width', `${availableWidth}px`, 'important');
    const naturalWidth = Math.max(toolbar.scrollWidth, toolbar.getBoundingClientRect().width);
    const scale = Math.min(1, availableWidth / Math.max(1, naturalWidth));
    const layoutWidth = availableWidth / Math.max(scale, 0.01);
    toolbar.style.setProperty('width', `${layoutWidth}px`, 'important');
    toolbar.style.setProperty('min-width', `${layoutWidth}px`, 'important');
    toolbar.style.setProperty('zoom', String(scale));
    toolbar.dataset.toolbarScale = scale.toFixed(3);
  }

  function mirrorServiceToolbar() {
    if (!serviceFrame || !serviceToolbarHost || !servicePage) return;
    const config = toolbarConfigs[servicePage];
    let frameDocument;
    try { frameDocument = serviceFrame.contentDocument; } catch (_) { return; }
    if (!frameDocument || !config) return;
    const sourceToolbar = frameDocument.querySelector(config.selector);
    if (!sourceToolbar) return;

    let collapseStyle = frameDocument.querySelector('#tile-tools-unified-toolbar');
    if (!collapseStyle) {
      collapseStyle = frameDocument.createElement('style');
      collapseStyle.id = 'tile-tools-unified-toolbar';
      collapseStyle.textContent = config.collapse;
      frameDocument.head.appendChild(collapseStyle);
    }

    const previousScroll = serviceToolbarHost.scrollLeft;
    const clone = sourceToolbar.cloneNode(true);
    clone.classList.add('mirrored-service-toolbar');
    clone.removeAttribute('id');
    const sourceNodes = [sourceToolbar, ...sourceToolbar.querySelectorAll('*')];
    const cloneNodes = [clone, ...clone.querySelectorAll('*')];
    const frameWindow = serviceFrame.contentWindow;
    sourceNodes.forEach((sourceNode, index) => {
      const cloneNode = cloneNodes[index];
      if (!sourceNode?.style || !cloneNode?.style) return;
      const computed = frameWindow.getComputedStyle(sourceNode);
      for (const property of computed) cloneNode.style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
    });

    const sourceControls = [...sourceToolbar.querySelectorAll('button,input,select,textarea,a')];
    const cloneControls = [...clone.querySelectorAll('button,input,select,textarea,a')];
    cloneControls.forEach((control, index) => {
      const source = sourceControls[index];
      if (!source) return;
      const tagName = control.tagName?.toLowerCase();
      if (tagName === 'a') {
        control.addEventListener('click', (event) => {
          event.preventDefault();
          source.click();
        });
        return;
      }
      if (tagName === 'button') {
        control.addEventListener('click', (event) => {
          event.preventDefault();
          source.click();
          window.setTimeout(mirrorServiceToolbar, 40);
        });
        return;
      }
      const forwardValue = (eventName) => {
        if ('checked' in source && 'checked' in control) source.checked = control.checked;
        source.value = control.value;
        source.dispatchEvent(new frameWindow.Event(eventName, { bubbles: true }));
        window.setTimeout(mirrorServiceToolbar, 30);
      };
      control.addEventListener('input', () => forwardValue('input'));
      control.addEventListener('change', () => forwardValue('change'));
    });

    serviceToolbarHost.replaceChildren(clone);
    serviceToolbarHost.hidden = false;
    serviceToolbarHost.scrollLeft = previousScroll;
    window.requestAnimationFrame(() => fitMirroredToolbar(clone));
  }

  const resumedProjectId = new URLSearchParams(window.location.search).get('project');
  if (serviceFrame) {
    window.addEventListener('resize', () => {
      const toolbar = serviceToolbarHost?.querySelector('.mirrored-service-toolbar');
      if (toolbar) window.requestAnimationFrame(() => fitMirroredToolbar(toolbar));
    });
    serviceFrame.addEventListener('load', () => {
      mirrorServiceToolbar();
      try {
        const frameDocument = serviceFrame.contentDocument;
        if (frameDocument?.body) {
          let toolbarRefreshTimer = 0;
          new MutationObserver(() => {
            window.clearTimeout(toolbarRefreshTimer);
            toolbarRefreshTimer = window.setTimeout(mirrorServiceToolbar, 60);
          }).observe(frameDocument.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled', 'aria-pressed', 'checked'] });
        }
      } catch (_) { /* При внешнем адресе сервис продолжит работать со своей панелью. */ }
      let payload = null;
      let resumedProject = null;
      if (resumedProjectId) {
        try { payload = JSON.parse(sessionStorage.getItem(`tile_tools_resume_${resumedProjectId}`) || 'null'); } catch (_) {}
        resumedProject = readProjects().find((item) => String(item.id) === resumedProjectId || String(item.serverId) === resumedProjectId) || null;
        if (!payload) payload = resumedProject?.payload || null;
      } else {
        const pageType = { visualizer: 'visualization', calculator: 'calculation', pdf: 'pdf' }[new URLSearchParams(window.location.search).get('page') || ''];
        const candidates = [...readProjects(), ...(accountUserId ? readProjectRegistry(GUEST_PROJECTS_KEY) : [])]
          .filter((item) => item.type === pageType && item.payload)
          .sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));
        resumedProject = candidates[0] || null;
        payload = resumedProject?.payload || null;
      }
      if (payload) serviceFrame.contentWindow?.postMessage({
        type: 'tile-tools:resume-project',
        payload,
        projectId: resumedProject?.id || resumedProjectId || null,
        serverId: resumedProject?.serverId || null,
        projectStatus: resumedProject?.status || 'active',
        resumedFromProjects: Boolean(resumedProjectId)
      }, '*');
    });
  }
  if (accountUserId) readProjects().filter((project) => project.pendingSync && project.payload).forEach(syncProject);
  void migrateGuestProjects();
})();

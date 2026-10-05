(() => {
  const root = document.querySelector('[data-favorites-page]');
  if (!root) return;

  const tabs = [...root.querySelectorAll('[data-favorites-tab]')];
  const panels = [...root.querySelectorAll('[data-favorites-panel]')];
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';

  function activate(type, updateHash = true) {
    const selectedTab = tabs.find((tab) => tab.dataset.favoritesTab === type) || tabs[0];
    if (!selectedTab) return;
    const selectedType = selectedTab.dataset.favoritesTab;
    tabs.forEach((tab) => {
      const active = tab === selectedTab;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => { panel.hidden = panel.dataset.favoritesPanel !== selectedType; });
    if (updateHash) history.replaceState(null, '', `#${selectedType}`);
  }

  const requestedType = window.location.hash.slice(1);
  const initial = tabs.some((tab) => tab.dataset.favoritesTab === requestedType)
    ? requestedType
    : (tabs.find((tab) => Number(tab.dataset.count) > 0)?.dataset.favoritesTab || 'tile');
  activate(initial, false);

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab.dataset.favoritesTab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(index + direction + tabs.length) % tabs.length];
      next.focus();
      activate(next.dataset.favoritesTab);
    });
  });

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-remove-favorite]');
    if (!button) return;
    button.disabled = true;
    try {
      const response = await fetch('/api/favorites/index.php', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrf, entityType: button.dataset.entityType, entityId: button.dataset.entityId })
      });
      if (!response.ok) throw new Error('favorite_delete_failed');

      const panel = button.closest('[data-favorites-panel]');
      const tab = tabs.find((item) => item.dataset.favoritesTab === panel?.dataset.favoritesPanel);
      button.closest('[data-favorite-row]')?.remove();
      const remaining = panel?.querySelectorAll('[data-favorite-row]').length || 0;
      panel?.querySelector('[data-panel-empty]')?.toggleAttribute('hidden', remaining !== 0);
      if (tab) {
        tab.dataset.count = String(remaining);
        const count = tab.querySelector('[data-tab-count]');
        if (count) count.textContent = String(remaining);
      }
      const total = root.querySelector('[data-favorites-total]');
      if (total) total.textContent = String(Math.max(0, Number(total.textContent) - 1));
    } catch (_) {
      button.disabled = false;
    }
  });
})();

(() => {
  const root = document.querySelector('[data-favorites-page]');
  if (!root) return;
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
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
      button.closest('[data-favorite-row]')?.remove();
      if (!root.querySelector('[data-favorite-row]')) window.location.reload();
    } catch (_) { button.disabled = false; }
  });
})();

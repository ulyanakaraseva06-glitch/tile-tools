(() => {
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
})();

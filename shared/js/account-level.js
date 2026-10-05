(() => {
  const confirmButton = document.querySelector('[data-feedback-confirm]');
  const mailLink = document.querySelector('[data-feedback-mail]');
  if (!confirmButton || !mailLink) return;

  mailLink.addEventListener('click', () => {
    confirmButton.hidden = false;
  });

  confirmButton.addEventListener('click', async () => {
    confirmButton.disabled = true;
    try {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
      const response = await fetch('/api/account/feedback.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ csrf })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload?.error?.message || 'Не удалось сохранить отметку.');
      window.location.reload();
    } catch (error) {
      confirmButton.disabled = false;
      const toast = document.getElementById('app-toast');
      if (toast) {
        toast.textContent = error.message;
        toast.hidden = false;
        window.setTimeout(() => { toast.hidden = true; }, 3500);
      }
    }
  });
})();

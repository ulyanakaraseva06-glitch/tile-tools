(() => {
  const dataNode = document.querySelector('#services-data');
  const dialog = document.querySelector('[data-service-dialog]');
  const dialogContent = document.querySelector('[data-service-dialog-content]');
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  let services = [];

  try {
    services = JSON.parse(dataNode?.textContent || '[]');
  } catch (_error) {
    services = [];
  }

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const showToast = (message) => {
    document.querySelector('.services-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'toast services-toast';
    toast.textContent = message;
    document.body.append(toast);
    window.setTimeout(() => toast.remove(), 4200);
  };

  const serviceOptions = (selectedId) => services.map((service) => (
    `<option value="${escapeHtml(service.id)}"${service.id === selectedId ? ' selected' : ''}>${escapeHtml(service.title)}</option>`
  )).join('');

  const openService = (serviceId) => {
    const service = services.find((item) => item.id === serviceId);
    if (!service || !dialog || !dialogContent) return;

    dialogContent.innerHTML = `
      <div class="service-dialog-layout">
        <div class="service-dialog-summary">
          <img src="${escapeHtml(service.image)}" alt="" loading="lazy">
          <p class="eyebrow">Vilray Studio</p>
          <h2>${escapeHtml(service.title)}</h2>
          <p>${escapeHtml(service.description)}</p>
          <strong>${escapeHtml(service.price)}</strong>
        </div>
        <form class="services-request-form" data-service-form>
          <h3>Оставить заявку</h3>
          <label>Услуга
            <select class="input" name="serviceId" required>${serviceOptions(service.id)}</select>
          </label>
          <label>Кратко опишите задачу
            <textarea class="input" name="message" rows="4" maxlength="5000" placeholder="Например: нужна визуализация новой коллекции"></textarea>
          </label>
          <label>Ваше имя
            <input class="input" name="name" minlength="2" maxlength="160" required autocomplete="name">
          </label>
          <label>Телефон, e-mail или Telegram
            <input class="input" name="contact" minlength="3" maxlength="255" required autocomplete="email">
          </label>
          <label class="services-consent"><input type="checkbox" required> <span>Согласен на обработку данных для связи по заявке</span></label>
          <button class="button button-primary" type="submit">Отправить запрос</button>
          <small class="services-form-note">Пока заявка только сохраняется в Tile Tools и никуда не отправляется.</small>
        </form>
      </div>`;

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  };

  document.addEventListener('click', (event) => {
    const filter = event.target.closest('[data-service-filter]');
    if (filter) {
      const category = filter.dataset.serviceFilter;
      document.querySelectorAll('[data-service-filter]').forEach((button) => button.classList.toggle('is-active', button === filter));
      document.querySelectorAll('[data-service-card]').forEach((card) => {
        card.hidden = category !== 'all' && card.dataset.serviceCategory !== category;
      });
      return;
    }

    const opener = event.target.closest('[data-service-open]');
    if (opener) {
      openService(opener.dataset.serviceOpen);
      return;
    }

    if (event.target.closest('[data-service-close]')) dialog?.close();
  });

  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-service-form]');
    if (!form) return;
    event.preventDefault();

    const submit = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const payload = {
      csrf,
      serviceId: formData.get('serviceId'),
      message: formData.get('message'),
      name: formData.get('name'),
      contact: formData.get('contact'),
    };

    submit.disabled = true;
    const originalText = submit.textContent;
    submit.textContent = 'Сохраняем…';

    try {
      const response = await fetch('/api/services/lead.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error?.message || 'Не удалось сохранить заявку.');

      form.reset();
      dialog?.close();
      showToast('Заявка сохранена. Пока она не отправляется во внешние сервисы.');
    } catch (error) {
      showToast(error.message || 'Не удалось сохранить заявку.');
    } finally {
      submit.disabled = false;
      submit.textContent = originalText;
    }
  });
})();

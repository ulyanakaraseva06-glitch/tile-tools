(() => {
  const root = document.querySelector('[data-about-page]');
  if (!root) return;
  const slides = [...root.querySelectorAll('[data-about-slide]')];
  const dots = [...root.querySelectorAll('[data-about-dot]')];
  const count = root.querySelector('[data-about-count]');
  let active = 0;
  const show = (index) => {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === active));
    dots.forEach((dot, i) => { dot.classList.toggle('is-active', i === active); dot.setAttribute('aria-selected', String(i === active)); });
    if (count) count.textContent = `${active + 1} / ${slides.length}`;
  };
  root.querySelector('[data-about-prev]')?.addEventListener('click', () => show(active - 1));
  root.querySelector('[data-about-next]')?.addEventListener('click', () => show(active + 1));
  dots.forEach((dot) => dot.addEventListener('click', () => show(Number(dot.dataset.aboutDot))));
})();

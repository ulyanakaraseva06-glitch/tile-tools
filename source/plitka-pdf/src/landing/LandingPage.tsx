import { useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  ImageIcon,
  LayoutTemplate,
  PackageCheck,
  PlayCircle,
  Presentation,
  Table2,
  UsersRound,
  WandSparkles
} from 'lucide-react';
import { track } from '../analytics/analyticsClient';
import { SiteInfoModal, type SiteInfoKind } from '../components/modals/SiteInfoModal';
import { resolvePublicAssetUrl } from '../utils/publicAsset';

const appUrl = '/app/';

const pains = [
  'Вместо разрозненных Excel, фото и скриншотов клиент получает единый PDF с понятной структурой.',
  'Менеджер быстрее готовит материалы после запроса и отправляет документ, который выглядит аккуратно.',
  'Готовые страницы сохраняют единый визуальный уровень без ручной верстки и сложных дизайн-инструментов.'
];

const audiences = [
  {
    icon: <Building2 size={21} />,
    title: 'Поставщикам и оптовикам',
    text: 'Для подготовки материалов дилерам, салонам и партнёрам: коллекции, условия, цены и контакты в одном файле.'
  },
  {
    icon: <UsersRound size={21} />,
    title: 'Менеджерам салонов',
    text: 'Для быстрых подборок после консультации: показать варианты, зафиксировать характеристики и отправить клиенту аккуратный PDF.'
  },
  {
    icon: <PackageCheck size={21} />,
    title: 'Производителям плитки',
    text: 'Для презентации коллекций, серий и SKU без отдельного дизайнера на каждую небольшую коммерческую задачу.'
  }
];

const steps = [
  'Откройте готовую структуру документа',
  'Заполните изображения, описания, цены и контакты',
  'Проверьте страницы перед отправкой клиенту',
  'Скачайте аккуратный PDF для сделки или рассылки'
];

const documentTypes = [
  {
    icon: <LayoutTemplate size={20} />,
    title: 'Мини-каталоги',
    text: 'Компактная презентация коллекции с обложкой, описанием, визуальными страницами и контактами.'
  },
  {
    icon: <Table2 size={20} />,
    title: 'Прайсы',
    text: 'Наглядные прайс-листы с изображениями, артикулами, форматами, количеством, ценами и итогами.'
  },
  {
    icon: <FileText size={20} />,
    title: 'Коммерческие предложения',
    text: 'Документы для переговоров: визуальная подача, расчет, условия поставки и данные менеджера.'
  },
  {
    icon: <ImageIcon size={20} />,
    title: 'Подборки для клиента',
    text: 'Материалы после консультации: интерьерные примеры, образцы плитки, пояснения и следующие шаги.'
  }
];

const services = [
  {
    icon: <WandSparkles size={20} />,
    title: 'Интерьерные визуализации',
    text: 'Фотореалистичная подача плитки, мебели, света и материалов для продаж и согласований.'
  },
  {
    icon: <Presentation size={20} />,
    title: 'Каталоги и презентации',
    text: 'Продуманные PDF, презентации и коммерческие материалы для производителей, дилеров и отделов продаж.'
  },
  {
    icon: <ExternalLink size={20} />,
    title: 'Сайты и лендинги',
    text: 'Спокойные современные страницы для продуктов, коллекций, услуг и B2B-направлений.'
  },
  {
    icon: <ClipboardList size={20} />,
    title: 'Цифровые сервисы',
    text: 'Рабочие веб-инструменты, калькуляторы, кабинеты и генераторы документов под конкретный бизнес-процесс.'
  }
];

export function LandingPage() {
  const [siteInfoKind, setSiteInfoKind] = useState<SiteInfoKind | null>(null);

  function trackLandingClick(eventName: string, target: string) {
    track(eventName, { target, path: window.location.pathname });
  }

  return (
    <div className="landing-shell">
      <header className="landing-nav" aria-label="Главная навигация">
        <a className="landing-brand" href="/" aria-label="Плитка PDF">
          <img src={resolvePublicAssetUrl('/brand/logo.webp')} alt="" />
          <span>
            <strong>Плитка PDF</strong>
            <small>от Vilray Studio</small>
          </span>
        </a>
        <nav className="landing-nav-links" aria-label="Разделы лендинга">
          <a href="#why">Зачем</a>
          <a href="#video">Видео</a>
          <button type="button" onClick={() => setSiteInfoKind('help')}>Помощь</button>
          <button type="button" onClick={() => setSiteInfoKind('about')}>О сервисе</button>
          <a href="#workflow" onClick={() => trackLandingClick('landing_how_it_works_click', 'nav_workflow')}>Как работает</a>
          <a href="#services" onClick={() => trackLandingClick('landing_ecosystem_click', 'nav_services')}>Сервисы</a>
          <a href="#vilray" onClick={() => trackLandingClick('landing_vilray_cta_click', 'nav_vilray')}>Vilray Studio</a>
        </nav>
        <a className="landing-nav-cta" href={appUrl} onClick={() => trackLandingClick('landing_cta_open_app_click', 'nav_cta')}>
          Открыть сервис
          <ArrowRight size={17} />
        </a>
      </header>

      <main>
        <section className="landing-hero">
          <img
            className="landing-hero-bg"
            src={resolvePublicAssetUrl('/placeholders/catalog/interior-4x3-dark-stone-v1.webp')}
            alt=""
          />
          <div className="landing-hero-shade" />
          <div className="landing-hero-inner">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">B2B-сервис для поставщиков, оптовиков и салонов плитки</p>
              <h1>Плитка PDF</h1>
              <p className="landing-lead">
                Собирайте аккуратные PDF-каталоги, прайсы, коммерческие предложения и
                клиентские подборки по плитке из готовых страниц за один рабочий сценарий.
              </p>
              <div className="landing-hero-actions">
                <a className="landing-btn landing-btn-primary" href={appUrl} onClick={() => trackLandingClick('landing_cta_open_app_click', 'hero_primary')}>
                  Открыть сервис
                  <ArrowRight size={18} />
                </a>
                <a className="landing-btn landing-btn-secondary" href="#workflow" onClick={() => trackLandingClick('landing_how_it_works_click', 'hero_secondary')}>
                  Как это работает
                </a>
              </div>
              <dl className="landing-hero-facts" aria-label="Ключевые особенности">
                <div>
                  <dt>Без регистрации</dt>
                  <dd>можно открыть сервис и сразу собрать документ</dd>
                </div>
                <div>
                  <dt>Готовые страницы</dt>
                  <dd>обложки, каталоги, прайсы, КП и контакты</dd>
                </div>
                <div>
                  <dt>Единый вид</dt>
                  <dd>материалы выглядят собранно и профессионально</dd>
                </div>
              </dl>
            </div>

            <div className="landing-document-preview" aria-label="Превью PDF-документов">
              <img className="preview-main" src={resolvePublicAssetUrl('/landing/app-screen-hero.webp')} alt="Интерфейс сервиса Плитка PDF" />
              <img className="preview-side" src={resolvePublicAssetUrl('/landing/app-screen-export.webp')} alt="Проверка PDF перед выгрузкой" />
              <img className="preview-bottom" src={resolvePublicAssetUrl('/landing/app-screen-cabinet.webp')} alt="Личный кабинет сервиса" />
              <img className="preview-modal" src={resolvePublicAssetUrl('/landing/app-screen-video.webp')} alt="Предпросмотр страницы в сервисе" />
              <img className="preview-detail" src={resolvePublicAssetUrl('/landing/app-screen-panel.webp')} alt="Панель настройки блока" />
            </div>
          </div>
        </section>

        <section className="landing-section landing-video-section" id="video">
          <div className="landing-section-inner landing-video-layout">
            <div className="landing-section-head">
              <span className="landing-section-kicker">Видео</span>
              <h2>Посмотрите, как из готовых страниц собирается документ для клиента</h2>
              <p>
                Короткая демонстрация показывает главный сценарий: выбрать структуру, заменить
                изображения и тексты, проверить страницы и выгрузить PDF без лишних настроек.
              </p>
              <div className="landing-inline-actions">
                <a className="landing-btn landing-btn-primary" href={appUrl} onClick={() => trackLandingClick('landing_cta_open_app_click', 'video_primary')}>
                  Открыть сервис
                  <ArrowRight size={18} />
                </a>
                <a className="landing-btn landing-btn-light" href="#workflow" onClick={() => trackLandingClick('landing_how_it_works_click', 'video_workflow')}>
                  Посмотреть сценарий
                </a>
              </div>
            </div>
            <div className="landing-video-showcase">
              <div className="landing-video-frame" aria-label="Видео о сервисе Плитка PDF">
                <img src={resolvePublicAssetUrl('/landing/app-screen-video.webp')} alt="" />
                <div className="landing-video-overlay">
                  <PlayCircle size={72} />
                  <span>Демонстрация сервиса</span>
                  <strong>От шаблона до готового PDF для клиента</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-section-light" id="why">
          <div className="landing-section-inner landing-two-column">
            <div>
              <span className="landing-section-kicker">Проблема рынка</span>
              <h2>Когда клиент ждёт материалы сегодня, документ должен собираться быстро и выглядеть достойно</h2>
            </div>
            <div className="landing-check-list">
              {pains.map((item) => (
                <div className="landing-check-item" key={item}>
                  <CheckCircle2 size={19} />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-inner">
            <div className="landing-section-head">
              <span className="landing-section-kicker">Для кого</span>
              <h2>Сервис подходит тем, кто регулярно отправляет плиточные материалы клиентам и партнёрам</h2>
            </div>
            <div className="landing-card-grid landing-card-grid-three">
              {audiences.map((item) => (
                <article className="landing-card" key={item.title}>
                  <div className="landing-card-icon">{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section-muted" id="workflow">
          <div className="landing-section-inner landing-workflow">
            <div className="landing-section-head">
              <span className="landing-section-kicker">Сценарий</span>
              <h2>Понятный процесс: готовая структура, редактирование зон и финальная проверка</h2>
            </div>
            <ol className="landing-steps">
              {steps.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-inner">
            <div className="landing-section-head">
              <span className="landing-section-kicker">Форматы документов</span>
              <h2>Один рабочий стол закрывает основные PDF-материалы по плитке</h2>
            </div>
            <div className="landing-card-grid landing-card-grid-four">
              {documentTypes.map((item) => (
                <article className="landing-card landing-card-compact" key={item.title}>
                  <div className="landing-card-icon">{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-vilray" id="vilray">
          <div className="landing-section-inner landing-vilray-inner">
            <div>
              <span className="landing-section-kicker">Vilray Studio</span>
              <h2>Если нужен материал под ключ, Vilray Studio помогает довести подачу до коммерческого уровня</h2>
              <p>
                Мы работаем с компаниями из сферы дома, ремонта и отделочных материалов:
                создаём интерьерные визуализации, каталоги, презентации, сайты и цифровые
                инструменты, которые помогают продавать продукт понятнее и спокойнее.
              </p>
              <div className="landing-inline-actions">
                <a className="landing-btn landing-btn-primary" href="#services" onClick={() => trackLandingClick('landing_ecosystem_click', 'vilray_services')}>
                  Посмотреть услуги
                  <ArrowRight size={18} />
                </a>
                <a className="landing-btn landing-btn-secondary" href={appUrl} onClick={() => trackLandingClick('landing_cta_open_app_click', 'vilray_open_app')}>
                  Открыть сервис
                </a>
              </div>
            </div>
            <img src={resolvePublicAssetUrl('/placeholders/catalog/interior-16x9-living-stone-v2.webp')} alt="Интерьер с плиткой" />
          </div>
        </section>

        <section className="landing-section landing-section-muted" id="services">
          <div className="landing-section-inner">
            <div className="landing-section-head">
              <span className="landing-section-kicker">Другие сервисы</span>
              <h2>Плитка PDF — часть подхода Vilray Studio к визуальным и цифровым продажам</h2>
              <p>
                Если бизнесу нужен не только быстрый PDF, можно выстроить всю цепочку подачи:
                от изображений и каталогов до лендингов, презентаций и рабочих онлайн-инструментов.
              </p>
            </div>
            <div className="landing-card-grid landing-card-grid-four">
              {services.map((item) => (
                <article className="landing-card landing-card-compact" key={item.title}>
                  <div className="landing-card-icon">{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <a className="landing-card-link" href="#vilray" onClick={() => trackLandingClick('landing_vilray_cta_click', item.title)}>
                    Подробнее
                    <ArrowRight size={15} />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-final">
          <div className="landing-final-inner">
            <div className="landing-final-copy">
              <h2>Откройте сервис и соберите первый PDF на готовом шаблоне</h2>
              <p>Начните с готовой структуры, замените данные под свою коллекцию и скачайте документ, который можно отправить клиенту или партнёру.</p>
              <a className="landing-btn landing-btn-primary" href={appUrl} onClick={() => trackLandingClick('landing_cta_open_app_click', 'final_cta')}>
                Перейти в Плитка PDF
                <ArrowRight size={18} />
              </a>
            </div>
            <img
              className="landing-final-image"
              src={resolvePublicAssetUrl('/placeholders/catalog/interior-16x9-warm-stone-v1.webp')}
              alt="Интерьер с плиткой"
            />
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <a className="landing-brand" href="/" aria-label="Плитка PDF">
            <img src={resolvePublicAssetUrl('/brand/logo.webp')} alt="" />
            <span>
              <strong>Плитка PDF</strong>
              <small>от Vilray Studio</small>
            </span>
          </a>
          <nav aria-label="Навигация в подвале">
            <a href="#why">Зачем</a>
            <a href="#video">Видео</a>
            <button type="button" onClick={() => setSiteInfoKind('help')}>Помощь</button>
            <button type="button" onClick={() => setSiteInfoKind('about')}>О сервисе</button>
            <a href="#services" onClick={() => trackLandingClick('landing_ecosystem_click', 'footer_services')}>Сервисы</a>
            <a href="/terms/">Условия</a>
            <a href="/privacy/">Конфиденциальность</a>
            <a href={appUrl} onClick={() => trackLandingClick('landing_cta_open_app_click', 'footer_open_app')}>Открыть сервис</a>
          </nav>
          <p>Рабочий инструмент для PDF-каталогов, прайсов, КП и подборок по плитке.</p>
        </div>
      </footer>

      {siteInfoKind && (
        <SiteInfoModal kind={siteInfoKind} onClose={() => setSiteInfoKind(null)} />
      )}
    </div>
  );
}

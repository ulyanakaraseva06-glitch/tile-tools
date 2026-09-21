import { ArrowLeft, ArrowRight } from 'lucide-react';
import { legalDocuments } from './legalContent';

type LegalPageProps = {
  kind: 'terms' | 'privacy';
};

export function LegalPage({ kind }: LegalPageProps) {
  const document = legalDocuments[kind];

  return (
    <div className="legal-page-shell">
      <header className="legal-page-header">
        <a className="legal-back-link" href="/">
          <ArrowLeft size={16} />
          На главную
        </a>
        <a className="legal-open-link" href="/app/">
          Открыть сервис
          <ArrowRight size={16} />
        </a>
      </header>

      <main className="legal-page-card">
        <p className="legal-page-kicker">{document.eyebrow}</p>
        <h1>{document.title}</h1>
        <p className="legal-page-lead">{document.description}</p>
        <p className="legal-page-meta">Дата публикации: {document.publishedAt} · Контакт: info@vilraystudio.ru</p>

        <div className="legal-page-content">
          {document.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets?.length ? (
                <ul>
                  {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

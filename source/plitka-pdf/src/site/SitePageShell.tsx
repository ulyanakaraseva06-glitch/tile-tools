import { ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type SitePageShellProps = {
  eyebrow: string;
  title: string;
  lead: string;
  children: ReactNode;
  wide?: boolean;
};

export function SitePageShell({ eyebrow, title, lead, children, wide }: SitePageShellProps) {
  return (
    <div className={`site-page-shell ${wide ? 'wide' : ''}`}>
      <header className="site-page-header">
        <a className="site-back-link" href="/">
          <ArrowLeft size={16} />
          На главную
        </a>
        <nav className="site-page-nav" aria-label="Страницы сервиса">
          <a href="/help/">Помощь</a>
          <a href="/about/">О сервисе</a>
          <a className="site-open-link" href="/app/">
            Открыть сервис
            <ArrowRight size={16} />
          </a>
        </nav>
      </header>

      <main className="site-page-card">
        <p className="site-page-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="site-page-lead">{lead}</p>
        {children}
      </main>
    </div>
  );
}

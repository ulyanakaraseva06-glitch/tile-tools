import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { pageContextProperties, track } from '../../analytics/analyticsClient';
import { AboutInfo } from '../../site/AboutInfo';
import { aboutPageMeta } from '../../site/aboutContent';
import { HelpGuide } from '../../site/HelpGuide';
import { helpPageMeta } from '../../site/helpContent';

export type SiteInfoKind = 'help' | 'about';

type SiteInfoModalProps = {
  kind: SiteInfoKind;
  onClose: () => void;
};

const copy = {
  help: helpPageMeta,
  about: aboutPageMeta
} as const;

export function SiteInfoModal({ kind, onClose }: SiteInfoModalProps) {
  const meta = copy[kind];

  useEffect(() => {
    track(kind === 'about' ? 'about_view' : 'help_view', pageContextProperties());
  }, [kind]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop site-info-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`site-info-modal site-info-modal-${kind}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-info-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="close-btn" type="button" onClick={onClose} title="Закрыть" aria-label="Закрыть">
          <X size={20} />
        </button>
        <header className="site-info-modal-header">
          <span>{meta.eyebrow}</span>
          <h2 id="site-info-modal-title">{meta.title}</h2>
          <p>{meta.lead}</p>
        </header>
        <div className="site-info-modal-content">
          {kind === 'help' ? <HelpGuide /> : <AboutInfo />}
        </div>
      </section>
    </div>,
    document.body
  );
}

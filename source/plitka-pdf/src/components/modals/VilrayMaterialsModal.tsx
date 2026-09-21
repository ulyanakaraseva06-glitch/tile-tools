import { useEffect } from 'react';
import { ArrowRight, CheckCircle2, Sparkles, X } from 'lucide-react';
import { track } from '../../analytics/analyticsClient';
import { getVilrayPromoById, type VilrayPromoId } from '../../data/vilrayPromos';

type VilrayMaterialsModalProps = {
  variantId: VilrayPromoId;
  onClose: () => void;
};

export function VilrayMaterialsModal({ variantId, onClose }: VilrayMaterialsModalProps) {
  const promo = getVilrayPromoById(variantId);
  const mailSubject = encodeURIComponent(`Заявка Vilray Studio: ${promo.eyebrow}`);
  const mailHref = `mailto:info@vilraystudio.ru?subject=${mailSubject}`;

  useEffect(() => {
    track('vilray_request_form_opened', { placement: 'vilray_materials_modal', variantId: promo.id });
  }, [promo.id]);

  function handlePrimaryClick() {
    track('vilray_cta_clicked', {
      placement: 'vilray_materials_modal',
      source: 'modal_primary',
      variantId: promo.id
    });
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <section className={`vilray-materials-modal vilray-promo-${promo.accent}`} onClick={(event) => event.stopPropagation()}>
        <button className="close-btn" onClick={onClose} title="Закрыть"><X size={22} /></button>

        <div className="modal-title vilray-modal-title">
          <span>{promo.eyebrow}</span>
          <h2>{promo.modalTitle}</h2>
          <p>{promo.modalLead}</p>
        </div>

        <div className="vilray-modal-hero">
          <div>
            <span className="vilray-modal-pill"><Sparkles size={15} /> Vilray Studio</span>
            <strong>{promo.scenarioTitle}</strong>
            <p>{promo.scenarioText}</p>
          </div>
          <a className="btn btn-export-soft" href={mailHref} onClick={handlePrimaryClick}>
            Обсудить задачу <ArrowRight size={16} />
          </a>
        </div>

        <div className="vilray-materials-grid vilray-modal-benefits">
          {promo.benefits.map((benefit, index) => (
            <article key={`${promo.id}-benefit-${index}`}>
              <span><CheckCircle2 size={19} /></span>
              <strong>{benefit}</strong>
            </article>
          ))}
        </div>

        <section className="vilray-modal-results">
          <div className="vilray-modal-section-title">
            <span>Что получите</span>
            <strong>Готовый материал для продаж, сайта или консультаций</strong>
          </div>
          <div className="vilray-result-list">
            {promo.resultItems.map((item, index) => (
              <span key={`${promo.id}-result-${index}`}>{item}</span>
            ))}
          </div>
        </section>

        <div className="modal-actions">
          <a className="btn btn-export-soft" href={mailHref} onClick={handlePrimaryClick}>
            {promo.buttonLabel}
          </a>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Закрыть</button>
        </div>
      </section>
    </div>
  );
}

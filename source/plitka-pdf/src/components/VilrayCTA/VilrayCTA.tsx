import { useEffect, useState } from 'react';
import { track } from '../../analytics/analyticsClient';
import { getNextVilrayPromoVariant, type VilrayPromoId } from '../../data/vilrayPromos';

type VilrayCTAProps = {
  placement: 'right_panel';
  onOpenMaterials: (variantId: VilrayPromoId) => void;
};

export function VilrayCTA({ placement, onOpenMaterials }: VilrayCTAProps) {
  const [promo] = useState(() => getNextVilrayPromoVariant());

  useEffect(() => {
    track('vilray_cta_viewed', { placement, variantId: promo.id });
  }, [placement, promo.id]);

  return (
    <section className={`vilray-cta vilray-promo-${promo.accent}`}>
      <span className="vilray-promo-kicker">{promo.eyebrow}</span>
      <strong>{promo.title}</strong>
      <p>{promo.description}</p>
      <button className="btn btn-export-soft full" type="button" onClick={() => onOpenMaterials(promo.id)}>
        {promo.buttonLabel}
      </button>
    </section>
  );
}

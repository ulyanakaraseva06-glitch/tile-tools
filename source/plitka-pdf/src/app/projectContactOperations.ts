import { CompanyProfile, IconZone, ImageZone, Page, Project } from '../types/project';

export const CONTACT_PROFILE_FIELDS = ['companyName', 'managerName', 'phone', 'messenger', 'email', 'website', 'address'] as const satisfies readonly (keyof CompanyProfile)[];

function contactMarker(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export function updateContactIconZone(zone: IconZone, profile: CompanyProfile): IconZone {
  const updateValue = (entry: NonNullable<IconZone['items']>[number]) => {
    const marker = contactMarker(entry.id, entry.iconId, entry.label);
    if (marker.includes('phone') || marker.includes('С‚РµР»РµС„РѕРЅ')) return { ...entry, value: profile.phone };
    if (marker.includes('email') || marker.includes('mail')) return { ...entry, value: profile.email };
    if (marker.includes('messenger') || marker.includes('telegram') || marker.includes('whatsapp') || marker.includes('РјРµСЃСЃРµРЅРґР¶РµСЂ')) {
      return { ...entry, value: profile.messenger };
    }
    if (marker.includes('site') || marker.includes('website') || marker.includes('СЃР°Р№С‚')) return { ...entry, value: profile.website };
    return entry;
  };

  if (zone.mode === 'row' || zone.items?.length) {
    return { ...zone, items: (zone.items ?? []).map(updateValue) };
  }

  const marker = contactMarker(zone.id, zone.iconId, zone.caption, zone.label);
  if (marker.includes('phone') || marker.includes('С‚РµР»РµС„РѕРЅ')) return { ...zone, value: profile.phone };
  if (marker.includes('email') || marker.includes('mail')) return { ...zone, value: profile.email };
  if (marker.includes('messenger') || marker.includes('telegram') || marker.includes('whatsapp') || marker.includes('РјРµСЃСЃРµРЅРґР¶РµСЂ')) {
    return { ...zone, value: profile.messenger };
  }
  if (marker.includes('site') || marker.includes('website') || marker.includes('СЃР°Р№С‚')) return { ...zone, value: profile.website };
  return zone;
}

export function updateContactZones(
  zones: Page['zones'],
  profile: CompanyProfile,
  fields: readonly (keyof CompanyProfile)[] = CONTACT_PROFILE_FIELDS
): Page['zones'] {
  const nextZones: Page['zones'] = {};
  let hasLogoZone = false;

  Object.entries(zones).forEach(([id, zone]) => {
    if (zone.kind === 'text' && fields.includes(id as keyof CompanyProfile)) {
      const value = profile[id as keyof CompanyProfile];
      nextZones[id] = { ...zone, value: typeof value === 'string' ? value : zone.value };
      return;
    }

    if (zone.kind === 'image' && id.toLowerCase().includes('logo')) {
      hasLogoZone = true;
      nextZones[id] = profile.logoSrc
        ? { ...zone, src: profile.logoSrc, alt: `${profile.companyName} logo`, visible: true }
        : zone;
      return;
    }

    if (zone.kind === 'icon') {
      nextZones[id] = updateContactIconZone(zone, profile);
      return;
    }

    nextZones[id] = zone;
  });

  if (profile.logoSrc && !hasLogoZone) {
    const logoZone: ImageZone = {
      id: 'logo',
      kind: 'image',
      label: 'Р›РѕРіРѕС‚РёРї',
      src: profile.logoSrc,
      alt: `${profile.companyName} logo`,
      imageRole: 'decorative',
      aspectRatio: '2:1',
      fit: 'contain',
      visible: true,
      layout: { x: 82, y: 2.0, w: 11, h: 5.2 },
      style: { backgroundColor: 'transparent', borderRadius: 0 }
    };
    nextZones.logo = logoZone;
  }

  return nextZones;
}

export function applyCompanyProfileToProject(source: Project, profile: CompanyProfile): Project {
  return {
    ...source,
    companyProfile: profile,
    pages: source.pages.map((page) => ({
      ...page,
      zones: updateContactZones(page.zones, profile)
    }))
  };
}

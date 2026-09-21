import { describe, expect, it } from 'vitest';
import { CompanyProfile, Project } from '../types/project';
import { applyCompanyProfileToProject, updateContactIconZone, updateContactZones } from './projectContactOperations';

const profile: CompanyProfile = {
  companyName: 'Vilray Studio',
  managerName: 'Анна',
  phone: '+7 900 000-00-00',
  messenger: '@vilray',
  email: 'info@vilraystudio.ru',
  website: 'vilraystudio.ru',
  address: 'Москва',
  logoSrc: 'data:image/png;base64,logo'
};

function createProject(): Project {
  return {
    id: 'project_1',
    title: 'Project',
    preset: 'empty',
    pageFormat: 'a4_portrait',
    documentTheme: 'light',
    documentAccent: 'purple',
    documentTextPalette: 'classic',
    showLogos: false,
    showPageNumbers: true,
    showDividers: true,
    theme: { mode: 'light', accent: 'purple' },
    pages: [
      {
        id: 'page_1',
        templateId: 'cover_catalog_hero',
        title: 'Page 1',
        order: 0,
        zones: {
          companyName: {
            id: 'companyName',
            kind: 'text',
            label: 'Компания',
            value: '',
            layout: { x: 0, y: 0, w: 10, h: 5 }
          },
          email: {
            id: 'email',
            kind: 'text',
            label: 'Email',
            value: '',
            layout: { x: 0, y: 5, w: 10, h: 5 }
          },
          phoneIcon: {
            id: 'phoneIcon',
            kind: 'icon',
            label: 'Телефон',
            iconId: 'phone',
            value: '',
            layout: { x: 10, y: 0, w: 5, h: 5 }
          },
          contactRow: {
            id: 'contactRow',
            kind: 'icon',
            label: 'Контакты',
            mode: 'row',
            items: [
              { id: 'phone', iconId: 'phone', value: '' },
              { id: 'email', iconId: 'mail', value: '' },
              { id: 'website', iconId: 'globe', label: 'Website', value: '' }
            ],
            layout: { x: 10, y: 5, w: 10, h: 5 }
          }
        }
      }
    ],
    mediaAssets: [],
    companyProfile: {
      companyName: '',
      managerName: '',
      phone: '',
      messenger: '',
      email: '',
      website: '',
      address: ''
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

describe('projectContactOperations', () => {
  it('updates icon zones from profile values', () => {
    const updated = updateContactIconZone({
      id: 'contactRow',
      kind: 'icon',
      label: 'Контакты',
      mode: 'row',
      items: [
        { id: 'phone', iconId: 'phone', value: '' },
        { id: 'email', iconId: 'mail', value: '' },
        { id: 'messenger', iconId: 'message-circle', value: '' }
      ],
      layout: { x: 0, y: 0, w: 10, h: 5 }
    }, profile);

    expect(updated.items?.map((item) => item.value)).toEqual([
      profile.phone,
      profile.email,
      profile.messenger
    ]);
  });

  it('updates contact text zones and appends a logo zone when needed', () => {
    const project = createProject();
    const nextZones = updateContactZones(project.pages[0].zones, profile);

    expect(nextZones.companyName.kind).toBe('text');
    if (nextZones.companyName.kind !== 'text') {
      throw new Error('Expected text zone');
    }
    expect(nextZones.companyName.value).toBe(profile.companyName);
    expect(nextZones.email.kind).toBe('text');
    if (nextZones.email.kind !== 'text') {
      throw new Error('Expected text zone');
    }
    expect(nextZones.email.value).toBe(profile.email);
    expect(nextZones.logo.kind).toBe('image');
    if (nextZones.logo.kind !== 'image') {
      throw new Error('Expected image zone');
    }
    expect(nextZones.logo.src).toBe(profile.logoSrc);
  });

  it('applies the local profile to every project page', () => {
    const project = createProject();
    const nextProject = applyCompanyProfileToProject(project, profile);
    const nextPage = nextProject.pages[0];

    expect(nextProject.companyProfile).toBe(profile);
    expect(nextPage.zones.companyName.kind).toBe('text');
    if (nextPage.zones.companyName.kind !== 'text') {
      throw new Error('Expected text zone');
    }
    expect(nextPage.zones.companyName.value).toBe(profile.companyName);
    expect(nextPage.zones.phoneIcon.kind).toBe('icon');
    if (nextPage.zones.phoneIcon.kind !== 'icon') {
      throw new Error('Expected icon zone');
    }
    expect(nextPage.zones.phoneIcon.value).toBe(profile.phone);
  });
});

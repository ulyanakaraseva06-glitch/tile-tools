import { Accent, ThemeMode } from '../types/project';

export type DocumentSchemeId = 'classic' | 'premium_graphite' | 'warm_catalog' | 'minimal' | 'dealer';

export type DocumentScheme = {
  id: DocumentSchemeId;
  label: string;
  documentTheme: ThemeMode;
  documentAccent: Accent;
  documentTextPrimaryColor: string;
  documentTextSecondaryColor: string;
  showLogos: boolean;
  showPageNumbers: boolean;
};

export const documentSchemes: DocumentScheme[] = [
  {
    id: 'classic',
    label: 'Классика',
    documentTheme: 'light',
    documentAccent: 'purple',
    documentTextPrimaryColor: '#1f2227',
    documentTextSecondaryColor: '#8a8d8f',
    showLogos: true,
    showPageNumbers: true
  },
  {
    id: 'premium_graphite',
    label: 'Премиум графит',
    documentTheme: 'dark',
    documentAccent: 'gold',
    documentTextPrimaryColor: '#f7f2ea',
    documentTextSecondaryColor: '#c9c9d2',
    showLogos: true,
    showPageNumbers: false
  },
  {
    id: 'warm_catalog',
    label: 'Тёплый каталог',
    documentTheme: 'beige',
    documentAccent: 'beige',
    documentTextPrimaryColor: '#2f3338',
    documentTextSecondaryColor: '#8f5f3b',
    showLogos: true,
    showPageNumbers: true
  },
  {
    id: 'minimal',
    label: 'Минимализм',
    documentTheme: 'light',
    documentAccent: 'graphite',
    documentTextPrimaryColor: '#050505',
    documentTextSecondaryColor: '#8a8d8f',
    showLogos: false,
    showPageNumbers: true
  },
  {
    id: 'dealer',
    label: 'Дилерский',
    documentTheme: 'light',
    documentAccent: 'blueGray',
    documentTextPrimaryColor: '#2f3338',
    documentTextSecondaryColor: '#6e8aa1',
    showLogos: true,
    showPageNumbers: true
  }
];

export function getDocumentScheme(id?: string) {
  return documentSchemes.find((scheme) => scheme.id === id) ?? documentSchemes[0];
}

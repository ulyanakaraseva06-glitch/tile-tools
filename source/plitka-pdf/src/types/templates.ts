import { EditableZone } from './project';

export type LibraryStatus = 'core' | 'legacy' | 'hidden';
export type LibrarySection = 'cover' | 'overview' | 'grid' | 'interior' | 'specs' | 'table' | 'price' | 'contacts';
export type LibraryAudience = 'brand' | 'dealer' | 'client';

export type PageCategory =
  | 'cover'
  | 'description'
  | 'table'
  | 'catalog'
  | 'catalog_overview'
  | 'catalog_grid'
  | 'catalog_interior'
  | 'catalog_visual_focus'
  | 'catalog_specs'
  | 'catalog_moodboard'
  | 'price'
  | 'offer'
  | 'contacts';

export type PageTemplate = {
  id: string;
  category: PageCategory;
  title: string;
  description: string;
  thumbnail: string;
  defaultZones: Record<string, EditableZone>;
  libraryStatus?: LibraryStatus;
  librarySection?: LibrarySection;
  audiences?: LibraryAudience[];
};

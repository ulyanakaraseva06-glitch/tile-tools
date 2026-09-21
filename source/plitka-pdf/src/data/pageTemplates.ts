import { PageTemplate, LibraryAudience, LibrarySection, LibraryStatus } from '../types/templates';
import { coverTemplates } from './pageTemplates/cover';
import { catalogOverviewTemplates } from './pageTemplates/catalogOverview';
import { catalogGridTemplates } from './pageTemplates/catalogGrid';
import { catalogInteriorTemplates } from './pageTemplates/catalogInterior';
import { catalogVisualFocusTemplates } from './pageTemplates/catalogVisualFocus';
import { catalogSpecsTemplates } from './pageTemplates/catalogSpecs';
import { catalogMoodboardTemplates } from './pageTemplates/catalogMoodboard';
import { catalogOutdoorTemplates } from './pageTemplates/catalogOutdoor';
import { catalogSlabTemplates } from './pageTemplates/catalogSlab';
import { catalogWoodTemplates } from './pageTemplates/catalogWood';
import { catalogEditorialTemplates } from './pageTemplates/catalogEditorial';
import { tableTemplates } from './pageTemplates/table';
import { priceTemplates } from './pageTemplates/price';
import { contactsTemplates } from './pageTemplates/contacts';
import { referenceDerivedTemplates } from './pageTemplates/referenceDerived';

const allTemplateRegistry = new Map(
  [
    ...coverTemplates,
    ...catalogOverviewTemplates,
    ...catalogGridTemplates,
    ...catalogInteriorTemplates,
    ...catalogVisualFocusTemplates,
    ...catalogSpecsTemplates,
    ...catalogMoodboardTemplates,
    ...catalogOutdoorTemplates,
    ...catalogSlabTemplates,
    ...catalogWoodTemplates,
    ...catalogEditorialTemplates,
    ...tableTemplates,
    ...priceTemplates,
    ...contactsTemplates,
    ...referenceDerivedTemplates
  ].map((template) => [template.id, template] as const)
);

const coreTemplateIds = new Set<string>([
  'cover_reference_year_statement',
  'cover_architectural_catalog',
  'cover_catalog_hero',
  'cover_materials_intro',
  'catalog_series_overview',
  'catalog_collection_story',
  'catalog_collection_comparison',
  'catalog_reference_material_bands',
  'catalog_reference_color_story',
  'catalog_sku_family_table',
  'catalog_product_rows',
  'catalog_product_cards_6',
  'catalog_standard_range_page',
  'catalog_cross_sell_companions',
  'catalog_product_grid_9',
  'catalog_product_hero',
  'catalog_reference_room_palette',
  'catalog_reference_dual_scene',
  'catalog_reference_outdoor_story',
  'catalog_split_scene_tile_table',
  'catalog_two_interiors_two_tiles',
  'catalog_project_case',
  'catalog_format_comparison',
  'catalog_surface_finish_detail',
  'catalog_application_spec',
  'catalog_reference_outdoor_system',
  'catalog_outdoor_collection_scene',
  'catalog_outdoor_copy_column',
  'catalog_outdoor_dual_scene',
  'catalog_outdoor_sku_quad',
  'catalog_outdoor_sku_mixed',
  'catalog_outdoor_sku_planks',
  'catalog_outdoor_install_cards',
  'catalog_outdoor_install_guide',
  'catalog_slab_statement_cover',
  'catalog_slab_origin_formats',
  'catalog_slab_tone_scale',
  'catalog_slab_bookmatch',
  'catalog_slab_wet_interior',
  'catalog_slab_thickness_trio',
  'catalog_slab_finish_row',
  'catalog_slab_format_ladder',
  'catalog_slab_architecture',
  'catalog_wood_opener',
  'catalog_wood_tone_story',
  'catalog_wood_full_scene',
  'catalog_wood_surface_split',
  'catalog_wood_plank_row',
  'catalog_wood_herringbone',
  'catalog_wood_companions',
  'catalog_wood_grain_macro',
  'catalog_wood_usage_icons',
  'catalog_editorial_chapter',
  'catalog_editorial_quote',
  'catalog_editorial_dual_lifestyle',
  'catalog_editorial_collage',
  'catalog_editorial_index',
  'catalog_editorial_palette_ribbon',
  'catalog_editorial_side_caption',
  'catalog_editorial_project_case',
  'catalog_editorial_next_step',
  'catalog_brand_technology_story',
  'table_collection_technical_sheet',
  'table_packaging_price_matrix',
  'price_visual_quote',
  'price_summary_offer',
  'price_room_estimate',
  'contacts_next_step',
  'contacts_manager_card'
]);

const legacyTemplateIds = new Set<string>([
  'catalog_reference_dark_index',
  'catalog_interior_two_large_tiles',
  'catalog_full_interior_slab_specs'
]);

const hiddenTemplateIds = new Set<string>([
  'catalog_color_variants_matrix',
  'catalog_collection_index',
  'cover_dark_statement',
  'catalog_installation_patterns',
  'catalog_moodboard_modern',
  'catalog_interior_sku_spread',
  'catalog_interior_products_split',
  'catalog_image_product_pair',
  'catalog_image_two_products',
  'catalog_interiors_gallery',
  'catalog_interior_large_tile_focus',
  'catalog_two_interiors_large_tile',
  'catalog_product_grid_12',
  'catalog_scene_companion_products',
  'catalog_vertical_room_slab',
  'table_technical_icons',
  'table_surface_usage_icons',
  'table_specification_dense',
  'table_logistics_packaging',
  'contacts_qr_placeholder'
]);

const visibleTemplateIds = new Set<string>(coreTemplateIds);

const allTemplateIds = [
  'cover_reference_year_statement',
  'cover_architectural_catalog',
  'cover_catalog_hero',
  'cover_materials_intro',
  'cover_dark_statement',
  'catalog_reference_material_bands',
  'catalog_reference_room_palette',
  'catalog_reference_dual_scene',
  'catalog_reference_color_story',
  'catalog_reference_outdoor_story',
  'catalog_reference_outdoor_system',
  'catalog_outdoor_collection_scene',
  'catalog_outdoor_copy_column',
  'catalog_outdoor_dual_scene',
  'catalog_outdoor_sku_quad',
  'catalog_outdoor_sku_mixed',
  'catalog_outdoor_sku_planks',
  'catalog_outdoor_install_cards',
  'catalog_outdoor_install_guide',
  'catalog_slab_statement_cover',
  'catalog_slab_origin_formats',
  'catalog_slab_tone_scale',
  'catalog_slab_bookmatch',
  'catalog_slab_wet_interior',
  'catalog_slab_thickness_trio',
  'catalog_slab_finish_row',
  'catalog_slab_format_ladder',
  'catalog_slab_architecture',
  'catalog_wood_opener',
  'catalog_wood_tone_story',
  'catalog_wood_full_scene',
  'catalog_wood_surface_split',
  'catalog_wood_plank_row',
  'catalog_wood_herringbone',
  'catalog_wood_companions',
  'catalog_wood_grain_macro',
  'catalog_wood_usage_icons',
  'catalog_editorial_chapter',
  'catalog_editorial_quote',
  'catalog_editorial_dual_lifestyle',
  'catalog_editorial_collage',
  'catalog_editorial_index',
  'catalog_editorial_palette_ribbon',
  'catalog_editorial_side_caption',
  'catalog_editorial_project_case',
  'catalog_editorial_next_step',
  'catalog_reference_dark_index',
  'catalog_brand_technology_story',
  'catalog_collection_comparison',
  'catalog_series_overview',
  'catalog_collection_story',
  'catalog_collection_index',
  'catalog_color_variants_matrix',
  'catalog_sku_family_table',
  'catalog_product_rows',
  'catalog_product_grid_9',
  'catalog_product_grid_12',
  'catalog_product_cards_6',
  'catalog_standard_range_page',
  'catalog_cross_sell_companions',
  'catalog_interior_sku_spread',
  'catalog_product_hero',
  'catalog_project_case',
  'catalog_interior_products_split',
  'catalog_interiors_gallery',
  'catalog_image_product_pair',
  'catalog_image_two_products',
  'catalog_interior_large_tile_focus',
  'catalog_interior_two_large_tiles',
  'catalog_two_interiors_large_tile',
  'catalog_two_interiors_two_tiles',
  'catalog_full_interior_slab_specs',
  'catalog_split_scene_tile_table',
  'catalog_vertical_room_slab',
  'catalog_scene_companion_products',
  'catalog_format_comparison',
  'catalog_surface_finish_detail',
  'catalog_application_spec',
  'catalog_installation_patterns',
  'catalog_moodboard_modern',
  'table_collection_technical_sheet',
  'table_packaging_price_matrix',
  'table_technical_icons',
  'table_surface_usage_icons',
  'table_specification_dense',
  'table_logistics_packaging',
  'price_visual_quote',
  'price_summary_offer',
  'price_room_estimate',
  'contacts_next_step',
  'contacts_manager_card',
  'contacts_qr_placeholder'
] as const;

function sectionForTemplate(template: PageTemplate): LibrarySection {
  if (template.category === 'cover') return 'cover';
  if (template.category === 'catalog_overview') return 'overview';
  if (template.category === 'catalog_grid') return 'grid';
  if (template.category === 'catalog_interior' || template.category === 'catalog_visual_focus') return 'interior';
  if (template.category === 'catalog_specs') return 'specs';
  if (template.category === 'table') return 'table';
  if (template.category === 'price') return 'price';
  return 'contacts';
}

function audiencesForTemplate(template: PageTemplate): LibraryAudience[] {
  if (template.category === 'price') return ['dealer', 'client'];
  if (template.category === 'contacts') return ['brand', 'dealer', 'client'];
  if (template.category === 'table') return ['brand', 'dealer', 'client'];
  return ['brand', 'dealer', 'client'];
}

function statusForTemplate(template: PageTemplate): LibraryStatus {
  if (visibleTemplateIds.has(template.id)) return 'core';
  if (legacyTemplateIds.has(template.id)) return 'legacy';
  if (hiddenTemplateIds.has(template.id)) return 'hidden';
  return 'hidden';
}

function decorateTemplate(template: PageTemplate): PageTemplate {
  return {
    ...template,
    libraryStatus: statusForTemplate(template),
    librarySection: sectionForTemplate(template),
    audiences: audiencesForTemplate(template)
  };
}

export const allPageTemplates: PageTemplate[] = allTemplateIds.map((templateId) => {
  const template = allTemplateRegistry.get(templateId);
  if (!template) throw new Error(`Template not found in registry: ${templateId}`);
  return decorateTemplate(template);
});

export const pageTemplates: PageTemplate[] = allPageTemplates.filter((template) => template.libraryStatus === 'core');

export const categories = [
  { id: 'cover', title: 'Обложки' },
  { id: 'catalog_overview', title: 'Каталог: обзор серии' },
  { id: 'catalog_grid', title: 'Каталог: товарные сетки' },
  { id: 'catalog_interior', title: 'Каталог: интерьер и товары' },
  { id: 'catalog_visual_focus', title: 'Каталог: интерьер + крупная плитка' },
  { id: 'catalog_specs', title: 'Каталог: форматы и техданные' },
  { id: 'catalog_moodboard', title: 'Moodboard' },
  { id: 'table', title: 'Техлисты' },
  { id: 'price', title: 'Прайс' },
  { id: 'contacts', title: 'Контакты' }
] as const;

const templateIndex = new Map(allPageTemplates.map((template) => [template.id, template] as const));

const blankPageTemplate: PageTemplate = {
  id: 'blank',
  category: 'catalog',
  title: 'Пустая страница',
  description: 'Пустая страница с сеткой и виджетами',
  thumbnail: '',
  defaultZones: {},
  libraryStatus: 'hidden'
};

export function getTemplate(templateId: string): PageTemplate {
  if (templateId === 'blank') return blankPageTemplate;
  const template = templateIndex.get(templateId);
  if (!template) throw new Error(`Template not found: ${templateId}`);
  return template;
}

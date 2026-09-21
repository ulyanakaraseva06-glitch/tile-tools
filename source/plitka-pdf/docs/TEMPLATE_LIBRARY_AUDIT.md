# Template Library Audit

Date: 2026-06-13

## Current State

- Visible core library: 34 templates
- Compatibility registry: 57 templates
- Visible presets: 5
- Legacy templates kept for older documents: 3
- Hidden templates kept only for compatibility: 20

## Core Library

### Cover

- `cover_reference_year_statement`
- `cover_architectural_catalog`
- `cover_catalog_hero`
- `cover_materials_intro`

### Overview

- `catalog_series_overview`
- `catalog_collection_story`
- `catalog_collection_comparison`
- `catalog_reference_material_bands`
- `catalog_reference_color_story`

### Grid

- `catalog_sku_family_table`
- `catalog_product_rows`
- `catalog_product_cards_6`
- `catalog_standard_range_page`
- `catalog_cross_sell_companions`
- `catalog_product_grid_9`

### Interior

- `catalog_product_hero`
- `catalog_reference_room_palette`
- `catalog_reference_dual_scene`
- `catalog_reference_outdoor_story`
- `catalog_split_scene_tile_table`
- `catalog_two_interiors_two_tiles`
- `catalog_project_case`

### Specs

- `catalog_format_comparison`
- `catalog_surface_finish_detail`
- `catalog_application_spec`
- `catalog_reference_outdoor_system`
- `catalog_brand_technology_story`

### Table

- `table_collection_technical_sheet`
- `table_packaging_price_matrix`

### Price

- `price_visual_quote`
- `price_summary_offer`
- `price_room_estimate`

### Contacts

- `contacts_next_step`
- `contacts_manager_card`

## Compatibility-Only Templates

### Legacy

These are the pages worth keeping available for older projects and near-term reuse:

- `catalog_reference_dark_index`
- `catalog_interior_two_large_tiles`
- `catalog_full_interior_slab_specs`

Protected by current workflows:

- `catalog_reference_dark_index` - premium catalog index / customizer target
- `catalog_interior_two_large_tiles` - moodboard / selection-style visual comparison
- `catalog_full_interior_slab_specs` - commercial offer / technical presentation

### Hidden

These are the weakest or most duplicate-heavy variants. Keep them in the registry only for compatibility:

- `catalog_color_variants_matrix`
- `catalog_collection_index`
- `cover_dark_statement`
- `catalog_installation_patterns`
- `catalog_moodboard_modern`
- `catalog_interior_sku_spread`
- `catalog_interior_products_split`
- `catalog_image_product_pair`
- `catalog_image_two_products`
- `catalog_interiors_gallery`
- `catalog_interior_large_tile_focus`
- `catalog_two_interiors_large_tile`
- `catalog_product_grid_12`
- `catalog_scene_companion_products`
- `catalog_vertical_room_slab`
- `table_technical_icons`
- `table_surface_usage_icons`
- `table_specification_dense`
- `table_logistics_packaging`
- `contacts_qr_placeholder`

## Recommended Next Cuts

1. Keep the core library frozen unless a page clearly improves sales or specification clarity.
2. Revisit the `legacy` set only when a saved project or a real customer scenario needs it.
3. Add new pages only for gaps that are still not covered:
   - project case
   - collection comparison
   - technology story
4. Avoid reintroducing near-duplicates across:
   - `cover`
   - `overview`
   - `interior`
   - `price`

See also: [TEMPLATE_LIBRARY_CUT_LIST.md](./TEMPLATE_LIBRARY_CUT_LIST.md)

## Notes

- The UI should keep showing only core templates.
- Old `templateId` values remain valid through the full registry.
- This document is an operational audit, not a permanent taxonomy. Reclassify pages when the product direction changes.

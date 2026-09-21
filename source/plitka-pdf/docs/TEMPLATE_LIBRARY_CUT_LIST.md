# Template Library Cut List

Date: 2026-06-13

This list is the next pruning candidate set after the current `core / legacy / hidden` split.
It does not change compatibility. It only ranks pages by how likely they are to be removed,
collapsed into another template, or kept only as a fallback for older projects.

## Highest-priority candidates

These pages are the most redundant in the current library and should be reviewed first:

- `catalog_interior_two_large_tiles`
- `catalog_full_interior_slab_specs`

## Medium-priority candidates

These pages still have value for legacy projects, but they overlap strongly with better core pages:

- `catalog_product_grid_9` when a denser SKU table exists in the same scenario
- `price_room_estimate` when the quote page already explains room-based scope

Protected legacy, not pruning candidates:

- `catalog_reference_dark_index`
- `catalog_interior_two_large_tiles`
- `catalog_full_interior_slab_specs`

## Keep for now

These are weaker pages, but they still have a distinct job in older documents or fallback scenarios:

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

## Rule for the next pruning pass

If a page does not do one of these jobs better than the rest, it should not stay visible:

- explain the collection
- compare collections
- show a real interior application
- support SKU selection
- support pricing or quoting
- close the document with contact action

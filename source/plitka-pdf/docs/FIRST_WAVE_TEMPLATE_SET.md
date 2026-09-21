# First Wave Template Set

## Goal

Define which templates should be created and promoted first in the page library during the catalog upgrade.

## Principle

- Do not rebuild all existing templates at once.
- Add 8 new benchmark templates first.
- Keep old templates available, but place the new benchmark templates first inside their categories.

## First-wave benchmark templates

### Cover category

#### `cover_catalog_hero`

- Role: main collection cover
- Replaces as first choice for emotional catalog opening
- Visual signal:
  - one large interior
  - one tile accent
  - clear collection title

#### `cover_catalog_business`

- Role: business-first opening page for commercial offer / price pack
- Replaces as first choice for dealer and manager workflows
- Visual signal:
  - calm heading area
  - one product or image block
  - quick icon row

### Catalog category

#### `catalog_product_hero`

- Role: interior plus large product plus characteristics
- Becomes the default product presentation page

#### `catalog_sample_grid`

- Role: SKU grid with samples, article, format, surface
- Becomes the default assortment page

#### `catalog_interior_products_split`

- Role: interior on one side, product positions on the other
- Becomes the default mixed sales page

#### `catalog_moodboard`

- Role: material composition page with multiple textures
- Becomes the default editorial/material page

### Table category

#### `table_technical_icons`

- Role: technical page with icon blocks for size, finish, thickness, usage
- Becomes the default spec page

### Price / contacts categories

#### `price_visual_quote`

- Role: commercial or price page with visual block and calculation table
- Becomes the default commercial calculation page

#### `contacts_next_step`

- Role: final contact page with clear next step
- Becomes the default closing page

## Priority order

1. `cover_catalog_hero`
2. `catalog_product_hero`
3. `catalog_sample_grid`
4. `table_technical_icons`
5. `catalog_interior_products_split`
6. `price_visual_quote`
7. `catalog_moodboard`
8. `contacts_next_step`

## Mapping against the current library

These do not need a destructive replacement now. They simply become the new preferred entry points.

- cover:
  - current references: `cover_interior`, `cover_business`
- catalog:
  - current references: `catalog_no_interior`, `catalog_one_interior`, `catalog_two_interiors`
- table:
  - current references: `table_basic`, `table_spec_icons`, `table_formats`
- price / offer / contacts:
  - current references: `price_list`, `commercial_offer`, `contacts`

## Library behavior target

- New benchmark templates appear first in their category.
- Existing templates remain available as secondary choices.
- Titles and descriptions should help selection, but thumbnails must do most of the work.

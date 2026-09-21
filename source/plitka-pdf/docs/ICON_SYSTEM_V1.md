# Icon System V1

## Goal

Define the first stable icon set for the upgraded catalog pages using the existing icon library.

## Use existing library

The project already has a working catalog icon library in [src/data/iconLibrary.tsx](</D:/System user data/Desktop/Codex Project`s/Плитка PDF Сервис/src/data/iconLibrary.tsx>).

Use that first. Do not introduce a new icon package.

## Core icon set for first release

These icons should be considered the priority set for the new benchmark templates.

### Required technical icons

- `size`
- `thickness`
- `matte` or `glossy`
- `wall`
- `floor`

### Strongly recommended technical/support icons

- `rectified`
- `water`
- `abrasion`
- `heated-floor`

### Commercial/support icons

- `delivery`
- `lead-time`
- `price`
- `calculation`
- `phone`
- `email`

## Page-level icon usage

### `catalog_product_hero`

- required:
  - `size`
  - `thickness`
  - one surface icon
  - one usage icon

### `table_technical_icons`

- required:
  - `size`
  - `thickness`
  - one surface icon
  - `wall` / `floor`
- optional:
  - `rectified`
  - `water`
  - `abrasion`
  - `heated-floor`

### `catalog_interior_products_split`

- optional compact row:
  - `size`
  - surface icon
  - `wall` / `floor`

### `price_visual_quote`

- optional business row:
  - `price`
  - `delivery`
  - `lead-time`

### `contacts_next_step`

- optional contact row:
  - `phone`
  - `email`

## Layout guidance

- Use icons as a reading aid, not as decoration.
- Prefer short caption + short value.
- Keep icon rows compact and aligned to a grid.
- Avoid oversized icons in premium layouts.
- In thumbnails, represent icon presence schematically, not with detailed labels.

## Visual guidance

- Use a quiet stroke weight.
- Let icons sit inside the text system, not above it as a separate decorative layer.
- Accent color can be used for icon containers or small markers, but not for every icon equally.

# Catalog Upgrade Notes

## Placeholder image set

- Expand local placeholder assets in `public/placeholders/catalog/`.
- Interior placeholders should cover these ratios:
  - `16:9`
  - `4:3`
  - `3:4`
  - `9:16`
- Tile placeholders should cover these product formats:
  - `60x60` -> `1:1`
  - `60x120` -> `1:2`
  - `20x120` -> `1:2`
- `60x60` and `60x120` should include stone-look and marble-look directions.
- `20x120` should include wood-look direction.

## Typography and contrast

- New catalog pages should not rely on only pure black or pure white text.
- Use a small text palette:
  - dark graphite for light surfaces
  - soft off-white for dark image areas
  - quieter neutral tones for technical captions
- `documentAccent` should stay restrained and be used for labels, dividers, markers, and small emphasis blocks.

## Shadows

- Shadows can be used actively on interior images to add depth and a more premium catalog feel.
- Do not apply a block-wide shadow to mixed content areas where only part of the zone is visually occupied.
- Avoid wide panel shadows on:
  - text blocks
  - product info panels
  - single tile sample zones
- If shadow support is exposed in settings, it should be available as an optional toggle for relevant image usage.

## Page previews

- Page previews in the left library panel need a dedicated improvement pass.
- Users should be able to understand from the thumbnail which page layout fits their task before opening it.
- Thumbnails should communicate composition clearly, for example:
  - interior-led cover
  - product page with hero slab
  - sample grid
  - technical sheet
  - price page
  - final contact page

## Icons

- The catalog system is moving toward a consistent icon layer.
- Some pages should explicitly reserve space for icons as part of the layout, not as an afterthought.
- Priority icon use cases:
  - size
  - finish
  - thickness
  - usage
  - material or collection features
- Future page templates and page thumbnails should reflect when a layout includes icon-driven technical blocks.

## Design pass priority

- The current goal is not a full rebuild of all templates.
- First build a strong visual benchmark around 8 high-quality catalog pages.
- These 8 pages should become the standard for future template updates.

## Future template system notes

- All blocks and panels should default to straight corners.
- Corner rounding should be controlled later from the right-side editor panel as an optional setting.
- The ready-made template library should be refreshed to be more relevant and better structured.
- The library should not feel like a list of isolated single pages only.
- Document-oriented template sets should include several working pages of the same type where it makes sense.
- Examples:
  - a catalog preset should include multiple catalog pages
  - a price preset should include multiple price pages
  - a commercial set should include several compatible functional pages
- Future library planning should optimize for real multi-page document assembly, not one-page selection only.

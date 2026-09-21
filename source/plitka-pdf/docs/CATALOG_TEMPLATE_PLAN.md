# Catalog Template Plan

## Goal

Create 8 benchmark catalog templates that set the visual standard for the page library without changing the editor architecture.

## Shared rules

- Use existing zone types only: `text`, `image`, `table`, `features`.
- Interior images use `fit: cover`.
- Product and tile images use `fit: contain`.
- Interior ratios:
  - `16:9`
  - `4:3`
  - `3:4`
  - `9:16`
- Tile ratios:
  - `1:1`
  - `1:2`
- Typography should use a small palette, not only pure black and pure white.
- `documentAccent` is for restrained emphasis, not for large text blocks.
- Shadows are allowed on interior visuals.
- Avoid large panel shadows on text blocks, sample blocks, and product cards with partial visual fill.
- Reserve icon areas on technical and mixed product pages.

## Template set

### 1. Collection cover

- Purpose: open the catalog with one strong emotional image and a clear collection message.
- Composition:
  - dominant interior hero
  - one tile sample or floating slab accent
  - title and subtitle
  - small technical caption line
- Best assets:
  - `16:9` or `4:3` interior
  - one `1:1` or `1:2` tile accent
- Text behavior:
  - light text on dark image zones
  - dark text on calm light overlay or side panel
- Icon support:
  - optional small row for 2-3 quick features

### 2. Product hero page

- Purpose: show one interior, one large product object, and key characteristics.
- Composition:
  - interior on one side
  - large slab or tile object on the other
  - compact feature list under or beside the product
- Best assets:
  - `16:9`, `4:3`, or `3:4` interior
  - floating transparent tile object
- Text behavior:
  - primary dark text on light surfaces
  - secondary muted captions for technical data
- Icon support:
  - required for size, finish, thickness, usage

### 3. Sample grid page

- Purpose: show multiple SKUs in a clean, dealer-friendly format.
- Composition:
  - heading
  - sample grid
  - article, format, finish under each sample
  - optional small note or collection statement
- Best assets:
  - `1:1` and `1:2` tile textures
- Text behavior:
  - mostly dark text
  - quiet technical captions
- Icon support:
  - optional small badges for finish or usage

### 4. Technical features page

- Purpose: present key technical information in a fast-reading layout.
- Composition:
  - heading
  - icon-driven feature blocks
  - small supporting text
  - optional product visual
- Best assets:
  - one product image or one calm texture accent
- Text behavior:
  - dark primary text
  - consistent micro-caption style
- Icon support:
  - required

### 5. Moodboard page

- Purpose: show several materials together as a design direction.
- Composition:
  - mix of 3-5 samples
  - one short description
  - optional small accent statement
- Best assets:
  - multiple `1:1` and `1:2` materials
  - optional floating tile object
- Text behavior:
  - minimal text
  - premium restraint
- Icon support:
  - not required

### 6. Interior left / products right

- Purpose: combine a convincing space image with commercial SKU clarity.
- Composition:
  - tall or wide interior on the left
  - stacked product positions on the right
  - each position gets sample, article, format, finish
- Best assets:
  - `3:4`, `4:3`, or `9:16` interior
  - `1:1` and `1:2` tile samples
- Text behavior:
  - dark text in the product column
  - overlay text on interior only if contrast is controlled
- Icon support:
  - optional small feature row

### 7. Price / commercial sheet

- Purpose: mix visual trust and calculation clarity.
- Composition:
  - visual block with interior or product
  - table area
  - totals or summary panel
  - short note about delivery or terms
- Best assets:
  - one interior or one floating slab object
- Text behavior:
  - dark text almost everywhere
  - accent only in totals, tags, and dividers
- Icon support:
  - optional for terms and logistics

### 8. Final contact page

- Purpose: end the document clearly and move the user to the next step.
- Composition:
  - calm image or abstract product accent
  - company and manager contacts
  - short next-step line
  - `plitka-pdf.ru` footer block preserved
- Best assets:
  - one calm interior crop or one floating product accent
- Text behavior:
  - either full light-on-dark or dark-on-light, but controlled and simple
- Icon support:
  - optional for phone, email, messenger, website

## Recommended implementation order

1. Collection cover
2. Product hero page
3. Sample grid page
4. Technical features page
5. Interior left / products right
6. Price / commercial sheet
7. Moodboard page
8. Final contact page

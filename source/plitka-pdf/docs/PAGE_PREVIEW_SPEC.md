# Page Preview Spec

## Goal

Improve page thumbnails in the left panel so users can choose templates by visual structure, not by title only.

## What a thumbnail must communicate

- page type
- interior-heavy or product-heavy composition
- density level
- presence of table or icon blocks
- whether the page is emotional, technical, commercial, or closing

## Core preview principles

- Thumbnails should be schematic but recognizable.
- The preview should reflect the real composition, not a generic placeholder card.
- Different templates in one category must not look interchangeable at first glance.
- Use consistent internal preview styling so the library feels like one system.

## Required visual signals by page type

### Cover

- one large hero image area
- clear title block
- optional small accent sample

### Product hero

- split structure: interior plus product object
- visible technical strip or feature block

### Sample grid

- repeated swatch cells
- visible caption rhythm under samples

### Technical page

- obvious icon row or icon grid
- short text blocks

### Moodboard

- irregular but balanced material arrangement
- less text than technical pages

### Interior left / products right

- strong vertical or wide image block on one side
- stacked product items on the other

### Price / commercial page

- one visual block plus table structure
- visible totals area

### Final contact page

- calm composition
- contact stack
- clear closing block

## Preview content rules

- Use neutral fake content, not long readable text.
- Use simplified title bars, caption lines, swatch blocks, icon dots, and table rows.
- Keep the preview legible at small size before adding decorative detail.
- Show icon presence as tiny consistent glyph blocks or dots, not detailed artwork.

## Priority differences between thumbnails

- Cover should feel image-first.
- Technical page should feel icon-first.
- Sample grid should feel repetition-first.
- Price page should feel table-first.
- Final page should feel calm and low-density.

## Future implementation note

- If the library already has a `thumbnail` field per template, each new benchmark template should get a purpose-built thumbnail asset or generated schematic.
- For old templates, the same preview system can be rolled out later without blocking the new 8 pages.

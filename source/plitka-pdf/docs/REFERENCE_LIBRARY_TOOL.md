# Reference Library Tool

CLI for scanning PDF catalogs, detecting exact duplicates, rendering contact sheets, and building a sortable index.

## Command

```bash
npm run references:scan -- --input "D:\\System user data\\Desktop\\Каталоги"
```

## Outputs

The tool writes a timestamped run folder under `outputs/reference-library/`.

Each run contains:

- `index.json` - full file index with page counts, hashes, tags, score, and preview paths
- `summary.md` - short readable summary
- `duplicates.json` - exact duplicate groups
- `catalogs/<slug>/contact-sheet.png` - preview sheet for quick review
- `catalogs/<slug>/previews/page-XXX.png` - sampled page previews

## Useful flags

```bash
npm run references:scan -- --input "D:\\System user data\\Desktop\\Каталоги" --skip-preview
npm run references:scan -- --input "D:\\System user data\\Desktop\\Каталоги" --file "generale magnum 2026.pdf" --file "WORKBOOK-2026-CIR.pdf"
npm run references:scan -- --input "D:\\System user data\\Desktop\\Каталоги" --sample-pages 18 --render-width 320
```

## Defaults

- `--input` defaults to `D:\System user data\Desktop\Каталоги`
- `--sample-pages` defaults to `12`
- `--render-width` defaults to `320`
- `--sheet-columns` defaults to `4`

## Notes

- Broken and encrypted PDFs are recorded as errors and do not stop the run.
- Exact duplicates are grouped by file hash.
- The tool is intended for internal research only. It does not copy source PDFs into the repo.

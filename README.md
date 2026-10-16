# Janice Khang — Field Journal

Personal portfolio with paper-inspired index tabs, a folded About page, and a monochrome asterisk interaction.

## Run locally

No build step or package installation is required.

```sh
python3 -m http.server 8000 --directory dist
```


## Files

- `dist/index.html`, `dist/style.css`, `dist/script.js`: site source
- `dist/dither.js`: dithered WebGL background scenes (Veil, Cloudsea, Galaxy); one is picked at random on each load, and scrolling the sheet moves its story forward
- `dist/ascii.js`: interactive ASCII background on the surround (from -ASCII-001-Hero v2)
- `dist/fonts/`: self-hosted fonts and licenses
- `DESIGN.md`: five-color palette and typography rules
- `ASSET-CREDITS.md`: image attribution
- `dist/palette-comparison.html` and `dist/type-comparison.html`: earlier design explorations

Playground features six original GitHub experiments, with local thumbnails and verified public demo links. About contains the continuous folded layout. Only content within the paper scrolls.


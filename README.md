# Janice Khang — Field Journal

Personal portfolio with paper-inspired index tabs, a folded About page, and a monochrome asterisk interaction.

## Run locally

No build step or package installation is required.

```sh
python3 -m http.server 8000 --directory dist
```


## Files

- `dist/index.html`, `dist/style.css`, `dist/script.js`: site source
- `dist/dither.js`: dithered WebGL background scenes (Veil, Cloudsea, Galaxy); one is picked at random on each load and plays as a 5-second loop (still on phones)
- `dist/about.js`: About page. Sixteen slide-mount cards drawn in WebGL (bent-quad flip, paper tooth, faint sheen); faces are painted to 2D canvases from the CSS tokens, and the buttons in the DOM stay the real controls. Falls back to cross-fading canvases without WebGL
- `dist/ascii.js`: interactive ASCII background on the surround (from -ASCII-001-Hero v2)
- `dist/fonts/`: self-hosted fonts and licenses
- `DESIGN.md`: five-color palette and typography rules
- `ASSET-CREDITS.md`: image attribution
- `dist/palette-comparison.html` and `dist/type-comparison.html`: earlier design explorations

Playground features seven original experiments, with local thumbnails and verified public demo links. About is a 4×4 spread of slide mounts; each card flips to a note (placeholder content for now). Only content within the paper scrolls.


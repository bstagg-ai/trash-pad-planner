# Trash Pad Planner

A single-page app for designing the raised trash-can pad next to the garage: a segmental block
retaining wall, a paver pad, a 4′ fence on three sides with a gate on the driveway side, two
96-gal carts and a hose reel. It shows a live 3D view, a dimensioned plan, and the materials list
and budget compared with the Quality YHM quote ($8,562.80).

**Live site:** https://bstagg-ai.github.io/trash-pad-planner/ (after GitHub Pages is turned on, see below)

The design is stored in the link (`#v=1&L=10&D=7&…`), so **Copy link** gives you a URL you can text
for that exact version, including any prices you changed.

## How the numbers are figured

- **Grade:** level with the driveway at the driveway end, falling to the "lawn drop" at the far end.
  The drop is the same next to the house and at the far corner, so the far-end wall is full
  height across and the front wall tapers.
- **Wall:** block count per block-width slot, with courses = 1 buried course + enough 6″ courses
  (3.5″ for RumbleStone) to reach the cap, +5%. Caps along the top run, +5%.
- **Pavers:** area inside the caps, +10% waste.
- **Stone:** #304 fill under the pad (4″ topsoil stripped, 6″ minimum base) plus a 24″-wide, 6″
  wall trench, ×1.15 for compaction. #57 drain stone 12″ behind the wall, full height. 1″ bedding sand.
- **Fence:** posts 12″ behind the wall face (more for deep blocks) in their own footings 36″
  below grade, max 8′ apart. Post stock length = fence height + fill depth + 36″, rounded up to 8/10/12′.
  Concrete from hole volume (8″ holes for 4x4, 10″ for 5x5), 0.375 cu ft per 50 lb bag.
- **Gate:** on the driveway side, hinged on the corner post and swinging out over the driveway.
  If less than 9″ of fixed fence would be left beside it, the gate spans the whole side instead.
- **Prices:** defaults come from `plan.md` where it gives one (marked *plan.md* in the Prices tab).
  The rest are marked *est.*. All of them are editable.

## Files

```
index.html        page shell
app.css           styles (phone layout under 900 px)
js/catalog.js     products, colors, default unit prices, quote figures
js/state.js       design defaults + URL encode/decode
js/model.js       geometry, quantities, costs (pure, unit-tested)
js/plan2d.js      top-down SVG plan
js/scene3d.js     three.js scene
js/app.js         UI wiring
vendor/           three.js r160 + OrbitControls (MIT), saved here so there's no CDN dependency
tests/            node --test tests/
```

No build step. To run it locally: `python3 -m http.server` in this folder, then open http://localhost:8000.
Run the model tests with `node --test tests/`.

## Deploying with GitHub Pages

1. Merge this work into `main`.
2. On GitHub, open the repo, then **Settings → Pages** (left sidebar, under "Code and automation").
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Set **Branch** to **`main`** and the folder to **`/ (root)`**, then click **Save**.
5. Wait a minute or two. The URL appears at the top of the Pages screen:
   https://bstagg-ai.github.io/trash-pad-planner/

Every later push to `main` redeploys automatically. The empty `.nojekyll` file tells Pages to
serve the files as-is.

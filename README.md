# Gesture Playground

A browser playground where your **webcam + hand gestures** drive interactive 3D
experiences. Built with **MediaPipe Hands** (tracking) and **Three.js** (scene).

Two screens side by side:
- **Interactive Scene** — the experience you control
- **Hand Tracking** — your mirrored camera with the detected hand skeleton

A column on the left lets you pick an experience.

## Run it

You need a local web server (the camera + ES modules won't work from `file://`).
Node is already installed, so:

```powershell
# from this folder
node serve.mjs
# then open http://localhost:8000
```

or just double-run the helper (opens the browser for you):

```powershell
./start.ps1
```

Click **▶ Enable camera** and allow webcam access. First load pulls the MediaPipe
model from a CDN, so you need internet the first time.

## Experiences

| Experience      | Status | Gestures |
|-----------------|--------|----------|
| 💡 Light Bulb   | ✅ ready | pinch the **chain** & pull down → toggle · pinch the **bulb** & twist → unscrew · open palm → fit a new bulb |
| 🌫️ Memory Sand  | soon   | body silhouette into kinetic sand |
| 🎹 Air Piano    | soon   | play keys with fingertips |
| 🍉 Fruit Ninja  | soon   | slice fruit, keep score |
| ✏️ Air Draw     | soon   | paint with your finger |

## How it's wired

```
index.html         layout (sidebar + two panels) + import map
js/main.js         app shell: sidebar, camera button, render loop, cursor
js/handTracking.js MediaPipe HandLandmarker wrapper + skeleton overlay + gesture math
js/experiences/
  registry.js      list of experiences (only lightbulb is implemented)
  lightbulb.js     the Three.js light-bulb scene + interaction
serve.mjs          tiny static server (no dependencies)
```

### Adding an experience
Each experience is a factory `create(ctx)` returning `{ update(frame), resize(w,h), dispose() }`.

- `ctx`  = `{ mount, width, height, setHint(html), setTag(text) }`
- `frame`= `{ hands, cursor, dt, t }`
  - `cursor` = `{ present, x, y, pinch, rotation, strength }` (normalized 0..1, mirrored)
  - `hands[]` each = `{ handedness, landmarks[21], pinch, pointer, rotation, openness }`

Register it in `js/experiences/registry.js` with `status: "ready"`.

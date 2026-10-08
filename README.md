# Fu Face Radar

Warp your face into a six-point radar chart of your abilities or mood.

**Live site:** https://fumetothemoon.github.io/fu-face-radar/

## How it works

1. Upload a selfie and crop it to a square.
2. Remove the background automatically or with the erase/restore brush (pinch to zoom up to 400%).
3. Drag the six sliders. Values above 2 stretch your face toward that word; all 10s make a spider-web star.
4. Press **Breathe** to animate, or **Make image** to save a PNG (with or without the chart).

Photos are processed entirely in the browser and never uploaded. Automatic background removal uses
[MediaPipe Selfie Segmentation](https://github.com/google-ai-edge/mediapipe) (Apache 2.0), loaded from jsDelivr.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
```

Every push to `main` builds the site and deploys it to GitHub Pages through `.github/workflows/deploy.yml`.

## Project layout

| Path | What it is |
| --- | --- |
| `src/App.jsx` | Screens and flow: landing → editor → radar → save / leave |
| `src/components/` | `Landing`, `PhotoEditor`, `RadarView`, `ExportView`, `LeaveDialog` |
| `src/lib/faceWarp.js` | WebGL mesh that stretches the face into the radar star |
| `src/lib/overlay.js` | Radar rings, labels and values |
| `src/lib/editorEngine.js` | Crop, mask brush, pinch zoom and undo |
| `src/lib/segment.js` | Automatic background removal |
| `src/config.js` | Presets, notes and gallery images |
| `public/demo-face.png` | Demo face used for the generated gallery |

## Adding gallery images

Put images in `public/gallery/` and list them in `GALLERY_IMAGES` in `src/config.js`,
for example `["gallery/01.jpg", "gallery/02.jpg"]`. While the list is empty, the gallery shows warped
versions of the demo face.

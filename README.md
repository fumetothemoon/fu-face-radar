# Fu Face Radar

Warp your face into a six-point radar chart of your abilities or mood.

**Live site:** https://fumetothemoon.github.io/fu-face-radar/

## How it works

1. Upload a selfie.
2. **Prepare your face**: frame it inside the face guide (Move), then remove the background automatically
   or with the Erase/Restore brush (pinch to zoom up to 400%). Tap **Tips** for good and bad examples.
3. Drag the six mood sliders (happy, calm, tired, sad, angry, anxious). Values above 2 stretch your face toward that
   feeling; all 10s make a spider-web star.
   Rotate the face with the **Rotate** control or a two-finger twist on the chart.
4. Press **Breathe** to animate, or **Save** to download a PNG. The save page shows a short note picked from your values
   (rules and messages in `src/lib/summary.js`). With labels off you can move, zoom and rotate the face
   (two fingers on phones; wheel and Shift + wheel on desktop). **Reset** sets every value to 0 and restores the labels.

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
| `src/config.js` | Default mood values, hidden ability/vibe presets, gallery images |
| `src/i18n.js` | English and Traditional Chinese text; language is auto-detected and switchable on the upload page |
| `src/lib/summary.js` | Rules and messages for the note on the save page |
| `public/demo-face.png` | Demo face used for the generated gallery |
| `public/hints/` | Example images shown in the Tips dialog |

## Adding gallery images

Put images in `public/gallery/` and list them in `GALLERY_IMAGES` in `src/config.js`,
for example `["gallery/01.jpg", "gallery/02.jpg"]`. While the list is empty, the gallery shows warped
versions of the demo face.

## Visitor stats

Visitor counting uses [GoatCounter](https://www.goatcounter.com) (no cookies, no personal data; photos never leave the
device). Set `GOATCOUNTER_CODE` in `src/config.js` to your site code to turn it on. Besides visits, it counts these
events: `photo-uploaded`, `photo-used`, `image-saved-with-chart`, `image-saved-face-only`, `opened-in-en` / `opened-in-zh`
and `language-en` / `language-zh`.

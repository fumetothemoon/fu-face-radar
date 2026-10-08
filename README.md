# Fu Face Radar

Warp your face into a six-point radar chart of your abilities or mood.

**Live site:** https://fumetothemoon.github.io/fu-face-radar/

## How it works

1. Upload a selfie and crop it to a square.
2. Remove the background automatically or with the erase/restore brush (pinch to zoom up to 400%).
3. Drag the six sliders. Values above 2 stretch your face toward that word; all 10s make a spider-web star.
4. Press **Breathe** to animate, or **Make image** to download a PNG (with or without the chart).

Photos are processed entirely in your browser and never uploaded. Automatic background removal uses
[MediaPipe Selfie Segmentation](https://github.com/google-ai-edge/mediapipe) (Apache 2.0), loaded from jsDelivr.

## Adding gallery images

Put images in the `gallery/` folder and list them in `GALLERY_IMAGES` near the bottom of `index.html`,
for example `["gallery/01.jpg", "gallery/02.jpg"]`. While the list is empty, the gallery shows warped
versions of the demo face.

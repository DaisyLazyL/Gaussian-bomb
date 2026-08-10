# PinchGS

Gesture editing prototype for 3D Gaussian scenes.

## What it does

- Import `.ply` or `.splat` Gaussian scene files
- Preview Gaussian centers in a WebGL canvas
- Use camera hand tracking for:
  - Pinch to edit selected Gaussians
  - Open palm to rotate the scene
  - Two hands to zoom in and out
- Edit with Move, Deform, Erase, and Paint tools
- Record the canvas as a shareable WebM demo video

## Run locally

```bash
yarn dev
```

Then open:

```text
http://localhost:5174/
```

The camera gesture mode loads MediaPipe Hand Landmarker in the browser. If camera tracking is unavailable, hold `Shift` and drag on the canvas to simulate pinch editing.

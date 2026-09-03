# Video to Slide Desktop App

A fast, distraction-free desktop application for converting video presentations into slide decks with custom keyframe stop points and PowerPoint-style presentation preview.

Built with **Vite**, **React 19**, **TypeScript**, and **Electron**.

---

## Design Guidelines Adhered To

- **Zero Gradients**: Strictly flat, modern design.
- **Single Accent Color**: VS Code Blue (`#007acc`) with dark neutral slate/gray backgrounds (`#181818`, `#1e1e1e`, `#252526`, `#2d2d2d`).
- **Crisp Rounded Corners**: Border radiuses strictly capped at `8px` (`6px` / `8px`).
- **VS Code Aesthetic**: Familiar editor layout with Top Titlebar, Explorer Sidebar, Central Player/Scrubber, and Blue Status Bar.

---

## Features

1. **Video & Image Upload**:
   - Open any local video (`.mp4`, `.webm`, `.mov`, `.mkv`).
   - Import standalone images as slides (`.png`, `.jpg`, etc.).
   - Built-in **1-Click Interactive Demo Video** to test immediately.

2. **Precision Timeline & Keyframe Stop Points**:
   - Scrub through video with frame-by-frame controls (`-1s`, `-1 frame`, `+1 frame`, `+1s`).
   - Register keyframe stop points at any timestamp (`+ Add Keyframe` or press `K`).
   - High-resolution snapshot automatically captured from video canvas.
   - Interactive keyframe pins on the timeline scrubber.

3. **PowerPoint-Style Presentation Preview**:
   - Press `F5` or click **Preview Slides**.
   - Navigate slides using **Left / Right Arrow Keys**, `Space`, `PageDown` / `PageUp`, or `Backspace`.
   - **Slide Snapshot Mode** (instant high-res presentation slides).
   - **Video Seek Mode** (video seeks to keyframe and allows direct playback).
   - Bottom thumbnail carousel drawer (`T` to toggle).
   - Speaker notes overlay drawer (`N` to toggle).
   - Fullscreen mode support.

4. **Export & Persistence**:
   - Download slide snapshots as high-resolution images.
   - Save and reload project configuration (`.json`).

---

## How to Run

### Development (Desktop App)
Runs both the Vite dev server and Electron window simultaneously:
```bash
pnpm dev
```

### Run in Browser (Web Mode)
```bash
pnpm dev:web
```

### Build & Run Desktop App from Production Build
```bash
pnpm build
pnpm start
```

---

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `F5` | Start / Exit Presentation Preview |
| `Space` | Play / Pause video (in editor) / Next slide (in presentation) |
| `K` | Add Keyframe stop point at current position |
| `←` / `→` | Previous / Next slide in Presentation Preview |
| `T` | Toggle thumbnail drawer in Presentation Preview |
| `N` | Toggle speaker notes in Presentation Preview |
| `V` | Toggle Snapshot vs Video Mode in Presentation Preview |
| `Esc` | Exit Presentation Preview |

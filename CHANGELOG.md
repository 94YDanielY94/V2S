# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-21

### Added
- **Continuous Video Timeline Presentation**: Seamlessly turn continuous screen recordings or video demonstrations into interactive, pause-on-stop slide decks.
- **Precision Keyframe Scene Stops**: Pinpoint timestamps along the video timeline with automatic pausing during presentations.
- **Interactive Presentation Mode**: Advance slides with Spacebar, Left/Right arrow keys, or PageDown/PageUp with smooth transitions to target stop points.
- **Looping Scene Strips**: Set specific scenes to loop continuously (ideal for rotating 3D assets, animated diagrams, and UI micro-interactions).
- **Multi-Video Clip Stitching**: Import and stitch multiple video clips (up to 40 minutes total) into a single unified timeline.
- **Sub-Second Micro Scrubbing**: Frame-by-frame nudge navigation (`-1s`, `-1 frame`, `+1 frame`, `+1s`) alongside a zoomable timeline ruler.
- **Multi-Tab Workspace**: Open and manage multiple presentations simultaneously with browser-style tabs.
- **Local Persistence & Auto-Save**: Offline-first storage using browser/desktop IndexedDB with background auto-saving and full JSON export.
- **Customizable Preferences**: Adjustable transition speed (0.5x to 2x), transition style (smooth vs. instant), auto-save intervals, and dark/light themes.
- **Cross-Platform Flexibility**: Run natively as an Electron desktop app with custom window controls or directly in any modern web browser.

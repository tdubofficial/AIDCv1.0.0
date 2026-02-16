# AI Director's Chair

A private, locally-installed desktop application for AI-powered video production. Generate professional films using multi-provider AI video generation, Gemini-powered storyboards, and comprehensive cinema production tools.

## Features

- **Gemini-Powered Storyboard Generation** — Describe your vision and let AI create a full shot-by-shot storyboard with camera angles, lighting, and dialog
- **Multi-Provider Video Generation** — Route to Kling 1.6 Pro, MiniMax, or WAN via Fal.ai based on your needs and budget
- **Cinema Production Anthologies** — Professional reference library of cameras (ARRI, RED, Sony), lenses (Zeiss, Cooke, Atlas), lighting rigs, director styles, and color grading presets
- **Visual Consistency Engine** — Global style/lighting/camera/aspect ratio controls applied to every scene prompt
- **Music Video Mode** — Upload audio tracks, set clip durations, and preview loop timelines
- **100% Local Data** — SQLite database, no cloud uploads, API keys stored locally
- **Cross-Platform** — Windows (.msi), macOS (.dmg), Linux (.AppImage/.deb)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| State | Zustand (localStorage persistence) |
| Styling | Tailwind CSS (Playfair Display, DM Sans) |
| Desktop | Tauri 1.6 (Rust) |
| Database | SQLite (embedded via rusqlite) |
| AI Video | Fal.ai → Kling / MiniMax / WAN |
| AI Storyboard | Google Gemini 2.0 Flash |

## Prerequisites

- **Node.js** 20+
- **Rust** 1.70+ (install via [rustup.rs](https://rustup.rs))
- **Tauri CLI**: `cargo install tauri-cli`
- **API Keys**:
  - [Google AI Studio](https://aistudio.google.com/apikey) — Gemini API key
  - [Fal.ai](https://fal.ai/dashboard/keys) — Fal API key

### Linux Additional Dependencies

```bash
sudo apt install libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev
```

## Development

```bash
# Install dependencies
npm install

# Run in dev mode (hot reload)
npm run tauri:dev

# Build for production
npm run tauri:build
```

## Building Releases

### Manual Build

```bash
npm run tauri:build
# Output: src-tauri/target/release/bundle/
```

### Automated (GitHub Actions)

Tag a release to trigger cross-platform builds:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This creates a draft GitHub Release with Windows .msi, macOS .dmg (ARM + Intel), and Linux .AppImage/.deb binaries.

## Project Structure

```
ai-directors-chair/
├── src/
│   ├── App.tsx                    # Main shell + tab navigation
│   ├── main.tsx                   # React entry
│   ├── styles/app.css             # Tailwind + custom styles
│   └── app/
│       ├── types/index.ts         # TypeScript interfaces
│       ├── lib/
│       │   ├── store.ts           # Zustand state management
│       │   ├── anthologies.ts     # Cinema reference library
│       │   ├── gemini.ts          # Storyboard generation API
│       │   └── video/
│       │       └── providers.ts   # Multi-provider video gen
│       └── components/
│           ├── CastManager.tsx    # Character management
│           ├── StoryboardGenerator.tsx  # Pre-production
│           ├── ProductionBoard.tsx      # Scene rendering
│           ├── VideoCompiler.tsx        # Final cut / export
│           └── MusicVideoMode.tsx       # Music video features
├── src-tauri/
│   ├── Cargo.toml                 # Rust dependencies
│   ├── tauri.conf.json            # Tauri configuration
│   ├── build.rs                   # Build script
│   └── src/main.rs                # SQLite init + Tauri setup
├── .github/workflows/
│   └── release.yml                # CI/CD cross-platform builds
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Workflow

1. **Cast** — Add characters with names, descriptions, and reference photos
2. **Pre-Production** — Set film title, genre, tone, and synopsis → Generate AI storyboard
3. **Production** — Configure visual consistency settings → Generate video clips per scene
4. **Final Cut** — Preview sequential playback → Compile and export

## API Cost Estimates

| Provider | Per Second | 5s Clip | 10s Clip |
|----------|-----------|---------|----------|
| Kling 1.6 Pro | $0.06 | $0.30 | $0.60 |
| MiniMax | $0.03 | $0.15 | $0.30 |
| WAN | $0.04 | $0.20 | $0.40 |

## Roadmap (v2.0)

- [ ] FFmpeg.wasm real video concatenation
- [ ] Drag-and-drop storyboard reordering
- [ ] Beat detection for music video sync
- [ ] DRM licensing system
- [ ] Batch scene generation queue
- [ ] Anthology browser/selector UI

## License

Proprietary — All rights reserved.

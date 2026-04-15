# TabCraft — AI Agent Context

## 🔗 Share These URLs With Any AI Agent

| Resource | URL | Notes |
|---|---|---|
| **Live Site** | https://tabcraft-five.vercel.app/ | Auto-updates on every git push |
| **Source Code** | https://github.com/hrs099/tabcraft | Full codebase, always current |

---

## 📦 Project Overview

**TabCraft** is a professional-grade, polyphonic percussive fingerstyle guitar tab editor built with:
- **React + Vite** (frontend framework)
- **TailwindCSS** (styling)
- **Web Audio API** (real-time acoustic playback)
- **Tone.js** (audio synthesis)

---

## 🗂️ Project Structure

```
Myarea/
├── tabcraft/                  ← Main React app (deployed to Vercel)
│   ├── src/
│   │   ├── App.jsx            ← Root component
│   │   ├── index.css          ← Global styles
│   │   ├── components/
│   │   │   ├── Editor.jsx     ← Tab editor UI
│   │   │   ├── Fretboard.jsx  ← Live fretboard visualizer
│   │   │   ├── TabViewer.jsx  ← Tab display/playback
│   │   │   ├── AudioToTab.jsx ← Audio-to-tab transcription
│   │   │   └── SoloGenerator.jsx ← AI solo generator
│   │   └── utils/
│   │       ├── music.js       ← Music theory helpers
│   │       ├── audio.js       ← Audio processing
│   │       ├── playback.js    ← Playback engine
│   │       └── generator.js   ← Tab generation logic
│   └── package.json
└── modules/
    └── FretboardRenderer.js   ← Standalone fretboard renderer
```

---

## ⚙️ Key Features

1. **Tab Editor** — Polyphonic percussive fingerstyle notation with percussive layer (X notes, slaps, thumps)
2. **Fretboard Visualizer** — Real-time fretboard highlighting during playback
3. **Audio Playback** — Acoustic guitar synthesis via Web Audio API
4. **Audio-to-Tab** — Upload audio → auto-generate tablature
5. **Solo Generator** — AI-powered solo suggestions based on scale/key
6. **Local Storage** — Persistent tab management, no backend needed

---

## 🚀 How to Run Locally

```bash
cd tabcraft
npm run dev
# Opens at http://localhost:5173/
```

---

## 🔄 How to Push Updates (Auto-deploys to Live Site)

```bash
git add .
git commit -m "your change description"
git push origin main
# Vercel auto-deploys in ~60 seconds
```

---

## 🤖 Instructions for AI Agents

- **To understand the UI**: Visit https://tabcraft-five.vercel.app/
- **To read/edit code**: Clone https://github.com/hrs099/tabcraft
- **To suggest features**: All components are in `tabcraft/src/components/`
- **Stack**: React 18, Vite, TailwindCSS, Web Audio API, Tone.js
- **No backend** — everything runs client-side in the browser

# 🐍 Python Setup Guide — Astra Engine

This guide is for users who **do not have Python installed**.
Follow these steps **once**, then just double-click `start.bat` each time.

---

## Step 1: Download Python

1. Open your browser and go to: **https://www.python.org/downloads/**
2. Click the big yellow **"Download Python 3.x.x"** button
3. Save the installer to your computer

## Step 2: Install Python

1. **Run the downloaded installer**
2. ⚠️ **CHECK THE BOX**: `☑ Add Python to PATH` (at the bottom of the first screen)
3. Click **"Install Now"**
4. Wait for installation to finish
5. Click **"Close"**

> **Why "Add to PATH"?** This lets your computer find Python from any folder.
> If you skip this step, `start.bat` won't work.

## Step 3: Start the Astra Engine

1. Open the `tabcraft/server` folder in File Explorer
2. **Double-click `start.bat`**
3. A black terminal window will open
4. On the **first run**, it will:
   - Create an isolated Python environment (`venv/`)
   - Download and install AI libraries (~800 MB)
   - This takes **3–5 minutes** on a normal internet connection
5. When you see: **"Astra Engine is RUNNING"** — you're ready!

## Step 4: Open TabCraft

1. **Keep the Astra Engine terminal window open**
2. In a separate terminal, run:
   ```
   cd tabcraft
   npm run dev
   ```
3. Open **http://localhost:5173** in your browser
4. Navigate to **"Astra Transcribe"**
5. Upload an audio file and click **"Transcribe Audio"**

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `"Python is not installed"` | Re-run the Python installer. Make sure you check **"Add to PATH"** |
| `"Failed to install dependencies"` | Open a terminal, run `pip install --upgrade pip`, then try `start.bat` again |
| `"Cannot connect to engine"` (in browser) | Make sure `start.bat` is running and showing **"RUNNING"** |
| Downloads are very slow | The AI model (~500 MB) downloads once. Be patient on the first run |
| `"Port 8000 already in use"` | Close other `start.bat` windows, or restart your computer |

---

## What Does start.bat Do?

1. **Checks** that Python is installed
2. **Creates** an isolated virtual environment (won't affect your system)
3. **Installs** AI libraries (Basic Pitch, librosa, FastAPI)
4. **Starts** the Astra Engine server on `http://localhost:8000`

All downloads are cached in the `venv/` folder. Delete `venv/` to start fresh.

# Astra Engine Python Backend Setup Guide

Welcome to the Astra Music Dashboard update! This module moves all heavy audio logic to a powerful local Python server giving you vastly superior transcription accuracy.

Since this needs real Python running on your machine, here is a step-by-step guide to get it installed easily.

### Step 1: Download Python
1. Go to the official Python download page: https://www.python.org/downloads/
2. Click the big yellow button **"Download Python 3.12"** (or whatever the latest version is, as long as it's 3.10+).

### Step 2: Install Python (CRITICAL STEP)
1. Open the `.exe` file you just downloaded.
2. **STOP BEFORE YOU CLICK "INSTALL NOW"!** 
3. Look at the bottom of the installer window. You will see a small checkbox that says: **"Add python.exe to PATH"** (or something very similar). **YOU MUST CHECK THIS BOX.** If you forget, the server script won't work!
4. After checking that box, click **"Install Now"**.
5. Wait for the installation to finish and click "Close".

### Step 3: Run the Astra Backend
1. Open the project folder `Myarea/tabcraft/server`
2. You will see a file named **`start.bat`**. 
3. **Double-click `start.bat`**.
4. The first time you run this, a black window will pop up and it will take a few minutes to download the AI models (like basic-pitch and fastAPI) and set everything up. 
5. Once it finishes, you should see a message saying: `Application startup complete.` or `Uvicorn running on http://0.0.0.0:8000`.

### Step 4: Use TabCraft
As long as that black text window is open, your server is running!
You can now start TabCraft the normal way (`npm run dev`), upload an audio file to the new **Astra Transcribe** tab, and watch it generate SOTA tabs powered by the new backend!

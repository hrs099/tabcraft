@echo off
echo Starting Astra Engine...
cd /d "%~dp0"

IF NOT EXIST venv (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing requirements...
pip install -r requirements.txt

echo Starting server...
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause

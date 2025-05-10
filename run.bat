@echo off
setlocal enabledelayedexpansion

echo Starting AllergyBuster Backend Server...
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.11 or higher
    pause
    exit /b 1
)

:: Check if we're in the correct directory
if not exist "allergy-buster-hackathon\backend\manage.py" (
    echo Error: Please run this script from the project root directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

:: Change to the backend directory
cd allergy-buster-hackathon\backend

:: Check if Python virtual environment exists
if not exist "..\..\venv" (
    echo Creating virtual environment...
    python -m venv ..\..\venv
    if errorlevel 1 (
        echo Error: Failed to create virtual environment
        pause
        exit /b 1
    )
)

:: Activate virtual environment
echo Activating virtual environment...
call ..\..\venv\Scripts\activate.bat
if errorlevel 1 (
    echo Error: Failed to activate virtual environment
    pause
    exit /b 1
)

:: Install requirements if needed
echo Checking requirements...
pip install -r ..\..\requirements.txt
if errorlevel 1 (
    echo Error: Failed to install requirements
    pause
    exit /b 1
)

:: Check if .env file exists
if not exist ".env" (
    echo Creating .env file...
    echo DEBUG=True > .env
    echo SECRET_KEY=django-insecure-your-secret-key-here >> .env
)

:: Run migrations
echo Running migrations...
python manage.py migrate
if errorlevel 1 (
    echo Error: Failed to run migrations
    pause
    exit /b 1
)

:: Check if port 8000 is in use
netstat -ano | findstr :8000 >nul
if not errorlevel 1 (
    echo Warning: Port 8000 is already in use
    echo Please close any applications using port 8000
    pause
    exit /b 1
)

:: Start the server
echo Starting Django server...
start cmd /k "python manage.py runserver"

:: Wait for server to start
echo Waiting for server to start...
timeout /t 5 /nobreak >nul

:: Run server tests
echo Running server tests...
python test_server.py
if errorlevel 1 (
    echo Warning: Server tests failed
    echo Please check the server logs
)

echo.
echo Server is running at http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

:: Keep the window open
pause 
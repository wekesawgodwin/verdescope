@echo off
REM Starts the Verde-Scope MVP on http://localhost:8080 and opens it in the browser.
cd /d "%~dp0"
start "" http://localhost:8080/index.html
python -m http.server 8080

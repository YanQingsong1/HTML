@echo off
cd /d "C:\Users\闫清松\Documents\Axure\HTML"
start python -m http.server 8000
ping -n 5 127.0.0.1 >nul
start "" "http://localhost:8000/share_page.html"
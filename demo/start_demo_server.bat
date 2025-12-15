@echo off
REM Simple HTTP Server Launcher for Demo Dashboard
REM This script starts a local web server to serve the demo dashboard

echo ========================================
echo Customer Health Dashboard - Demo Server
echo ========================================
echo.
echo Starting local web server on port 8080...
echo.
echo Once started, open your browser and go to:
echo http://localhost:8080/customer_health_dashboard_demo.html
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

python -m http.server 8080

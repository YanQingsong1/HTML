@echo off
chcp 65001 >nul
title Axure 局域网分享服务

REM 自动定位到本脚本所在目录（跟随项目位置）
cd /d "%~dp0"

REM 检查 Python 是否可用
where python >nul 2>nul
if errorlevel 1 (
    echo [错误] 未检测到 Python，请先安装 Python 并加入 PATH。
    pause
    exit /b 1
)

REM 支持手动指定 IP 启动: axureyun.bat 192.168.137.1
set "LAN_IP=%~1"

if not defined LAN_IP for /f "delims=" %%a in ('powershell -NoProfile -Command "(Find-NetRoute -RemoteIPAddress 223.5.5.5 | Select-Object -First 1).IPAddress"') do set "LAN_IP=%%a"

REM 校验结果必须是合法的私网 IPv4（防止取到 0.0.0.0 等无效地址）
set "VALID="
if defined LAN_IP call :validate "%LAN_IP%"
if defined VALID goto :got_ip

REM 回退方案: 枚举所有私网 IPv4（排除 169.254.* / 127.* / 0.0.0.0 等无效地址）
for /f "delims=" %%a in ('powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -match '^(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)'} | Select-Object -First 1 -ExpandProperty IPAddress"') do set "LAN_IP=%%a"
if defined LAN_IP call :validate "%LAN_IP%"
if defined VALID goto :got_ip

echo [警告] 未能自动获取有效的局域网 IP。
echo 可手动指定后启动，例如:
echo     axureyun.bat 192.168.137.1
set "LAN_IP=localhost"

:got_ip
REM 生成项目清单 projects.json（python http.server 无法提供目录列表，页面依赖此文件发现项目）
powershell -NoProfile -Command "$q = [char]34; $dirs = Get-ChildItem -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'index.html') }; $items = $dirs | ForEach-Object { $n = ($_.Name -replace '\\','\\\\') -replace $q, ('\' + $q); $p = [uri]::EscapeDataString($_.Name); '{' + $q + 'name' + $q + ':' + $q + $n + $q + ',' + $q + 'path' + $q + ':' + $q + '/' + $p + '/' + $q + '}' }; $json = '[' + ($items -join ',') + ']'; [System.IO.File]::WriteAllText((Join-Path (Get-Location) 'projects.json'), $json, (New-Object System.Text.UTF8Encoding($false)))"
if not exist "projects.json" (
    echo [警告] projects.json 生成失败，页面可能无法列出项目。
)

REM 显式绑定 0.0.0.0，确保局域网内其他设备可访问
start "AxureServer" python -m http.server 8000 --bind 0.0.0.0

REM 等待服务器启动
ping -n 3 127.0.0.1 >nul

echo ================================================
echo  局域网访问地址（分享给同事用这个）:
echo      http://%LAN_IP%:8000/局域网.html
echo.
echo  本机访问地址:
echo      http://localhost:8000/局域网.html
echo.

REM 列出本机所有候选私网 IP（多网卡时供手动选择，如开了热点）
for /f "delims=" %%a in ('powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -match '^(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)'} | ForEach-Object {$_.IPAddress + '  [' + $_.InterfaceAlias + ']'}"') do echo  候选地址: http://%%a:8000/局域网.html

echo.
echo  提示: 若其他设备无法访问，请检查 Windows 防火墙
echo  是否放行 Python 或 8000 端口入站规则。
echo ================================================

REM 直接用局域网 IP 打开，保证页面内生成的链接其他设备可用
start "" "http://%LAN_IP%:8000/局域网.html"
pause
exit /b 0

:validate
echo %~1| findstr /r "^10\. ^172\. ^192\.168" >nul
if errorlevel 1 exit /b 1
set "VALID=1"
exit /b 0

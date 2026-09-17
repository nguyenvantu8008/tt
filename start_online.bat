@echo off
chcp 65001 > nul
title BPOTime - He thong Cham Cong & Quan Ly Hien Truong Online

echo ======================================================================
echo           BPOTIME - CHẤM CÔNG & QUẢN LÝ HIỆN TRƯỜNG ONLINE
echo ======================================================================
echo.
echo [1/3] Đang kiểm tra cơ sở dữ liệu PostgreSQL Cloud (Neon)...
echo.
echo [2/3] Đang khởi động Backend API & Web SPA trên cổng 5246...
start /b "" dotnet run --project "src/BPOTime.Api/BPOTime.Api.csproj" --no-build > logs/backend_runtime.log 2>&1

timeout /t 3 /nobreak > nul

echo [3/3] Đang kết nối Cloudflare Tunnel tạo đường truyền bảo mật HTTPS...
echo.
echo ======================================================================
echo ĐƯỜNG DẪN TRUY CẬP CÔNG KHAI (INTERNET / ĐIỆN THOẠI DI ĐỘNG):
echo Quét mã QR hoặc mở link HTTPS hiển thị bên dưới trên điện thoại:
echo ======================================================================
echo.
.\cloudflared.exe tunnel --url http://localhost:5246
pause

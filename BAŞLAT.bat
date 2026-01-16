@echo off
echo ========================================
echo  ISDEMIR Acil Servis Nobet Sistemi
echo  Sunucu Baslatiliyor...
echo ========================================
echo.
echo QR kodu mobilde baglanmak icin kullanin!
echo Tarayici 10 saniye sonra otomatik acilacak.
echo.

REM Expo sunucusunu başlat (QR kod göster)
start "Expo Server" cmd /k "npx expo start"

echo Sunucu baslatildi, tarayici aciliyor...
timeout /t 10 /nobreak > nul

REM Tarayıcıyı aç
start http://localhost:8081

exit

@echo off
chcp 65001 >nul
rem Hastane yönetim panelini açar (Windows). Çift tıklayın.
rem Önce Docker Desktop açık olmalıdır.
cd /d "%~dp0"

if not exist node_modules (
  echo Ilk calistirma: gerekli dosyalar kuruluyor...
  call npm install || goto hata
)
if not exist apps\admin\.env (
  echo.
  echo apps\admin\.env dosyasi bulunamadi. README dosyasindaki "Projeyi ilk kez calistirma" adimlarini uygulayin.
  goto hata
)

echo Veritabani baslatiliyor ve panel tarayicida aciliyor...
echo Paneli kapatmak icin bu pencereyi kapatin.
call npm run panel || goto hata
goto :eof

:hata
echo.
echo Bir sorun olustu. Docker Desktop acik mi? Yukaridaki mesaji kontrol edin.
pause

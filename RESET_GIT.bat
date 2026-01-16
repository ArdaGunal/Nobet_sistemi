@echo off
color 0c
echo ===================================================
echo DIKKAT: BU ISLEM YEREL GIT GECMISINI SIFIRLAYACAK!
echo ===================================================
echo Bu islem, token sizintisini temizlemek icin yapilmaktadir.
echo Devam etmek icin ENTER tusuna basin, iptal etmek icin pencereyi kapatin.
pause > nul

echo .git klasoru siliniyor...
rmdir /s /q .git

echo Git yeniden baslatiliyor...
git init
git add .
git commit -m "Initial commit (Secure Reset)"

echo.
echo ===================================================
echo ISLEM TAMAMLANDI!
echo ===================================================
echo Simdi yapmaniz gerekenler:
echo 1. GitHub'da bu repoyu SILIN ve yeni, bos bir repo olusturun.
echo 2. Asagidaki komutlari calistirarak yeni repoya yukleyin:
echo.
echo git remote add origin <YENI_REPO_URL>
echo git push -u origin main
echo.
pause

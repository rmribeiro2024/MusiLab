@echo off
echo [MusiLab] Auto-sync iniciado. Verificando mudancas a cada 5s...
echo Deixe esta janela aberta enquanto desenvolve.
echo.
:loop
git fetch origin main --quiet 2>nul
git diff HEAD origin/main --quiet 2>nul
if errorlevel 1 (
    echo [%time%] Mudancas detectadas, atualizando...
    git pull origin main
    echo.
)
timeout /t 5 /nobreak > nul
goto loop

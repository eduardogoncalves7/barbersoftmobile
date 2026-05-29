@echo off
cd /d c:\barbersoftv2-fixed

echo Configurando git...
git config user.name "Copilot"
git config user.email "223556219+Copilot@users.noreply.github.com"

echo.
echo Inicializando repositorio git...
git init

echo.
echo Adicionando arquivos (respeitando .gitignore)...
git add .

echo.
echo Fazendo commit...
git commit -m "Initial commit: BarberSoft mobile and API - Excluded: .env files, node_modules, database files, and other sensitive data" --allow-empty

echo.
echo Verificando status...
git status

echo.
echo Mostrando log...
git log --oneline -5

pause

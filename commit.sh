#!/bin/bash
cd /c/barbersoftv2-fixed

# Configurar git localmente
git config user.name "Copilot"
git config user.email "223556219+Copilot@users.noreply.github.com"

# Inicializar repositório
git init

# Adicionar arquivos (git respeitará .gitignore)
git add .

# Fazer commit
git commit -m "Initial commit: BarberSoft mobile and API

- BarberSoft: React Native mobile app with TypeScript
- barbersoft-api: Node.js API server
- Excluded: .env files, node_modules, database files, and other sensitive data

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

# Mostrar status
echo "Git log:"
git log --oneline

echo ""
echo "Status dos arquivos:"
git status

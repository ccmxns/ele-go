@echo off
cd /d %~dp0

git pull origin main
git status
git add .
git commit -m "update"
git push origin main
@echo off
set /p msg="Enter Commit Message (or press Enter for default): "
if "%msg%"=="" set msg="auto-deploy: updates and fixes"

echo Adding files...
git add .
echo Committing changes...
git commit -m "%msg%"
echo Pushing to GitHub...
git push origin main
echo Deployment triggered! Render/Vercel will update in a minute.
pause

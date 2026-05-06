@echo off
cd /d "c:\Users\BARAKO\Desktop\myAgent.worktrees\copilot-worktree-2026-05-04T10-49-21"

echo ===== Step 1: Check Firebase CLI Authentication Status =====
call firebase login:list
echo.

echo ===== Step 2: Check Firebase Project Configuration =====
call firebase use
echo.

echo ===== Step 3: Build Next.js Application =====
call npm run build
echo.

echo ===== Step 4: Deploy to Firebase Hosting =====
call firebase deploy --only hosting
echo.

echo ===== Deployment Complete =====

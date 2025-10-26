@echo off
echo.
echo ========================================
echo BudgetBuddy Documentation Update Check
echo ========================================
echo.

echo Before pushing to GitHub, please ensure:
echo.
echo [CHANGELOG.md]
echo   - Add new version entry with today's date
echo   - List all features added in this session
echo   - Document all issues fixed with root cause
echo   - Record lessons learned
echo   - Update progress metrics
echo.
echo [DEVELOPMENT_LOG.md]
echo   - Add session accomplishments
echo   - Document issues with detailed resolutions
echo   - Record lessons learned with context
echo   - Update progress metrics
echo.
echo [README.md]
echo   - Update project status phase
echo   - Update overall progress percentage
echo   - Update recent achievements
echo   - Verify all links work
echo.
echo [Task Status]
echo   - Mark completed tasks in tasks.md
echo   - Update development-status.md
echo.

set /p answer="Have you updated all documentation? (y/n): "
if /i "%answer%"=="y" (
    echo.
    echo Documentation confirmed! Ready to push.
    echo.
    echo Next steps:
    echo   git add .
    echo   git commit -m "your message"
    echo   git push origin develop
) else (
    echo.
    echo Please update documentation first.
    echo Use the checklist above to ensure completeness.
)

pause

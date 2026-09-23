---
inclusion: manual
description: "Analyzes AWS CloudWatch logs when explicitly requested"
---

AWS analysis requested:

1. Download logs: powershell -ExecutionPolicy Bypass -File scripts/download-aws-logs.ps1
2. Review ANALYSIS_SUMMARY.md
3. Identify and fix issues
4. Cleanup: Remove-Item -Recurse -Force temp-logs
5. Verify fixes

Work autonomously to resolve issues.

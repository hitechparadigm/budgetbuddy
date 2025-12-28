# Delete Corrupted Budgets Script
# This script deletes all budgets from DynamoDB to fix data structure issues

param(
    [string]$FamilyId = "family_mock_user_id",
    [string]$TableName = "budgetbuddy-dev-main",
    [string]$Region = "us-east-1"
)

Write-Host "`n🗑️  Delete Corrupted Budgets Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target Family ID: $FamilyId" -ForegroundColor Yellow
Write-Host "DynamoDB Table: $TableName" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host ""

# Confirm before proceeding
Write-Host "⚠️  WARNING: This will delete ALL budgets for this family!" -ForegroundColor Red
Write-Host "Press Ctrl+C to cancel, or any key to continue..." -ForegroundColor Red
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""

try {
    # Query all items for this family
    Write-Host "🔍 Searching for budgets..." -ForegroundColor Cyan

    $queryResult = aws dynamodb query `
        --table-name $TableName `
        --key-condition-expression "PK = :pk" `
        --expression-attribute-values '{":pk":{"S":"FAMILY#'$FamilyId'"}}' `
        --region $Region `
        --output json | ConvertFrom-Json

    if ($queryResult.Items.Count -eq 0) {
        Write-Host "✅ No items found for this family" -ForegroundColor Green
        exit 0
    }

    Write-Host "📊 Found $($queryResult.Items.Count) total items" -ForegroundColor Yellow

    # Filter for budget items
    $budgets = $queryResult.Items | Where-Object { $_.entityType.S -eq "BUDGET" }

    if ($budgets.Count -eq 0) {
        Write-Host "✅ No budgets to delete" -ForegroundColor Green
        exit 0
    }

    Write-Host "💰 Found $($budgets.Count) budget(s) to delete" -ForegroundColor Yellow
    Write-Host ""

    # Delete each budget
    $deletedCount = 0
    foreach ($budget in $budgets) {
        $month = $budget.month.S
        $pk = $budget.PK.S
        $sk = $budget.SK.S

        try {
            aws dynamodb delete-item `
                --table-name $TableName `
                --key "{`"PK`":{`"S`":`"$pk`"},`"SK`":{`"S`":`"$sk`"}}" `
                --region $Region `
                --output json | Out-Null

            Write-Host "  ✓ Deleted budget for month: $month" -ForegroundColor Green
            $deletedCount++
        }
        catch {
            Write-Host "  ✗ Failed to delete budget $month : $_" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "✅ Successfully deleted $deletedCount of $($budgets.Count) budgets" -ForegroundColor Green
    Write-Host ""
    Write-Host "✨ Done! You can now create fresh budgets through the app." -ForegroundColor Cyan
    Write-Host "💡 Remember to also run in browser console: localStorage.clear()" -ForegroundColor Yellow
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure you have AWS CLI installed and configured:" -ForegroundColor Yellow
    Write-Host "  aws configure" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

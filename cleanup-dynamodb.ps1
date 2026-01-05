# Cleanup script to delete all records from DynamoDB table
# This ensures a completely clean state for testing

$TableName = "budgetbuddy-main"
$Profile = "hitechparadigm"

Write-Host "Starting DynamoDB cleanup process..." -ForegroundColor Yellow

# Get all items from DynamoDB (just PK and SK)
Write-Host "Fetching all items from DynamoDB..." -ForegroundColor Cyan
$items = aws dynamodb scan --table-name $TableName --projection-expression "PK, SK" --profile $Profile --output json | ConvertFrom-Json

if ($items.Items.Count -eq 0) {
    Write-Host "No items found in DynamoDB table" -ForegroundColor Green
    exit 0
}

Write-Host "Found $($items.Items.Count) items to delete" -ForegroundColor Yellow

Write-Host "Deleting all items from DynamoDB..." -ForegroundColor Red

foreach ($item in $items.Items) {
    $pk = $item.PK.S
    $sk = $item.SK.S

    Write-Host "Deleting: PK=$pk, SK=$sk" -ForegroundColor White

    try {
        $keyJson = @{
            PK = @{ S = $pk }
            SK = @{ S = $sk }
        } | ConvertTo-Json -Compress

        aws dynamodb delete-item --table-name $TableName --key $keyJson --profile $Profile
        Write-Host "  [SUCCESS] Deleted item" -ForegroundColor Green
    } catch {
        Write-Host "  [ERROR] Failed to delete item: $_" -ForegroundColor Red
    }
}

Write-Host "DynamoDB cleanup completed!" -ForegroundColor Green
Write-Host "All old data has been removed." -ForegroundColor Cyan

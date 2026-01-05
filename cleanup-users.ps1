# Cleanup script to delete all test users from Cognito and DynamoDB
# This allows reusing email addresses for testing

$UserPoolId = "us-east-1_LAkOBLENO"
$TableName = "budgetbuddy-main"
$Profile = "hitechparadigm"

Write-Host "Starting user cleanup process..." -ForegroundColor Yellow

# Get all users from Cognito
Write-Host "Fetching all users from Cognito..." -ForegroundColor Cyan
$users = aws cognito-idp list-users --user-pool-id $UserPoolId --profile $Profile | ConvertFrom-Json

if ($users.Users.Count -eq 0) {
    Write-Host "No users found in Cognito User Pool" -ForegroundColor Green
    exit 0
}

Write-Host "Found $($users.Users.Count) users to delete:" -ForegroundColor Yellow
foreach ($user in $users.Users) {
    $email = ($user.Attributes | Where-Object { $_.Name -eq "email" }).Value
    $userId = ($user.Attributes | Where-Object { $_.Name -eq "custom:userId" }).Value
    Write-Host "  - $email (ID: $userId)" -ForegroundColor White
}

Write-Host ""
Write-Host "Deleting users from Cognito..." -ForegroundColor Red

foreach ($user in $users.Users) {
    $email = ($user.Attributes | Where-Object { $_.Name -eq "email" }).Value
    $userId = ($user.Attributes | Where-Object { $_.Name -eq "custom:userId" }).Value
    $username = $user.Username

    Write-Host "Deleting $email..." -ForegroundColor Yellow

    # Delete from Cognito
    try {
        aws cognito-idp admin-delete-user --user-pool-id $UserPoolId --username $username --profile $Profile
        Write-Host "  [SUCCESS] Deleted from Cognito" -ForegroundColor Green
    } catch {
        Write-Host "  [ERROR] Failed to delete from Cognito: $_" -ForegroundColor Red
    }

    # Delete user profile from DynamoDB
    if ($userId) {
        try {
            aws dynamodb delete-item --table-name $TableName --key "{\"PK\":{\"S\":\"USER#$userId\"},\"SK\":{\"S\":\"PROFILE\"}}" --profile $Profile
            Write-Host "  [SUCCESS] Deleted user profile from DynamoDB" -ForegroundColor Green
        } catch {
            Write-Host "  [ERROR] Failed to delete user profile from DynamoDB: $_" -ForegroundColor Red
        }

        # Delete family record from DynamoDB
        try {
            $familyId = "family_$userId"
            aws dynamodb delete-item --table-name $TableName --key "{\"PK\":{\"S\":\"FAMILY#$familyId\"},\"SK\":{\"S\":\"METADATA\"}}" --profile $Profile
            Write-Host "  [SUCCESS] Deleted family record from DynamoDB" -ForegroundColor Green
        } catch {
            Write-Host "  [ERROR] Failed to delete family record from DynamoDB: $_" -ForegroundColor Red
        }
    }

    Write-Host ""
}

Write-Host "User cleanup completed!" -ForegroundColor Green
Write-Host "You can now reuse any email addresses for testing." -ForegroundColor Cyan

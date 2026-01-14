#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Check API Gateway integration for /auth/onboarding endpoint

.DESCRIPTION
    This script verifies which Lambda function is integrated with the
    /auth/onboarding endpoint in API Gateway and checks recent invocations.

.EXAMPLE
    .\scripts\check-api-gateway-integration.ps1
#>

Write-Host "=== API Gateway Integration Check ===" -ForegroundColor Cyan
Write-Host ""

# Get API Gateway ID
Write-Host "1. Finding API Gateway..." -ForegroundColor Yellow
$apiId = aws apigateway get-rest-apis --query "items[?name=='budgetbuddy-api'].id" --output text

if (-not $apiId) {
    Write-Host "❌ API Gateway 'budgetbuddy-api' not found" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found API Gateway: $apiId" -ForegroundColor Green
Write-Host ""

# Get resources
Write-Host "2. Finding /auth/onboarding resource..." -ForegroundColor Yellow
$resources = aws apigateway get-resources --rest-api-id $apiId --output json | ConvertFrom-Json

$authResource = $resources.items | Where-Object { $_.path -eq "/auth" }
$onboardingResource = $resources.items | Where-Object { $_.path -eq "/auth/onboarding" }

if (-not $onboardingResource) {
    Write-Host "❌ /auth/onboarding resource not found" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found resource: $($onboardingResource.path) (ID: $($onboardingResource.id))" -ForegroundColor Green
Write-Host ""

# Get POST method integration
Write-Host "3. Checking POST method integration..." -ForegroundColor Yellow
$method = aws apigateway get-method --rest-api-id $apiId --resource-id $onboardingResource.id --http-method POST --output json | ConvertFrom-Json

if (-not $method) {
    Write-Host "❌ POST method not found on /auth/onboarding" -ForegroundColor Red
    exit 1
}

$integrationUri = $method.methodIntegration.uri

Write-Host "✅ Integration URI: $integrationUri" -ForegroundColor Green
Write-Host ""

# Extract Lambda function name from URI
if ($integrationUri -match "function:([^/]+)/invocations") {
    $lambdaName = $matches[1]
    Write-Host "4. Lambda Function: $lambdaName" -ForegroundColor Cyan
    Write-Host ""

    if ($lambdaName -eq "budgetbuddy-auth-onboarding") {
        Write-Host "✅ CORRECT: Using new standalone auth-onboarding Lambda" -ForegroundColor Green
    } elseif ($lambdaName -eq "budgetbuddy-auth") {
        Write-Host "❌ INCORRECT: Still using old monolithic auth Lambda" -ForegroundColor Red
        Write-Host "   This explains why budget creation is failing!" -ForegroundColor Red
    } else {
        Write-Host "⚠️  UNEXPECTED: Using Lambda '$lambdaName'" -ForegroundColor Yellow
    }
    Write-Host ""

    # Check recent Lambda invocations
    Write-Host "5. Checking recent Lambda invocations (last 30 minutes)..." -ForegroundColor Yellow
    $logGroup = "/aws/lambda/$lambdaName"

    Write-Host "   Log Group: $logGroup" -ForegroundColor Gray

    # Get recent log events
    $since = [DateTimeOffset]::UtcNow.AddMinutes(-30).ToUnixTimeMilliseconds()
    $logStreams = aws logs describe-log-streams --log-group-name $logGroup --order-by LastEventTime --descending --max-items 5 --output json 2>$null | ConvertFrom-Json

    if ($logStreams -and $logStreams.logStreams) {
        Write-Host "   Found $($logStreams.logStreams.Count) recent log streams" -ForegroundColor Gray

        foreach ($stream in $logStreams.logStreams) {
            $lastEvent = [DateTimeOffset]::FromUnixTimeMilliseconds($stream.lastEventTimestamp).LocalDateTime
            Write-Host "   - $($stream.logStreamName)" -ForegroundColor Gray
            Write-Host "     Last event: $lastEvent" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  No recent log streams found (Lambda may not have been invoked)" -ForegroundColor Yellow
    }
    Write-Host ""

} else {
    Write-Host "❌ Could not parse Lambda function name from URI" -ForegroundColor Red
    Write-Host "   URI: $integrationUri" -ForegroundColor Gray
}

# Check deployment stage
Write-Host "6. Checking deployment stage..." -ForegroundColor Yellow
$stage = aws apigateway get-stage --rest-api-id $apiId --stage-name v1 --output json | ConvertFrom-Json

if ($stage) {
    $deploymentTime = [DateTimeOffset]::FromUnixTimeMilliseconds($stage.lastUpdatedDate).LocalDateTime
    Write-Host "✅ Stage 'v1' last deployed: $deploymentTime" -ForegroundColor Green
    Write-Host ""

    # Check if deployment is recent (within last hour)
    $hourAgo = (Get-Date).AddHours(-1)
    if ($deploymentTime -gt $hourAgo) {
        Write-Host "✅ Deployment is recent (within last hour)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Deployment is older than 1 hour" -ForegroundColor Yellow
        Write-Host "   Last deployment: $deploymentTime" -ForegroundColor Gray
        Write-Host "   This might indicate API Gateway needs redeployment" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Could not get stage information" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "API Gateway ID: $apiId"
Write-Host "Endpoint: /auth/onboarding"
Write-Host "Integration: $integrationUri"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. If using wrong Lambda, redeploy API stack with: npm run deploy:dev" -ForegroundColor Gray
Write-Host "2. Check CloudWatch logs for the Lambda function" -ForegroundColor Gray
Write-Host "3. Test onboarding endpoint again" -ForegroundColor Gray

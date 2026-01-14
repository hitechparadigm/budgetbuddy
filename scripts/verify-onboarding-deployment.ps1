# Verification script for auth-onboarding Lambda deployment
# This script checks if the new Lambda is deployed and properly integrated

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Auth-Onboarding Deployment Verification" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$stackDeployed = $false
$lambdaExists = $false

# Check 1: CDK Stack Status
Write-Host "1. Checking CDK Stack Status..." -ForegroundColor Yellow
try {
    $stackStatus = aws cloudformation describe-stacks --stack-name budgetbuddy-dev-auth-onboarding --query "Stacks[0].StackStatus" --output text 2>&1

    if ($stackStatus -match "does not exist" -or $stackStatus -match "Unable to locate credentials") {
        Write-Host "❌ Stack NOT deployed" -ForegroundColor Red
        Write-Host "   Action: Run 'cd infrastructure; npx cdk deploy budgetbuddy-dev-auth-onboarding'" -ForegroundColor Yellow
        $stackDeployed = $false
    } else {
        Write-Host "✅ Stack Status: $stackStatus" -ForegroundColor Green
        $stackDeployed = $true
    }
} catch {
    Write-Host "❌ Error checking stack status: $_" -ForegroundColor Red
    $stackDeployed = $false
}
Write-Host ""

# Check 2: Lambda Function Exists
Write-Host "2. Checking Lambda Function..." -ForegroundColor Yellow
try {
    $lambdaStatus = aws lambda get-function --function-name budgetbuddy-auth-onboarding --query "Configuration.State" --output text 2>&1

    if ($lambdaStatus -match "ResourceNotFoundException" -or $lambdaStatus -match "Unable to locate credentials") {
        Write-Host "❌ Lambda function NOT found" -ForegroundColor Red
        Write-Host "   Action: Deploy the auth-onboarding stack first" -ForegroundColor Yellow
        $lambdaExists = $false
    } else {
        Write-Host "✅ Lambda State: $lambdaStatus" -ForegroundColor Green
        $lambdaExists = $true

        # Get Lambda details
        $lambdaMemory = aws lambda get-function --function-name budgetbuddy-auth-onboarding --query "Configuration.MemorySize" --output text 2>$null
        $lambdaTimeout = aws lambda get-function --function-name budgetbuddy-auth-onboarding --query "Configuration.Timeout" --output text 2>$null
        $lambdaRuntime = aws lambda get-function --function-name budgetbuddy-auth-onboarding --query "Configuration.Runtime" --output text 2>$null

        Write-Host "   Memory: ${lambdaMemory}MB" -ForegroundColor Gray
        Write-Host "   Timeout: ${lambdaTimeout}s" -ForegroundColor Gray
        Write-Host "   Runtime: ${lambdaRuntime}" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error checking Lambda function: $_" -ForegroundColor Red
    $lambdaExists = $false
}
Write-Host ""

# Check 3: Lambda Layers
if ($lambdaExists) {
    Write-Host "3. Checking Lambda Layers..." -ForegroundColor Yellow
    try {
        $layers = aws lambda get-function --function-name budgetbuddy-auth-onboarding --query "Configuration.Layers[*].Arn" --output text 2>$null

        if ([string]::IsNullOrWhiteSpace($layers)) {
            Write-Host "⚠️  No layers attached" -ForegroundColor Yellow
        } else {
            Write-Host "✅ Layers attached:" -ForegroundColor Green
            $layers -split "`t" | ForEach-Object {
                Write-Host "   - $_" -ForegroundColor Gray
            }
        }
    } catch {
        Write-Host "⚠️  Error checking layers: $_" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Check 4: CloudWatch Log Group
Write-Host "4. Checking CloudWatch Log Group..." -ForegroundColor Yellow
try {
    $logGroup = aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/budgetbuddy-auth-onboarding" --query "logGroups[0].logGroupName" --output text 2>&1

    if ($logGroup -match "None" -or $logGroup -match "Unable to locate credentials") {
        Write-Host "❌ Log group NOT found" -ForegroundColor Red
    } else {
        Write-Host "✅ Log Group: $logGroup" -ForegroundColor Green

        # Get retention days
        $retention = aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/budgetbuddy-auth-onboarding" --query "logGroups[0].retentionInDays" --output text 2>$null
        Write-Host "   Retention: ${retention} days" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error checking log group: $_" -ForegroundColor Red
}
Write-Host ""

# Check 5: Recent Invocations
if ($lambdaExists) {
    Write-Host "5. Checking Recent Invocations..." -ForegroundColor Yellow
    try {
        $startTime = (Get-Date).AddHours(-1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss")
        $endTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss")

        $invocations = aws cloudwatch get-metric-statistics `
            --namespace AWS/Lambda `
            --metric-name Invocations `
            --dimensions Name=FunctionName,Value=budgetbuddy-auth-onboarding `
            --start-time $startTime `
            --end-time $endTime `
            --period 3600 `
            --statistics Sum `
            --query "Datapoints[0].Sum" `
            --output text 2>$null

        if ($invocations -eq "None" -or [string]::IsNullOrWhiteSpace($invocations)) {
            Write-Host "⚠️  No invocations in the last hour" -ForegroundColor Yellow
            Write-Host "   This is expected if the Lambda was just deployed" -ForegroundColor Gray
        } else {
            Write-Host "✅ Invocations (last hour): $invocations" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Error checking invocations: $_" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if ($stackDeployed -and $lambdaExists) {
    Write-Host "✅ Auth-Onboarding Lambda is DEPLOYED" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Redeploy API stack to update API Gateway integration:" -ForegroundColor White
    Write-Host "   cd infrastructure; npx cdk deploy budgetbuddy-dev-api" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Test onboarding flow with a new user account" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Monitor CloudWatch logs:" -ForegroundColor White
    Write-Host "   aws logs tail /aws/lambda/budgetbuddy-auth-onboarding --follow" -ForegroundColor Gray
} else {
    Write-Host "❌ Auth-Onboarding Lambda is NOT deployed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Required Actions:" -ForegroundColor Yellow
    Write-Host "1. Deploy the auth-onboarding stack:" -ForegroundColor White
    Write-Host "   cd infrastructure; npx cdk deploy budgetbuddy-dev-auth-onboarding" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Deploy the API stack to update routing:" -ForegroundColor White
    Write-Host "   cd infrastructure; npx cdk deploy budgetbuddy-dev-api" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Run this script again to verify deployment" -ForegroundColor White
}

Write-Host ""
Write-Host "For detailed instructions, see: DEPLOYMENT_INSTRUCTIONS.md" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

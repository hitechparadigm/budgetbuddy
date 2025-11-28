#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Deploy BudgetBuddy web application to AWS S3 and CloudFront

.DESCRIPTION
    Builds the React web app and deploys it to S3, then invalidates CloudFront cache

.PARAMETER Profile
    AWS profile to use (default: hitechparadigm)

.EXAMPLE
    .\scripts\deploy-web-app.ps1
    .\scripts\deploy-web-app.ps1 -Profile hitechparadigm
#>

param(
    [string]$Profile = "hitechparadigm"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 BudgetBuddy Web App Deployment" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$S3_BUCKET = "budgetbuddy-web-app"
$CLOUDFRONT_ID = "E1L1SU9OV8L4YR"
$CLOUDFRONT_URL = "https://d1ueeugn9zcx7n.cloudfront.net"
$WEB_APP_DIR = "packages/web-app"

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
} catch {
    Write-Host "❌ AWS CLI is not installed" -ForegroundColor Red
    Write-Host "Install from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check if profile exists
try {
    aws sts get-caller-identity --profile $Profile | Out-Null
    Write-Host "✅ AWS credentials verified (profile: $Profile)" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS profile '$Profile' not found or invalid" -ForegroundColor Red
    Write-Host "Run: aws configure --profile $Profile" -ForegroundColor Yellow
    exit 1
}

# Step 1: Install dependencies
Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
Set-Location $WEB_APP_DIR
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Step 2: Build web app
Write-Host ""
Write-Host "🔨 Building web application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build completed" -ForegroundColor Green

# Step 3: Deploy to S3
Write-Host ""
Write-Host "☁️  Deploying to S3 bucket: $S3_BUCKET..." -ForegroundColor Yellow
aws s3 sync dist/ s3://$S3_BUCKET --delete --profile $Profile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ S3 deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Deployed to S3" -ForegroundColor Green

# Step 4: Invalidate CloudFront cache
Write-Host ""
Write-Host "🔄 Invalidating CloudFront cache..." -ForegroundColor Yellow
$invalidation = aws cloudfront create-invalidation `
    --distribution-id $CLOUDFRONT_ID `
    --paths "/*" `
    --profile $Profile `
    --output json | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CloudFront invalidation failed" -ForegroundColor Red
    exit 1
}

$invalidationId = $invalidation.Invalidation.Id
Write-Host "✅ CloudFront invalidation created: $invalidationId" -ForegroundColor Green

# Return to root directory
Set-Location ../..

# Summary
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Deployment Details:" -ForegroundColor White
Write-Host "  • S3 Bucket: $S3_BUCKET" -ForegroundColor White
Write-Host "  • CloudFront ID: $CLOUDFRONT_ID" -ForegroundColor White
Write-Host "  • Invalidation ID: $invalidationId" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Your app is live at:" -ForegroundColor White
Write-Host "  $CLOUDFRONT_URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: CloudFront cache invalidation may take 5-10 minutes" -ForegroundColor Yellow
Write-Host ""

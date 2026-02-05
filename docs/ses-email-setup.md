# AWS SES Email Setup Guide

## Problem

Family invitations are not being sent because AWS SES is in **sandbox mode** with no verified email addresses.

## Current Status

- ✅ SES is enabled
- ❌ SES is in SANDBOX mode (not production)
- ❌ No verified email identities
- ❌ Cannot send emails to arbitrary addresses

## Quick Fix (For Testing)

### Step 1: Verify Your Email Address

Run this command to verify the email you want to test with:

```bash
node scripts/setup-ses-email.js verify dima.pmp@gmail.com
```

This will send a verification email to `dima.pmp@gmail.com`. Click the link in that email to verify.

### Step 2: Verify Sender Email

You also need to verify the sender email. You have two options:

**Option A: Use your real email as sender**

```bash
node scripts/setup-ses-email.js verify your-real-email@gmail.com
```

Then update the email Lambda to use this email:

- Edit `backend/functions/email/index.js`
- Change `FROM_EMAIL` to your verified email

**Option B: Verify a domain** (requires DNS access)

- Verify `budgetbuddy.com` domain in AWS SES
- This allows sending from any `@budgetbuddy.com` address

### Step 3: Test Invitation

After both emails are verified:

1. Wait 2-3 minutes for verification to complete
2. Try sending the family invitation again
3. The email should now be delivered

## Long-Term Solution (Production)

### Request Production Access

To send emails to ANY address (not just verified ones):

1. Go to AWS Console → Amazon SES → Account dashboard
2. Click **"Request production access"**
3. Fill out the form:
   - **Use case**: Transactional emails (family invitations, notifications)
   - **Website URL**: https://app.budgetbuddy.com
   - **Expected volume**: Start with 100 emails/day
   - **Bounce handling**: Describe your bounce handling process
4. Submit the request
5. AWS typically approves within 24 hours

### Benefits of Production Mode

- ✅ Send to any email address
- ✅ No need to verify recipients
- ✅ Higher sending limits
- ✅ Better deliverability

## Checking Status

Check your current SES status:

```bash
node scripts/setup-ses-email.js list
```

This shows:

- Sandbox vs Production mode
- Verified email identities
- Send quota and limits

## Troubleshooting

### Email Not Received

1. **Check spam folder** - SES emails often go to spam initially
2. **Check verification status**:
   ```bash
   node scripts/setup-ses-email.js list
   ```
3. **Check CloudWatch logs** for the email Lambda:
   ```bash
   aws logs tail /aws/lambda/budgetbuddy-email-family --follow --profile hitechparadigm
   ```

### 409 Conflict Error

If you get a 409 error when sending invitations:

1. **Check for pending invitations**:

   ```bash
   node scripts/debug-family-invitation.js <your-user-id>
   ```

2. **Revoke stuck invitations** via the Family Settings UI

3. **Or clean up manually** using AWS Console → DynamoDB

### Verification Email Not Received

1. Check spam folder
2. Wait 5-10 minutes (can be slow)
3. Try verifying again:
   ```bash
   node scripts/setup-ses-email.js verify your-email@example.com
   ```

## Alternative: Use a Different Email Service

If you need immediate email functionality without waiting for SES production access:

1. **SendGrid** - Free tier: 100 emails/day
2. **Mailgun** - Free tier: 5,000 emails/month
3. **Postmark** - Free tier: 100 emails/month

These services work immediately without sandbox restrictions.

## Summary

**For immediate testing:**

```bash
# Verify your test email
node scripts/setup-ses-email.js verify dima.pmp@gmail.com

# Verify sender email
node scripts/setup-ses-email.js verify your-sender@gmail.com

# Update FROM_EMAIL in backend/functions/email/index.js
```

**For production:**

- Request SES production access (takes 24 hours)
- Or use alternative email service (SendGrid, Mailgun, etc.)

# BudgetBuddy Notifications User Guide

## Overview

BudgetBuddy keeps you informed about your spending with smart notifications. Get real-time budget alerts when you're approaching your limits and daily reminders to log your expenses.

## Features

### Budget Alerts

Receive automatic notifications when your spending reaches important thresholds:

- **80% Alert**: Warning that you're approaching your budget limit
- **90% Alert**: Urgent warning that you're close to exceeding your budget
- **100% Alert**: Critical alert that you've reached or exceeded your budget

Budget alerts are sent to all family members so everyone stays informed.

### Daily Reminders

Get gentle reminders to log your daily expenses. Reminders are sent:

- At your preferred time each day
- Only if you haven't logged a transaction in 3+ days
- Respecting your quiet hours preferences

## Getting Started

### Mobile App (iOS/Android)

1. **Enable Notifications**
   - Open the BudgetBuddy app
   - Go to Settings → Notifications
   - Allow notifications when prompted
   - Your device will be automatically registered

2. **Configure Preferences**
   - Toggle Budget Alerts on/off
   - Toggle Daily Reminders on/off
   - Set your preferred reminder time
   - Set quiet hours (times when you don't want notifications)

### Web App

1. **Access Settings**
   - Log in to BudgetBuddy web app
   - Click your profile → Settings
   - Navigate to Notifications section

2. **Configure Preferences**
   - Enable/disable budget alerts
   - Enable/disable daily reminders
   - Set reminder time (24-hour format)
   - Set quiet hours range

## Notification Settings

### Budget Alerts

**What they do**: Alert you when spending reaches 80%, 90%, or 100% of your budget for any category.

**When you receive them**: Immediately after a transaction pushes you over a threshold.

**Who receives them**: All family members with access to the budget.

**How to manage**:

- Turn on/off in Settings → Notifications
- Alerts are sent once per threshold per 24 hours (no spam!)

### Daily Reminders

**What they do**: Remind you to log your daily expenses.

**When you receive them**: At your chosen time, but only if you haven't logged a transaction in 3+ days.

**Who receives them**: Only you (not shared with family).

**How to manage**:

- Turn on/off in Settings → Notifications
- Change reminder time in Settings
- Set quiet hours to avoid notifications during sleep or meetings

### Quiet Hours

**What they do**: Prevent notifications during specific times (e.g., overnight, during work meetings).

**How they work**:

- Set a start time and end time
- Notifications will be held during this period
- Budget alerts are still logged but not delivered
- Daily reminders are skipped entirely

**Example**: Set quiet hours from 10:00 PM to 8:00 AM to avoid nighttime notifications.

## Managing Devices

### Registering a Device

**Mobile**: Devices are automatically registered when you enable notifications in the app.

**Limit**: You can have up to 10 devices registered per account.

### Removing a Device

1. Go to Settings → Notifications
2. View your registered devices
3. Tap "Remove" next to the device you want to unregister

**Note**: Devices are automatically removed after 90 days of inactivity.

## Notification History

### Viewing Past Notifications

**Mobile**:

1. Open the app
2. Tap the bell icon in the top right
3. View all past notifications
4. Tap a notification to see details or navigate to the related screen

**Web**:

1. Log in to the web app
2. Click the bell icon in the navigation bar
3. View notification history
4. Click a notification to mark as read or view details

### Marking as Read

- **Mobile**: Tap the notification in the history list
- **Web**: Click the notification or click "Mark as Read"

## Troubleshooting

### Not Receiving Notifications

**Check these settings**:

1. **App Permissions**
   - iOS: Settings → BudgetBuddy → Notifications → Allow Notifications
   - Android: Settings → Apps → BudgetBuddy → Notifications → Enabled

2. **In-App Settings**
   - Open BudgetBuddy → Settings → Notifications
   - Ensure Budget Alerts or Daily Reminders are enabled

3. **Quiet Hours**
   - Check if current time is within your quiet hours range
   - Adjust quiet hours if needed

4. **Device Registration**
   - Go to Settings → Notifications
   - Check if your device is listed
   - If not, try logging out and back in

### Receiving Too Many Notifications

**Solutions**:

1. **Disable Budget Alerts**
   - Go to Settings → Notifications
   - Turn off Budget Alerts

2. **Adjust Quiet Hours**
   - Extend your quiet hours period
   - Example: 9:00 PM to 9:00 AM for minimal interruptions

3. **Disable Daily Reminders**
   - Go to Settings → Notifications
   - Turn off Daily Reminders

### Notifications Delayed

**Possible causes**:

1. **Network Issues**: Check your internet connection
2. **App in Background**: Open the app to sync
3. **Device Battery Saver**: Disable battery optimization for BudgetBuddy
4. **Server Delays**: Notifications may take up to 5 minutes during high traffic

### Wrong Notification Time

**Fix**:

1. Go to Settings → Notifications
2. Update your reminder time
3. Ensure your device timezone is correct
4. Changes take effect within 15 minutes

## Privacy & Security

### What Data is Stored

- Device push tokens (encrypted)
- Notification preferences
- Notification history (90 days)
- Alert delivery logs

### What Data is NOT Stored

- Notification content is not permanently stored
- Device tokens are automatically deleted after 90 days of inactivity
- Notification history is automatically deleted after 90 days

### Who Can See Your Notifications

- **Budget Alerts**: All family members with access to the budget
- **Daily Reminders**: Only you
- **Notification History**: Only you

### Data Security

- All notification data is encrypted at rest
- Device tokens are encrypted in transit
- Notifications are delivered via secure channels (Expo Push Notifications)
- No sensitive financial data is included in notification content

## Best Practices

### For Budget Alerts

1. **Keep Them Enabled**: Budget alerts help you stay on track
2. **Share with Family**: Ensure all family members have notifications enabled
3. **Act Quickly**: When you receive an 80% alert, review your spending
4. **Don't Ignore 100% Alerts**: These indicate you've exceeded your budget

### For Daily Reminders

1. **Choose a Consistent Time**: Pick a time when you're likely to log expenses (e.g., after dinner)
2. **Set Realistic Quiet Hours**: Don't block notifications during your active hours
3. **Log Regularly**: The more you log, the fewer reminders you'll receive
4. **Adjust as Needed**: Change your reminder time if it's not working for you

### For Quiet Hours

1. **Cover Sleep Hours**: Set quiet hours to match your sleep schedule
2. **Consider Work Hours**: Add work hours if you don't want interruptions
3. **Don't Over-Block**: Leave some active hours for important alerts
4. **Test Your Settings**: Send a test notification to verify timing

## FAQ

### Q: Can I customize which budget alerts I receive?

A: Currently, budget alerts are all-or-nothing. You receive alerts for all budgets at 80%, 90%, and 100% thresholds. Granular control is planned for a future update.

### Q: Can I change the reminder frequency?

A: Daily reminders are sent once per day at your chosen time, but only if you haven't logged a transaction in 3+ days. You cannot change the frequency, but you can disable reminders entirely.

### Q: Do notifications work offline?

A: No, notifications require an internet connection. However, when you come back online, you'll receive any missed notifications.

### Q: Can I receive notifications via email or SMS?

A: Currently, notifications are only available via push notifications on mobile devices. Email and SMS support is planned for a future update.

### Q: What happens if I have multiple devices?

A: Notifications are sent to all your registered devices simultaneously. You can manage devices in Settings → Notifications.

### Q: Can I snooze a notification?

A: Notifications cannot be snoozed, but you can set quiet hours to prevent notifications during specific times.

### Q: How do I test my notification settings?

A: Create a test transaction that pushes a budget over 80% to trigger a budget alert. For daily reminders, wait until your configured time (or change the time to test immediately).

### Q: Are notifications free?

A: Yes, push notifications are included with your BudgetBuddy subscription at no additional cost.

## Support

Need help with notifications?

- **In-App Support**: Settings → Help & Support
- **Email**: support@budgetbuddy.com
- **FAQ**: https://budgetbuddy.com/faq
- **Community Forum**: https://community.budgetbuddy.com

## Updates

This guide is current as of January 2026. Check for updates at https://budgetbuddy.com/docs/notifications

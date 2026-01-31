# Push Notifications User Guide

## Overview

BudgetBuddy sends you helpful push notifications to keep you on track with your budget. Get alerts when you're approaching your spending limits and daily reminders to log your transactions.

## Notification Types

### 💰 Budget Alerts

Get notified when you reach spending thresholds:

- **80% Alert**: "You've spent 80% of your Groceries budget"
- **90% Warning**: "You've spent 90% of your Groceries budget"
- **100% Exceeded**: "You've reached your Groceries budget limit"

**When**: Sent immediately when you log a transaction that crosses a threshold

**Who**: All family members receive the alert

**Frequency**: Once per threshold per category per 24 hours

### 📝 Daily Reminders

Get reminded to log your transactions:

- **Message**: "Don't forget to log your transactions today!"
- **When**: Sent at your configured reminder time
- **Condition**: Only if you haven't logged transactions in 3+ days
- **Frequency**: Once per day at your reminder time

## Managing Notifications

### Mobile App (iOS/Android)

1. Open BudgetBuddy mobile app
2. Tap **Settings** tab
3. Scroll to **Notification Settings**
4. Configure your preferences:
   - **Budget Alerts**: Toggle on/off
   - **Daily Reminders**: Toggle on/off
   - **Reminder Time**: Set your preferred time (e.g., 7:00 PM)
   - **Quiet Hours**: Set hours when you don't want notifications

### Web App

1. Go to **Settings** page
2. Scroll to **Notification Settings** section
3. Configure the same preferences as mobile
4. Changes sync across all devices

## Notification Preferences

### Budget Alerts

**Default**: Enabled

Turn on to receive alerts when you approach or exceed your budget limits. Helps you stay aware of your spending in real-time.

**Recommended**: Keep enabled for better budget awareness

### Daily Reminders

**Default**: Enabled

Turn on to receive daily reminders to log your transactions. Only sent if you haven't logged anything in 3+ days.

**Recommended**: Keep enabled if you want help building the habit

### Reminder Time

**Default**: 7:00 PM

Set the time when you want to receive daily reminders. The system checks every 15 minutes, so your reminder will arrive within ±15 minutes of your set time.

**Tips**:

- Choose a time when you're usually free
- Evening works well (after dinner)
- Avoid times when you're typically busy

### Quiet Hours

**Default**: 10:00 PM - 8:00 AM

Set hours when you don't want to receive any notifications. Perfect for ensuring uninterrupted sleep.

**Tips**:

- Set to your typical sleep hours
- Can span midnight (e.g., 10 PM - 8 AM)
- Applies to all notification types

## Device Management

### Registering Devices

**Automatic**: When you log in to the mobile app, your device is automatically registered for push notifications.

**Permissions**: You'll be asked to allow notifications the first time. Make sure to tap "Allow" to receive notifications.

### Multiple Devices

You can have up to **10 devices** registered per account:

- iPhone
- iPad
- Android phone
- Android tablet
- etc.

All devices receive the same notifications.

### Removing Devices

Devices are automatically removed when:

- You log out of the app
- You uninstall the app
- Device hasn't been used in 90 days

## Notification History

### Viewing History

**Mobile App**:

1. Tap notification to view details
2. Swipe to dismiss or mark as read

**Web App** (future):

1. Go to Settings > Notifications
2. View notification history
3. Mark as read or delete

### History Retention

- Notifications are kept for **90 days**
- After 90 days, they're automatically deleted
- Read/unread status is tracked

## Troubleshooting

### Not Receiving Notifications

**Check Permissions**:

1. Go to device Settings > BudgetBuddy
2. Ensure "Notifications" are enabled
3. Check notification style (Banners, Alerts, etc.)

**Check App Settings**:

1. Open BudgetBuddy > Settings
2. Verify Budget Alerts or Daily Reminders are enabled
3. Check you're not in Quiet Hours

**Check Device Registration**:

1. Log out and log back in
2. Allow notifications when prompted
3. Check Settings to confirm device is registered

### Receiving Too Many Notifications

**Adjust Preferences**:

1. Turn off Budget Alerts if you only want reminders
2. Turn off Daily Reminders if you only want budget alerts
3. Extend Quiet Hours to reduce notification window

**Note**: Budget alerts are sent once per threshold per 24 hours, so you won't get spammed.

### Notifications at Wrong Time

**Check Reminder Time**:

1. Go to Settings > Notification Settings
2. Verify Reminder Time is correct
3. Remember: Notifications arrive within ±15 minutes

**Check Timezone**:

1. Ensure your device timezone is correct
2. Reminder time uses your device's local time

### Notifications During Sleep

**Set Quiet Hours**:

1. Go to Settings > Notification Settings
2. Set Quiet Hours Start (e.g., 10:00 PM)
3. Set Quiet Hours End (e.g., 8:00 AM)
4. No notifications will be sent during this period

### Missing Budget Alerts

**Check Thresholds**:

- Alerts only sent when crossing 80%, 90%, or 100%
- If you're at 85%, you won't get another alert until 90%

**Check Deduplication**:

- Same alert not sent twice within 24 hours
- Wait 24 hours for next alert at same threshold

**Check Family Members**:

- All family members receive budget alerts
- Check if other family members received it

### Daily Reminders Not Working

**Check Last Transaction**:

- Reminders only sent if 3+ days since last transaction
- Log a transaction to reset the counter

**Check Reminder Time**:

- Verify your reminder time is set correctly
- System checks every 15 minutes

**Check Quiet Hours**:

- Ensure reminder time is not during quiet hours
- Adjust quiet hours if needed

## Privacy & Security

### Data Storage

- Device tokens are encrypted at rest
- Notification history is user-scoped
- Only you can see your notifications
- Family members can't see your notification history

### Data Retention

- Device registrations: 90 days from last use
- Notification history: 90 days from sent date
- Alert history: 30 days from sent date
- Preferences: Kept indefinitely

### Permissions

- Notifications require device permission
- You can revoke permission anytime in device settings
- Revoking stops all notifications immediately

## Best Practices

### For Budget Awareness

1. **Keep Budget Alerts Enabled**: Stay informed about spending
2. **Review Alerts Promptly**: Tap notification to see budget details
3. **Adjust Budgets**: If you get 100% alerts often, increase budget
4. **Share with Family**: Ensure all members see alerts

### For Transaction Logging

1. **Enable Daily Reminders**: Build the habit of logging daily
2. **Set Convenient Time**: Choose when you're usually free
3. **Respond to Reminders**: Tap to go directly to Transactions screen
4. **Log Regularly**: Avoid needing reminders by logging daily

### For Better Sleep

1. **Set Quiet Hours**: Match your sleep schedule
2. **Test Settings**: Verify no notifications during quiet hours
3. **Adjust as Needed**: Change quiet hours seasonally

## FAQ

### Q: Can I customize alert thresholds?

A: Currently, thresholds are fixed at 80%, 90%, and 100%. Custom thresholds may be added in a future update.

### Q: Can I get notifications for specific categories only?

A: Currently, budget alerts are sent for all categories. Category-specific preferences may be added in a future update.

### Q: Do notifications work offline?

A: No, push notifications require an internet connection. However, you'll receive any missed notifications when you reconnect.

### Q: Can I snooze notifications?

A: Not currently. You can dismiss notifications or adjust your quiet hours to reduce interruptions.

### Q: How do I stop all notifications?

A: Turn off both Budget Alerts and Daily Reminders in Settings, or revoke notification permissions in your device settings.

### Q: Do notifications drain my battery?

A: No, push notifications are very battery-efficient. They use Apple/Google's push notification services which are optimized for battery life.

### Q: Can I get notifications on my smartwatch?

A: Yes, if your smartwatch is paired with your phone and configured to show app notifications.

### Q: What if I change my phone?

A: Simply log in to BudgetBuddy on your new phone and allow notifications. Your old device will be automatically removed after 90 days of inactivity.

## Support

If you're still having issues with notifications:

1. Check this guide's troubleshooting section
2. Verify your device and app settings
3. Try logging out and back in
4. Contact support with:
   - Device type (iPhone, Android)
   - App version
   - Description of the issue
   - Screenshots if applicable

## Technical Details

For developers and advanced users:

- **Push Service**: Expo Push Notifications
- **Token Format**: ExponentPushToken[...]
- **Max Devices**: 10 per user
- **Delivery**: Best-effort (99%+ success rate)
- **Latency**: < 500ms average
- **Retry**: 2 attempts for failed deliveries

## Updates

This guide is updated as new notification features are added. Last updated: January 31, 2026.

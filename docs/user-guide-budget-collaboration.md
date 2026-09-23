# Budget Collaboration & Notifications User Guide

**Last Updated**: 2026-09-23

## Overview

BudgetBuddy lets you share your budget with family members, a partner, roommates, or a financial advisor. This guide explains how to invite people, accept invitations, and manage budget members.

---

## Roles and Permissions

| Role | Who it's for | Invite | Edit Budget | Add Transactions | View | Leave |
|------|-------------|--------|-------------|-----------------|------|-------|
| **Owner** | Budget creator | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Partner** | Spouse / co-owner | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Household Member** | Family member / roommate | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Viewer** | Financial advisor / read-only | ❌ | ❌ | ❌ | ✅ | ✅ |

**Viewer access** can have an optional expiry date (30, 60, or 90 days).

---

## How to Invite Someone

### Web App

1. Click **Members** in the left navigation (or go to **Settings → Manage Members**)
2. Click **Invite Member**
3. Enter their email address
4. Select a role: Partner, Household Member, or Viewer
5. For Viewer: optionally set an expiry date and access label (e.g. "Financial Advisor")
6. Click **Send Invitation**

They'll receive an email with an invitation link valid for 7 days.

---

## How to Accept an Invitation

1. Open the invitation email
2. Click **Accept Invitation**
3. If you already have a BudgetBuddy account: log in and you'll be added automatically
4. If you're new: create an account with the same email address, then accept

The invitation link goes to `/budgets/accept?token=...`

---

## Managing Members

Go to **Members** (`/budget/members`) to:

- **View** all current members and their roles
- **Extend** a Viewer's access by 30 days
- **Revoke** a member's access
- **Resend** a pending invitation
- **Cancel** a pending invitation

---

## Leaving a Budget

Non-owners (Partner, Household Member, Viewer) can leave a budget:

1. Go to **Members**
2. Scroll to the bottom and click **Leave Budget**
3. Confirm

After leaving, you'll need a new invitation to rejoin.

---

## Budget Settings (Owner Only)

From the **Members** page, owners can also:

- **Archive Budget** — makes the budget read-only (reversible)
- **Delete Budget** — permanently deletes all data (irreversible; not available for personal budgets)

---

## Budget Types

When creating a budget, you choose a type:

| Type | Description |
|------|-------------|
| **Personal** | Just for you. Cannot be deleted (only archived). |
| **Family** | Fully transparent — all members see all income, expenses, accounts, debts, and goals. |
| **Shared** | For roommates or shared expenses. |

---

## Frequently Asked Questions

**How many members can a budget have?**
There's no hard limit. You can invite as many people as needed.

**Can I have multiple budgets?**
Yes. Each budget is independent. You can be a member of multiple budgets simultaneously.

**What happens to my data if I leave a budget?**
You lose access to that budget's data. Your own personal budget is unaffected.

**Can I transfer ownership?**
Not currently. The original creator remains the owner.

**What if an invitation expires?**
The owner can resend it from the Members page. Old links stop working after 7 days.

**Is my data secure when sharing?**
Yes. All data is encrypted in transit and at rest. Role-based permissions prevent unauthorized changes. All actions are logged.

---

## Troubleshooting

**Invitation not received**: Check spam/junk folder. Ask the owner to resend from the Members page.

**Can't accept invitation**: Verify the invitation hasn't expired (7 days). Make sure you're using the same email address the invitation was sent to.

**Can't remove a member**: Only the owner can remove members. You can't remove yourself — use "Leave Budget" instead.

## Notifications

BudgetBuddy keeps you informed about your spending with smart notifications: real-time budget
alerts when you approach your limits, and daily reminders to log your expenses.

### Features

**Budget Alerts** — automatic notifications when spending reaches:
- **80% Alert**: Warning that you're approaching your budget limit
- **90% Alert**: Urgent warning that you're close to exceeding your budget
- **100% Alert**: Critical alert that you've reached or exceeded your budget

Budget alerts are sent to all budget members so everyone stays informed. Sent once per threshold
per 24 hours (no spam).

**Daily Reminders** — gentle reminders to log your daily expenses, sent at your preferred time,
only if you haven't logged a transaction in 3+ days, respecting your quiet hours.

### Getting Started

**Mobile App (iOS/Android)**:
1. Open the BudgetBuddy app and go to Settings -> Notifications
2. Allow notifications when prompted — your device is registered automatically
3. Toggle Budget Alerts / Daily Reminders on or off
4. Set your preferred reminder time and quiet hours

**Web App**:
1. Log in, click your profile -> Settings -> Notifications
2. Enable/disable budget alerts and daily reminders
3. Set reminder time (24-hour format) and quiet hours range

### Notification Settings

**Budget Alerts** — alert when spending reaches 80%, 90%, or 100% of budget for any category;
delivered immediately after a transaction crosses a threshold; received by all members with
access to the budget.

**Daily Reminders** — remind you to log expenses at your chosen time, skipped if you've logged
a transaction in the last 3 days; visible only to you, not shared with other budget members.

**Quiet Hours** — set a start and end time during which notifications are held. Budget alerts
are still logged but not delivered; daily reminders are skipped entirely. Example: 10:00 PM to
8:00 AM to avoid nighttime notifications.

### Managing Devices

Devices are automatically registered when you enable notifications in the mobile app. You can
have up to 10 devices registered per account. Remove a device from Settings -> Notifications ->
your device list -> Remove. Devices are automatically removed after 90 days of inactivity.

### Notification History

**Mobile**: tap the bell icon to view past notifications; tap one for details or to mark as read.
**Web**: click the bell icon in the navigation bar to view history; click a notification to mark
as read or view details.

### Troubleshooting

**Not receiving notifications**: check app notification permissions (iOS: Settings ->
BudgetBuddy -> Notifications; Android: Settings -> Apps -> BudgetBuddy -> Notifications), verify
Budget Alerts / Daily Reminders are enabled in-app, check you're not inside your quiet-hours
window, and confirm your device is listed under Settings -> Notifications (log out/in if not).

**Too many notifications**: disable Budget Alerts or Daily Reminders individually, or extend
your quiet hours window.

**Notifications delayed**: check your internet connection, open the app to force a sync, disable
battery optimization for BudgetBuddy, or allow up to 5 minutes during high server traffic.

**Wrong notification time**: update your reminder time in Settings -> Notifications and confirm
your device's timezone is correct; changes take effect within 15 minutes.

### Privacy & Security

**Stored**: device push tokens (encrypted), notification preferences, notification history
(90 days), alert delivery logs.

**Not stored**: notification content is not permanently stored; device tokens and notification
history are automatically deleted after 90 days of inactivity.

**Visibility**: budget alerts are visible to all members with access to the budget; daily
reminders and notification history are visible only to you.

All notification data is encrypted at rest and in transit, delivered via Expo Push Notifications.
No sensitive financial data is included in notification content.

### FAQ

**Can I customize which alerts I receive?** Not yet — alerts are all-or-nothing at the 80/90/100%
thresholds. Granular per-category control is planned for a future update.

**Can I change reminder frequency?** Daily reminders send once per day at your chosen time (only
if you haven't logged a transaction in 3+ days); frequency itself isn't configurable, but you can
disable reminders entirely.

**Do notifications work offline?** No — they require an internet connection, but you'll receive
any missed notifications once you're back online.

**Can I get notifications via email or SMS?** Not currently; push notifications on mobile devices
only. Email/SMS support is planned for a future update.

**What if I have multiple devices?** Notifications go to all registered devices simultaneously;
manage them under Settings -> Notifications.

## Multi-Currency Support

BudgetBuddy supports 6 major currencies, allowing users worldwide to manage their budgets in
their local currency.

### Supported Currencies

| Currency | Code | Symbol | Countries |
|---|---|---|---|
| US Dollar | USD | $ | United States, Ecuador, El Salvador, and others |
| Euro | EUR | € | European Union countries |
| British Pound | GBP | £ | United Kingdom |
| Canadian Dollar | CAD | C$ | Canada |
| Australian Dollar | AUD | A$ | Australia |
| Japanese Yen | JPY | ¥ | Japan |

### Selecting Your Currency

**During onboarding**: after entering your email/password and selecting your location, you
choose a currency before AI generates your initial budget. If skipped, USD is used by default.

**After onboarding**: open Settings -> Currency Settings, select a new currency from the
dropdown, read the warning message, and confirm.

### Currency Formatting

Each currency follows its local formatting convention (thousands/decimal separators, symbol
position, decimal places):

| Currency | Format example | Decimal places |
|---|---|---|
| USD | $1,234.56 | 2 |
| EUR | €1.234,56 | 2 |
| GBP | £1,234.56 | 2 |
| CAD | C$1,234.56 | 2 |
| AUD | A$1,234.56 | 2 |
| JPY | ¥1,235 | 0 (no cents) |

### Changing Your Currency

**Before changing, understand**: existing budgets and transactions are **not** converted — they
keep their original currency. Only new budgets and new transactions use the new currency.

1. Open Settings -> Currency section, view your current currency
2. Select a new currency from the dropdown
3. Read and understand the warning about unconverted historical data
4. Confirm the change
5. Create a new budget to see the new currency in effect

### Using Multiple Currencies

You can hold budgets in different currencies over time (e.g. USD budgets before an international
move, GBP budgets after), but **each individual budget uses exactly one currency** — all its
categories and transactions must match. A budget's currency cannot be changed after creation;
create a new budget instead. Automatic conversion between currencies is not currently supported
and is planned for a future phase, along with true multi-currency budgets and additional
currencies.

### FAQ

**Can I convert existing budgets to a new currency?** No, automatic conversion isn't supported
yet. Existing budgets keep their original currency; create new budgets in the new currency.

**Can I have budgets in different currencies?** Yes — each budget is independent and uses one
currency, so you might have a January budget in USD and a February budget in EUR after switching.

**What if I enter a transaction in the wrong currency?** Delete it and re-create it under the
budget with the correct currency — a transaction's currency always matches its budget's.

**Can I change a budget's currency after creation?** No. Create a new budget with the desired
currency instead.

### Troubleshooting

**Currency displays incorrectly**: check your browser/app language settings, confirm you
selected the intended currency, and refresh.

**Currency dropdown is disabled**: confirm you're logged in and have a working connection; try
logging out and back in.

**Budget shows the wrong currency**: budgets keep the currency they were created with — this is
expected. Create a new budget to use your updated currency preference.

# Budget Collaboration User Guide

**Last Updated**: 2026-06-01

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

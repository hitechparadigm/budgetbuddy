/**
 * Email Templates for BudgetBuddy
 *
 * HTML email templates for family collaboration features
 */

/**
 * Family Invitation Email Template
 * @param {Object} data - Template data
 * @param {string} data.inviterName - Name of person sending invitation
 * @param {string} data.inviterEmail - Email of person sending invitation
 * @param {string} data.role - Role being offered (Spouse/Viewer)
 * @param {string} data.acceptUrl - URL to accept invitation
 * @param {string} data.expiresAt - Expiration date
 * @returns {Object} Email subject and HTML body
 */
function getInvitationEmailTemplate(data) {
  const subject = `${data.inviterName} invited you to join their BudgetBuddy family`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Family Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #4CAF50; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">BudgetBuddy</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">You're Invited!</h2>

              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>${data.inviterName}</strong> (${data.inviterEmail}) has invited you to join their family budget on BudgetBuddy.
              </p>

              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                You'll be added as a <strong>${data.role}</strong>, which means you'll be able to:
              </p>

              ${
                data.role === "Spouse"
                  ? `
              <ul style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <li>View and edit budgets</li>
                <li>Add, edit, and delete transactions</li>
                <li>View all family financial data</li>
              </ul>
              `
                  : `
              <ul style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <li>View budgets (read-only)</li>
                <li>View transactions (read-only)</li>
                <li>View family financial data</li>
              </ul>
              `
              }

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.acceptUrl}" style="display: inline-block; background-color: #4CAF50; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-size: 16px; font-weight: bold;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                This invitation will expire on ${new Date(
                  data.expiresAt,
                ).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}.
              </p>

              <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 10px 0 0 0;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${data.acceptUrl}" style="color: #4CAF50; word-break: break-all;">${data.acceptUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                This email was sent by BudgetBuddy. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
You're Invited to BudgetBuddy!

${data.inviterName} (${data.inviterEmail}) has invited you to join their family budget on BudgetBuddy.

You'll be added as a ${data.role}.

To accept this invitation, visit:
${data.acceptUrl}

This invitation will expire on ${new Date(data.expiresAt).toLocaleDateString()}.

If you didn't expect this invitation, you can safely ignore this email.
  `.trim();

  return { subject, html, text };
}

/**
 * Member Removal Notification Email Template
 * @param {Object} data - Template data
 * @param {string} data.memberName - Name of removed member
 * @param {string} data.familyName - Name of family (primary user's name)
 * @param {string} data.removedBy - Name of person who removed them
 * @returns {Object} Email subject and HTML body
 */
function getRemovalEmailTemplate(data) {
  const subject = `You've been removed from ${data.familyName}'s BudgetBuddy family`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Family Removal Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #FF9800; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">BudgetBuddy</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Family Access Removed</h2>

              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${data.memberName},
              </p>

              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${data.removedBy} has removed you from their family budget on BudgetBuddy.
              </p>

              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                You no longer have access to ${data.familyName}'s budget and transactions. A new personal budget has been created for you.
              </p>

              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                You can continue using BudgetBuddy with your own budget, or you can accept a new family invitation if you receive one.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                This is an automated notification from BudgetBuddy.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
Family Access Removed

Hi ${data.memberName},

${data.removedBy} has removed you from their family budget on BudgetBuddy.

You no longer have access to ${data.familyName}'s budget and transactions. A new personal budget has been created for you.

You can continue using BudgetBuddy with your own budget, or you can accept a new family invitation if you receive one.

This is an automated notification from BudgetBuddy.
  `.trim();

  return { subject, html, text };
}

/**
 * Invitation Acceptance Notification Email Template
 * @param {Object} data - Template data
 * @param {string} data.primaryName - Name of primary user
 * @param {string} data.memberName - Name of member who accepted
 * @param {string} data.memberEmail - Email of member who accepted
 * @param {string} data.role - Role of new member
 * @returns {Object} Email subject and HTML body
 */
function getAcceptanceEmailTemplate(data) {
  const subject = `${data.memberName} accepted your BudgetBuddy invitation`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation Accepted</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #4CAF50; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">BudgetBuddy</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Invitation Accepted!</h2>

              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${data.primaryName},
              </p>

              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Great news! <strong>${data.memberName}</strong> (${data.memberEmail}) has accepted your invitation to join your family budget.
              </p>

              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                They've been added as a <strong>${data.role}</strong> and can now access your shared budget.
              </p>

              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                You can manage family members and their roles in your Family Settings.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                This is an automated notification from BudgetBuddy.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
Invitation Accepted!

Hi ${data.primaryName},

Great news! ${data.memberName} (${data.memberEmail}) has accepted your invitation to join your family budget.

They've been added as a ${data.role} and can now access your shared budget.

You can manage family members and their roles in your Family Settings.

This is an automated notification from BudgetBuddy.
  `.trim();

  return { subject, html, text };
}

module.exports = {
  getInvitationEmailTemplate,
  getRemovalEmailTemplate,
  getAcceptanceEmailTemplate,
};

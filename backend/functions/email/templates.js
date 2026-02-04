/**
 * Email Templates for BudgetBuddy
 *
 * Loads email templates from JSON files and performs variable substitution
 */

const fs = require("fs");
const path = require("path");

// Load templates from JSON files
const invitationTemplate = JSON.parse(
  fs.readFileSync(path.join(__dirname, "templates", "invitation.json"), "utf8"),
);
const removalTemplate = JSON.parse(
  fs.readFileSync(path.join(__dirname, "templates", "removal.json"), "utf8"),
);
const acceptanceTemplate = JSON.parse(
  fs.readFileSync(path.join(__dirname, "templates", "acceptance.json"), "utf8"),
);

/**
 * Replace template variables with actual values
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} data - Data object with variable values
 * @returns {string} Template with variables replaced
 */
function replaceVariables(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

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
  // Format expiration date
  const expiresAtFormatted = new Date(data.expiresAt).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  // Get role permissions HTML
  const rolePermissions = invitationTemplate.rolePermissions[data.role] || "";

  // Prepare data with formatted values
  const templateData = {
    ...data,
    expiresAtFormatted,
    rolePermissions,
  };

  // Replace variables in subject, HTML, and text
  const subject = replaceVariables(invitationTemplate.subject, templateData);
  const html = replaceVariables(invitationTemplate.html, templateData);
  const text = replaceVariables(invitationTemplate.text, templateData);

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
  const subject = replaceVariables(removalTemplate.subject, data);
  const html = replaceVariables(removalTemplate.html, data);
  const text = replaceVariables(removalTemplate.text, data);

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
  const subject = replaceVariables(acceptanceTemplate.subject, data);
  const html = replaceVariables(acceptanceTemplate.html, data);
  const text = replaceVariables(acceptanceTemplate.text, data);

  return { subject, html, text };
}

module.exports = {
  getInvitationEmailTemplate,
  getRemovalEmailTemplate,
  getAcceptanceEmailTemplate,
};

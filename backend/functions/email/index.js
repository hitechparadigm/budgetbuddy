/**
 * BudgetBuddy Email Lambda Function
 *
 * Handles email notifications and communications using AWS SES
 */

const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const {
  getInvitationEmailTemplate,
  getRemovalEmailTemplate,
  getAcceptanceEmailTemplate,
} = require("./templates");

const ses = new SESClient({ region: process.env.AWS_REGION || "us-east-1" });
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@budgetbuddy.com";

/**
 * Send email using AWS SES
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML body
 * @param {string} text - Plain text body
 */
async function sendEmail(to, subject, html, text) {
  const params = {
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: html,
          Charset: "UTF-8",
        },
        Text: {
          Data: text,
          Charset: "UTF-8",
        },
      },
    },
  };

  const command = new SendEmailCommand(params);
  const result = await ses.send(command);

  console.log("Email sent successfully", {
    to,
    subject,
    messageId: result.MessageId,
  });

  return result;
}

/**
 * Send family invitation email
 */
async function sendInvitationEmail(data) {
  const { subject, html, text } = getInvitationEmailTemplate(data);
  return sendEmail(data.invitedEmail, subject, html, text);
}

/**
 * Send member removal notification email
 */
async function sendRemovalEmail(data) {
  const { subject, html, text } = getRemovalEmailTemplate(data);
  return sendEmail(data.memberEmail, subject, html, text);
}

/**
 * Send invitation acceptance notification email
 */
async function sendAcceptanceEmail(data) {
  const { subject, html, text } = getAcceptanceEmailTemplate(data);
  return sendEmail(data.primaryEmail, subject, html, text);
}

exports.handler = async (event, _context) => {
  console.log("Email request received", {
    httpMethod: event.httpMethod,
    path: event.path,
  });

  try {
    const { httpMethod, path } = event;

    // Handle health check endpoint
    if (httpMethod === "GET" && path === "/email/health") {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          status: "healthy",
          service: "email",
          timestamp: new Date().toISOString(),
          version: "1.0.0",
        }),
      };
    }

    // Handle CORS preflight requests
    if (httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        body: "",
      };
    }

    // Handle POST /email/send-invitation
    if (httpMethod === "POST" && path === "/email/send-invitation") {
      const body = JSON.parse(event.body);

      // Validate required fields
      if (
        !body.invitedEmail ||
        !body.inviterName ||
        !body.inviterEmail ||
        !body.role ||
        !body.acceptUrl ||
        !body.expiresAt
      ) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            error: "Bad Request",
            message:
              "Missing required fields: invitedEmail, inviterName, inviterEmail, role, acceptUrl, expiresAt",
          }),
        };
      }

      await sendInvitationEmail(body);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          success: true,
          message: "Invitation email sent successfully",
        }),
      };
    }

    // Handle POST /email/send-removal
    if (httpMethod === "POST" && path === "/email/send-removal") {
      const body = JSON.parse(event.body);

      // Validate required fields
      if (
        !body.memberEmail ||
        !body.memberName ||
        !body.familyName ||
        !body.removedBy
      ) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            error: "Bad Request",
            message:
              "Missing required fields: memberEmail, memberName, familyName, removedBy",
          }),
        };
      }

      await sendRemovalEmail(body);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          success: true,
          message: "Removal notification email sent successfully",
        }),
      };
    }

    // Handle POST /email/send-acceptance
    if (httpMethod === "POST" && path === "/email/send-acceptance") {
      const body = JSON.parse(event.body);

      // Validate required fields
      if (
        !body.primaryEmail ||
        !body.primaryName ||
        !body.memberName ||
        !body.memberEmail ||
        !body.role
      ) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            error: "Bad Request",
            message:
              "Missing required fields: primaryEmail, primaryName, memberName, memberEmail, role",
          }),
        };
      }

      await sendAcceptanceEmail(body);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          success: true,
          message: "Acceptance notification email sent successfully",
        }),
      };
    }

    // Default response for unhandled routes
    return {
      statusCode: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Not Found",
        message: `Route ${httpMethod} ${path} not found`,
        service: "email",
      }),
    };
  } catch (error) {
    console.error("Email function error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        message: error.message || "An error occurred processing your request",
        service: "email",
      }),
    };
  }
};

// Export email functions for use by other Lambdas
module.exports = {
  handler: exports.handler,
  sendInvitationEmail,
  sendRemovalEmail,
  sendAcceptanceEmail,
};

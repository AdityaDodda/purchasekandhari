import nodemailer from "nodemailer";
import { ClientSecretCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  SMTP_FROM,
  AZURE_APPLICATION_ID,
  AZURE_TENANT_ID,
  AZURE_SECRET_ID,
  FRONTEND_URL
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
  console.warn(
    "SMTP credentials (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM) not found in environment variables. Emails will be logged to the console instead of being sent.",
  );
}

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
});

let graphClient: Client | null = null;
if (AZURE_APPLICATION_ID && AZURE_TENANT_ID && AZURE_SECRET_ID) {
  const credential = new ClientSecretCredential(
    AZURE_TENANT_ID!,
    AZURE_APPLICATION_ID!,
    AZURE_SECRET_ID!
  );
  graphClient = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken("https://graph.microsoft.com/.default");
        return token?.token || "";
      }
    }
  });
}

async function sendMailViaGraph(to: string, subject: string, htmlBody: string, attachments?: any[]) {
  if (!graphClient) throw new Error("Graph client not configured");
  const message: any = {
    subject,
    body: {
      contentType: "HTML",
      content: htmlBody,
    },
    toRecipients: [
      { emailAddress: { address: to } }
    ],
  };
  if (attachments && attachments.length > 0) {
    message.attachments = attachments;
  }
  await graphClient.api("/users/" + SMTP_FROM + "/sendMail").post({ message });
}

async function sendMailViaGraphMulti(toList: string[], subject: string, htmlBody: string) {
  if (!graphClient) throw new Error("Graph client not configured");
  const message: any = {
    subject,
    body: {
      contentType: "HTML",
      content: htmlBody,
    },
    toRecipients: toList.map(address => ({ emailAddress: { address } })),
  };
  await graphClient.api("/users/" + SMTP_FROM + "/sendMail").post({ message });
}

// Helper to decide which method to use
function useGraph() {
  return !!(AZURE_APPLICATION_ID && AZURE_TENANT_ID && AZURE_SECRET_ID && graphClient);
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const subject = "[Testing for App Purpose]Password Reset Request";
  const html = `
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <a href="${resetLink}">${resetLink}</a>
    <p>If you did not request this, please ignore this email.</p>
  `;
  if (useGraph()) {
    try {
      await sendMailViaGraph(to, subject, html);
      console.log("[Graph] Password reset email sent to:", to);
    } catch (error) {
      console.error("[Graph] Error sending password reset email:", error);
    }
    return;
  }

  const mailOptions = {
    from: SMTP_FROM,
    to,
    subject: "Password Reset Request",
    html: `
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
    console.log("--- Email not sent. Credentials missing. ---");
    console.log("To:", to);
    console.log("Subject:", "Password Reset Request");
    console.log("Body:", mailOptions.html);
    console.log("---------------------------------------------");
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log("Password reset email sent to:", to);
  } catch (error) {
    console.error("Error sending password reset email:", error);
  }
}

export async function sendExcelToRpaPoc(filePath: string, prNumber: string) {
  const subject = `Purchase Request Upload`;
  // const html = `<p>Please find attached the Excel for PR <b>${prNumber}</b>.</p>`;
  const to = "sai@aipromptora.com";
  if (useGraph()) {
    const fs = await import("fs");
    const data = fs.readFileSync(filePath).toString("base64");
    const attachments = [
      {
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: `${prNumber}.xlsx`,
        contentBytes: data
      }
    ];
    try {
      await sendMailViaGraph(to, subject, "", attachments);
      console.log(`[Graph] Excel email sent to: ${to}`);
    } catch (error) {
      console.error("[Graph] Error sending Excel email:", error);
    }
    return;
  }

  const mailOptions = {
    from: SMTP_FROM,
    to: "adityasreedodda@gmail.com",
    subject: `Purchase Request Upload`,
    // html: `<p>Please find attached the Excel for PR <b>${prNumber}</b>.</p>`,
    attachments: [
      {
        filename: `${prNumber}.xlsx`,
        path: filePath,
      },
    ],
  };

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
    console.log("--- Email not sent. Credentials missing. ---");
    console.log("To:", mailOptions.to);
    console.log("Subject:", mailOptions.subject);
    // console.log("Body:", mailOptions.html);
    console.log("Attachment:", filePath);
    console.log("---------------------------------------------");
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log("Excel email sent to:", mailOptions.to);
  } catch (error) {
    console.error("Error sending Excel email:", error);
  }
}

export async function sendApprovalRequestEmail(to: string, prNumber: string, requesterName: string, level: number) {
  const subject = `[Testing for App purpose]Purchase Request #${prNumber} - Approval Required (Level ${level})`;
  const html = `
    <p>Dear Approver,</p>
    <p>A purchase request <b>#${prNumber}</b> has been submitted by <b>${requesterName}</b> and requires your approval at Level ${level}.</p>
    <p>Please <a href="${FRONTEND_URL || 'http://localhost:5173'}/approve/${prNumber}">click here</a> to review and take action.</p>
    <p>Thank you.</p>
  `;
  if (useGraph()) {
    try {
      await sendMailViaGraph(to, subject, html);
      console.log(`[Graph] Approval request email sent to: ${to}`);
    } catch (error) {
      console.error("[Graph] Error sending approval request email:", error);
    }
    return;
  }

  const mailOptions = {
    from: `"Purchase Request System" <${SMTP_USER}>`,
    to,
    subject: `Purchase Request #${prNumber} - Approval Required (Level ${level})`,
    html: `
      <p>Dear Approver,</p>
      <p>A purchase request <b>#${prNumber}</b> has been submitted by <b>${requesterName}</b> and requires your approval at Level ${level}.</p>
      <p>Please <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/approve/${prNumber}">click here</a> to review and take action.</p>
      <p>Thank you.</p>
    `,
  };
  if (!SMTP_USER || !SMTP_PASSWORD) {
    console.log("--- Email not sent. Credentials missing. ---");
    console.log("To:", to);
    console.log("Subject:", mailOptions.subject);
    console.log("Body:", mailOptions.html);
    console.log("---------------------------------------------");
    return;
  }
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Approval request email sent to: ${to}`);
  } catch (error) {
    console.error("Error sending approval request email:", error);
  }
}

export async function sendEscalationEmail(toList: string[], prNumber: string, level: number, pendingHours: number) {
  const subject = `[Testing for App Purpose]Purchase Request ${prNumber} - Escalation (Level ${level})`;
  const html = `
    <p>Dear User,</p>
    <p>The purchase request <b>#${prNumber}</b> has been pending at Level ${level} for more than ${pendingHours} hours.</p>
    <p>This is an escalation notification. Please take necessary action.</p>
    <p>Thank you.</p>
  `;
  if (useGraph()) {
    try {
      await sendMailViaGraphMulti(toList, subject, html);
      console.log(`[Graph] Escalation email sent to: ${toList.join(", ")}`);
    } catch (error) {
      console.error("[Graph] Error sending escalation email:", error);
    }
    return;
  }

  const mailOptions = {
    from: `"Purchase Request System" <${SMTP_USER}>`,
    to: toList.join(","),
    subject: `Purchase Request #${prNumber} - Escalation (Level ${level})`,
    html: `
      <p>Dear User,</p>
      <p>The purchase request <b>#${prNumber}</b> has been pending at Level ${level} for more than ${pendingHours} hours.</p>
      <p>This is an escalation notification. Please take necessary action.</p>
      <p>Thank you.</p>
    `,
  };
  if (!SMTP_USER || !SMTP_PASSWORD) {
    console.log("--- Email not sent. Credentials missing. ---");
    console.log("To:", toList);
    console.log("Subject:", mailOptions.subject);
    console.log("Body:", mailOptions.html);
    console.log("---------------------------------------------");
    return;
  }
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Escalation email sent to: ${toList.join(", ")}`);
  } catch (error) {
    console.error("Error sending escalation email:", error);
  }
}

export async function sendRejectionEmail(toList: string[], prNumber: string, reason: string) {
  const subject = `[Testing For App Purpose]Purchase Request #${prNumber} - Rejected`;
  const html = `
    <p>Dear User,</p>
    <p>The purchase request <b>#${prNumber}</b> has been <b>rejected</b>.</p>
    <p>Reason: ${reason}</p>
    <p>Thank you.</p>
  `;
  if (useGraph()) {
    try {
      await sendMailViaGraphMulti(toList, subject, html);
      console.log(`[Graph] Rejection email sent to: ${toList.join(", ")}`);
    } catch (error) {
      console.error("[Graph] Error sending rejection email:", error);
    }
    return;
  }

  const mailOptions = {
    from: `"Purchase Request System" <${SMTP_USER}>`,
    to: toList.join(","),
    subject: `Purchase Request #${prNumber} - Rejected`,
    html: `
      <p>Dear User,</p>
      <p>The purchase request <b>#${prNumber}</b> has been <b>rejected</b>.</p>
      <p>Reason: ${reason}</p>
      <p>Thank you.</p>
    `,
  };
  if (!SMTP_USER || !SMTP_PASSWORD) {
    console.log("--- Email not sent. Credentials missing. ---");
    console.log("To:", toList);
    console.log("Subject:", mailOptions.subject);
    console.log("Body:", mailOptions.html);
    console.log("---------------------------------------------");
    return;
  }
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Rejection email sent to: ${toList.join(", ")}`);
  } catch (error) {
    console.error("Error sending rejection email:", error);
  }
}
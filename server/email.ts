import nodemailer from "nodemailer";

const { EMAIL_USER, EMAIL_PASS } = process.env;

if (!EMAIL_USER || !EMAIL_PASS) {
  console.warn(
    "Email credentials (EMAIL_USER, EMAIL_PASS) not found in environment variables. Password reset emails will be logged to the console instead of being sent.",
  );
}

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const mailOptions = {
    from: `"Purchase Request System" <${EMAIL_USER}>`,
    to,
    subject: "Password Reset Request",
    html: `
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  if (!EMAIL_USER || !EMAIL_PASS) {
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

export async function sendPurchaseRequestToApprovers(emails: string[], requisitionNumber: string, department: string, location: string, approvalLink: string) {
  const mailOptions = {
    from: `"Purchase Request System" <${EMAIL_USER}>`,
    to: emails.join(","),
    subject: `Approval Needed: Purchase Request ${requisitionNumber}`,
    html: `
      <p>A new purchase request <b>${requisitionNumber}</b> has been submitted for your approval.</p>
      <p><b>Department:</b> ${department}<br/>
         <b>Location:</b> ${location}</p>
      <p>Please review and take action using the link below:</p>
      <a href="${approvalLink}">${approvalLink}</a>
    `,
  };

  if (!EMAIL_USER || !EMAIL_PASS) {
    console.log("--- Email not sent. Credentials missing. ---");
    console.log("To:", emails);
    console.log("Subject:", mailOptions.subject);
    console.log("Body:", mailOptions.html);
    console.log("---------------------------------------------");
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log("Purchase request submission email sent to:", emails);
  } catch (error) {
    console.error("Error sending purchase request submission email:", error);
  }
}

// Send an email to a single approver for action.
export async function sendToApprover(approverEmail: string, requisitionNumber: string, department: string, location: string, approvalLink: string, requesterName: string) {
  const mailOptions = {
    from: `"Purchase Request System" <${EMAIL_USER}>`,
    to: approverEmail,
    subject: `Approval Needed: Purchase Request ${requisitionNumber}`,
    html: `
      <p>A purchase request <b>${requisitionNumber}</b> from <b>${requesterName}</b> requires your approval.</p>
      <p><b>Department:</b> ${department}<br/>
         <b>Location:</b> ${location}</p>
      <p>Please review and take action using the link below:</p>
      <a href="${approvalLink}">${approvalLink}</a>
    `,
  };
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.log("--- Email not sent. Credentials missing. ---");
    console.log("To:", approverEmail);
    console.log("Subject:", mailOptions.subject);
    console.log("Body:", mailOptions.html);
    console.log("---------------------------------------------");
    return;
  }
  try {
    await transporter.sendMail(mailOptions);
    console.log("Approval email sent to:", approverEmail);
  } catch (error) {
    console.error("Error sending approval email:", error);
  }
}

// Send an email to the requester about rejection or return.
export async function sendToRequester(requesterEmail: string, requisitionNumber: string, action: 'rejected' | 'returned', comment: string, requesterName: string) {
  const actionText = action === 'rejected' ? 'rejected' : 'returned for edit';
  const mailOptions = {
    from: `"Purchase Request System" <${EMAIL_USER}>`,
    to: requesterEmail,
    subject: `Your Purchase Request ${requisitionNumber} was ${actionText}`,
    html: `
      <p>Dear ${requesterName},</p>
      <p>Your purchase request <b>${requisitionNumber}</b> was <b>${actionText}</b>.</p>
      <p>Comment: ${comment || 'No comment provided.'}</p>
      <p>Please log in to the system for more details.</p>
    `,
  };
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.log("--- Email not sent. Credentials missing. ---");
    console.log("To:", requesterEmail);
    console.log("Subject:", mailOptions.subject);
    console.log("Body:", mailOptions.html);
    console.log("---------------------------------------------");
    return;
  }
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Notification email sent to requester (${actionText}):`, requesterEmail);
  } catch (error) {
    console.error("Error sending notification to requester:", error);
  }
}

// Send an email to both the requester and all approvers at the final approval step.
export async function sendFinalApproval(recipients: string[], requisitionNumber: string, status: 'approved' | 'rejected', requesterName: string, comment?: string) {
  const statusText = status === 'approved' ? 'APPROVED' : 'REJECTED';
  const mailOptions = {
    from: `"Purchase Request System" <${EMAIL_USER}>`,
    to: recipients.join(","),
    subject: `Purchase Request ${requisitionNumber} ${statusText}`,
    html: `
      <p>Purchase request <b>${requisitionNumber}</b> from <b>${requesterName}</b> has been <b>${statusText}</b> at the final approval step.</p>
      ${comment ? `<p>Comment: ${comment}</p>` : ''}
    `,
  };
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.log("--- Email not sent. Credentials missing. ---");
    console.log("To:", recipients);
    console.log("Subject:", mailOptions.subject);
    console.log("Body:", mailOptions.html);
    console.log("---------------------------------------------");
    return;
  }
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Final approval email sent to:`, recipients);
  } catch (error) {
    console.error("Error sending final approval email:", error);
  }
}
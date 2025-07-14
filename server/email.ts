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

export async function sendExcelToRpaPoc(filePath: string, prNumber: string) {
  const mailOptions = {
    from: `"Purchase Request System" <${EMAIL_USER}>`,
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

  if (!EMAIL_USER || !EMAIL_PASS) {
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
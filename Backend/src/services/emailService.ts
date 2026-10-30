import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

// Cache of Ethereal transporter per sender email
const transporterCache = new Map<string, nodemailer.Transporter>();

/**
 * Get or create an Ethereal SMTP transporter for a given sender.
 * Each sender gets their own Ethereal test account.
 */
async function getTransporter(sender: string): Promise<nodemailer.Transporter> {
  if (transporterCache.has(sender)) {
    return transporterCache.get(sender)!;
  }

  // Create a new Ethereal test account for this sender
  const testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  transporterCache.set(sender, transporter);
  console.log(
    `[EmailService] Created Ethereal account for sender "${sender}": ${testAccount.user}`
  );

  return transporter;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
  etherealUser: string;
}

/**
 * Send an email via Ethereal SMTP.
 * Returns the messageId and a preview URL to view the sent email.
 */
export async function sendEmail(
  sender: string,
  recipient: string,
  subject: string,
  body: string
): Promise<SendEmailResult> {
  const transporter = await getTransporter(sender);

  const mailOptions: Mail.Options = {
    from: sender,
    to: recipient,
    subject,
    html: body,
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);

  console.log(
    `[EmailService] Sent email from "${sender}" to "${recipient}" — Preview: ${previewUrl}`
  );

  return {
    messageId: info.messageId,
    previewUrl,
    etherealUser: (transporter.options as any).auth?.user || "unknown",
  };
}


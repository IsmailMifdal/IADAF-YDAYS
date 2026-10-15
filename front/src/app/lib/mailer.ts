/**
 * Transactional e-mail through any SMTP provider (SMTP_URL).
 *
 * SMTP rather than a provider's HTTP API keeps the choice open: Brevo,
 * Mailgun, Scaleway TEM or the host's own relay all speak it.
 *
 * Without SMTP_URL, development prints the message to the server console so
 * the flows stay testable; production refuses, so a misconfigured server
 * fails loudly instead of silently never sending.
 */

import nodemailer, { type Transporter } from "nodemailer";

export type Mail = {
  to: string;
  subject: string;
  text: string;
};

let transporter: Transporter | undefined;

function getTransporter(): Transporter | undefined {
  const url = process.env.SMTP_URL;
  if (!url) return undefined;
  transporter ??= nodemailer.createTransport(url);
  return transporter;
}

export async function sendMail(mail: Mail): Promise<void> {
  const transport = getTransporter();

  if (!transport) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP_URL is not configured: cannot send e-mail");
    }
    console.info(
      `[mailer] SMTP_URL non configuré — e-mail non envoyé (dev) :\n` +
        `  À : ${mail.to}\n  Objet : ${mail.subject}\n\n${mail.text}\n`,
    );
    return;
  }

  await transport.sendMail({
    from: process.env.MAIL_FROM ?? "IA-DAF <no-reply@localhost>",
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
  });
}

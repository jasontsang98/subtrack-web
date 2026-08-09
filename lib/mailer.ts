import nodemailer from "nodemailer";

export function createMailer() {
  const port = Number(process.env.SMTP_PORT ?? 1025);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "mailpit",
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export const sender = process.env.EMAIL_FROM ?? "Subtrack <subtrack@localhost>";

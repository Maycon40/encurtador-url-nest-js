import nodemailer from 'nodemailer';
import { ServiceUnavailableException } from '@nestjs/common';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const transporterConfig: SMTPTransport.Options = {
  host: process.env.EMAIL_SMTP_HOST,
  port: Number(process.env.EMAIL_SMTP_PORT),
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASSWORD,
  },
  secure: process.env.NODE_ENV === 'production',
};

const transporter = nodemailer.createTransport(transporterConfig);

async function send(mailOptions) {
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new ServiceUnavailableException({
      message: 'Unable to send the email',
      action: 'Try again in a few minutes or contact support.',
      cause: error,
    });
  }
}

const email = {
  send,
};

export default email;

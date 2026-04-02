import nodemailer from 'nodemailer';

const sendEmail = async (toEmail, subject, text, html) => {
  try {
    const userEmail = process.env.EMAIL_USER;
    const userPass = process.env.EMAIL_APP_PASSWORD;

    if (!userEmail || !userPass) {
      console.warn('[Email Warning] EMAIL_USER or EMAIL_APP_PASSWORD is not set. Skipping real dispatch.');
      return false; // Fail silently or gracefully
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail', // Usually you use gmail or SMTP details
      auth: {
        user: userEmail,
        pass: userPass
      }
    });

    const mailOptions = {
      from: `"PawRescue Admin" <${userEmail}>`,
      to: toEmail,
      subject: subject,
      text: text,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Success] Sent to ${toEmail}: ${info.messageId}`);
    return true;

  } catch (error) {
    console.error(`[Email Error] Failed to send to ${toEmail}: ${error.message}`);
    return false;
  }
};

export default sendEmail;

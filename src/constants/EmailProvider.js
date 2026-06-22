import nodemailer from "nodemailer";

// Function to send an email
const sendEmail = async (emailContent) => {
  try {
    // Create a transporter object using SMTP transport
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      port: process.env.EMAIL_PORT || 465,
      secure: true,
      logging: true,
      debug: true,
      secureConnection: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Send mail with defined transport object
    await transporter.sendMail(emailContent);

    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    throw error; // Throw error to handle it in the caller function
  }
};

export default sendEmail;

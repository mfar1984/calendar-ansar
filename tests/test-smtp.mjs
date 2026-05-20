import nodemailer from "nodemailer";

const config = {
  host: "utopia.herosite.pro",
  port: 465,
  secure: true,
  auth: {
    user: "calendar@ansartechnologies.my",
    pass: "g2XktMz3rhALUqd9cZ",
  },
};

console.log("Testing SMTP connection...");
console.log("Host:", config.host);
console.log("Port:", config.port);
console.log("User:", config.auth.user);
console.log("Pass:", config.auth.pass);

const transporter = nodemailer.createTransport(config);

try {
  await transporter.verify();
  console.log("\n✅ SMTP connection OK — credentials are correct");

  // Send test email
  console.log("\nSending test email to faizanrahman84@gmail.com...");
  const info = await transporter.sendMail({
    from: "AnSar Calendar <calendar@ansartechnologies.my>",
    to: "faizanrahman84@gmail.com",
    subject: "✅ Test Email — AnSar Calendar",
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0078d4;">AnSar Calendar — Test Email</h2>
        <p>This is a test email from AnSar Calendar system.</p>
        <p>If you received this, email notifications are working correctly.</p>
        <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
      </div>
    `,
  });
  console.log("✅ Email sent! Message ID:", info.messageId);
} catch (err) {
  console.error("\n❌ SMTP Error:", err.message);
  if (err.code === "EAUTH") {
    console.error("→ Authentication failed. Check username/password.");
    console.error("→ Response:", err.response);
  } else if (err.code === "ECONNREFUSED") {
    console.error("→ Cannot connect to SMTP server. Check host/port.");
  }
}

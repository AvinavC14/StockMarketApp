import dotenv from "dotenv";
dotenv.config();
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Sends a WhatsApp message via Twilio.
 * @param {string} to - Recipient phone number (with 'whatsapp:' prefix)
 * @param {string} message - Text to send
 */
export const sendWhatsAppMessage = async (to, message) => {
  try {
    const msg = await client.messages.create({
      from: "whatsapp:+14155238886", // Twilio sandbox number
      to: `whatsapp:${to}`,
      body: message,
    });
    console.log("✅ WhatsApp message sent:", msg.sid);
    return msg;
  } catch (err) {
    console.error("❌ Error sending WhatsApp:", err);
    throw err;
  }
};

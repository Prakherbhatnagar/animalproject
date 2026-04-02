import twilio from 'twilio';

const sendSMS = async (toPhone, bodyText) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromPhone) {
      console.warn('[SMS Warning] Twilio credentials are not set. Skipping real dispatch.');
      return false; 
    }

    const client = twilio(accountSid, authToken);
    
    const message = await client.messages.create({
      body: bodyText,
      from: fromPhone,
      to: toPhone
    });

    console.log(`[SMS Success] Sent to ${toPhone}: ${message.sid}`);
    return true;

  } catch (error) {
    console.error(`[SMS Error] Failed to send to ${toPhone}: ${error.message}`);
    return false;
  }
};

export default sendSMS;

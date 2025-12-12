import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();
const resend = new Resend(process.env.RESEND_API_KEY);

export const emailSend = async (email) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "Vardan <onboarding@resend.dev>",
      to: [email],
      subject: "Hello World",
      html: "<strong>It works!</strong>",
    });
    // console.log(data);
    return data;
  } catch (error) {
    // console.log(error.message);
    return console.error({ error });
  }
};



import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Resend API Key is not configured' }, { status: 500 });
    }

    const { invoiceId, email, name, amount, currency } = await req.json();

    if (!invoiceId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:7007'}/pay/${invoiceId}`;

    const { data, error } = await resend.emails.send({
      from: 'Zeneva Invoice <billing@zeneva.space>', // The user will need to configure a verified domain in Resend
      to: [email],
      subject: `New Invoice from Zeneva - ${currency || 'NGN'} ${amount || '0.00'}`,
      html: `
        <div style="font-family: sans-serif; max-w-lg; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; padding: 20px;">
          <h2 style="color: #333;">Hello ${name || 'Customer'},</h2>
          <p style="color: #555; line-height: 1.5;">
            You have a new invoice waiting for payment. 
            The total amount due is <strong>${currency || 'NGN'} ${amount || '0.00'}</strong>.
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${paymentLink}" style="background-color: #E65100; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View and Pay Invoice
            </a>
          </div>
          <p style="color: #888; font-size: 12px; margin-top: 40px;">
            Secured by Zeneva & Flutterwave
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'An error occurred' }, { status: 500 });
  }
}

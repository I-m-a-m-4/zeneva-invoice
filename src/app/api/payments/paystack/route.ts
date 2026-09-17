import { NextResponse } from 'next/server';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function POST(req: Request) {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: 'Paystack Secret Key is not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { email, amount, currency = 'USD', invoiceId } = body;

    if (!email || !amount) {
      return NextResponse.json({ error: 'Email and amount are required' }, { status: 400 });
    }

    // Paystack expects amount in the lowest denomination (cents/kobo)
    const amountInLowestDenomination = Math.round(amount * 100);

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: amountInLowestDenomination,
        currency,
        metadata: {
          custom_fields: [
            {
              display_name: "Invoice ID",
              variable_name: "invoice_id",
              value: invoiceId
            }
          ]
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Payment initialization failed' }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

export async function POST(req: Request) {
  try {
    if (!FLUTTERWAVE_SECRET_KEY) {
      return NextResponse.json({ error: 'Flutterwave Secret Key is not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { email, amount, currency = 'USD', invoiceId, name, phone } = body;

    if (!email || !amount) {
      return NextResponse.json({ error: 'Email and amount are required' }, { status: 400 });
    }

    // Generate a unique transaction reference
    const tx_ref = `tx-${invoiceId || Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tx_ref,
        amount,
        currency,
        redirect_url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9007',
        meta: {
          invoice_id: invoiceId,
        },
        customer: {
          email,
          phonenumber: phone || '',
          name: name || 'Zeneva Customer'
        },
        customizations: {
          title: 'Zeneva Invoice',
          description: `Payment for invoice ${invoiceId || ''}`,
          logo: 'https://zeneva.space/logo.png' // You can customize this
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Payment initialization failed' }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      authorizationUrl: data.data.link,
      reference: tx_ref
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}

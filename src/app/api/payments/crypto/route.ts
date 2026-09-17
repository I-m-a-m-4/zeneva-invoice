import { NextResponse } from 'next/server';

const COINBASE_COMMERCE_API_KEY = process.env.COINBASE_COMMERCE_API_KEY;

export async function POST(req: Request) {
  try {
    if (!COINBASE_COMMERCE_API_KEY) {
      return NextResponse.json({ error: 'Coinbase Commerce API Key is not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { name, description, amount, currency = 'USD', invoiceId } = body;

    if (!name || !amount) {
      return NextResponse.json({ error: 'Name and amount are required' }, { status: 400 });
    }

    const response = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'X-CC-Api-Key': COINBASE_COMMERCE_API_KEY,
        'X-CC-Version': '2018-03-22',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description: description || `Payment for Invoice ${invoiceId || ''}`,
        local_price: {
          amount: amount.toString(),
          currency
        },
        pricing_type: 'fixed_price',
        metadata: {
          invoiceId
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || 'Failed to create charge' }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      hostedUrl: data.data.hosted_url,
      chargeId: data.data.id
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}

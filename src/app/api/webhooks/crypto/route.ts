import { NextResponse } from 'next/server';
import crypto from 'crypto';

const COINBASE_WEBHOOK_SECRET = process.env.COINBASE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-cc-webhook-signature');

    if (!COINBASE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Verify webhook signature
    const hash = crypto.createHmac('sha256', COINBASE_WEBHOOK_SECRET).update(rawBody).digest('hex');
    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event.type === 'charge:confirmed' || event.event.type === 'charge:resolved') {
      const invoiceId = event.event.data.metadata?.invoiceId;

      if (invoiceId) {
        // TODO: Import adminDb and update the Firestore document to mark invoice as paid
        console.log(`Crypto payment successful for invoice ${invoiceId}. Charge: ${event.event.data.id}`);
        
        // Example:
        // await adminDb.collection('receipts').doc(invoiceId).update({
        //   status: 'paid',
        //   paymentReference: event.event.data.id,
        //   paidAt: new Date(),
        //   paymentMethod: 'Crypto (USDC)'
        // });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

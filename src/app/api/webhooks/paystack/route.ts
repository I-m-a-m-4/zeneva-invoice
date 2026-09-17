import { NextResponse } from 'next/server';
import crypto from 'crypto';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Verify event origin
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.success') {
      const invoiceId = event.data.metadata?.custom_fields?.find(
        (f: any) => f.variable_name === 'invoice_id'
      )?.value;

      if (invoiceId) {
        // TODO: Import adminDb and update the Firestore document to mark invoice as paid
        console.log(`Payment successful for invoice ${invoiceId}. Reference: ${event.data.reference}`);
        
        // Example:
        // await adminDb.collection('receipts').doc(invoiceId).update({
        //   status: 'paid',
        //   paymentReference: event.data.reference,
        //   paidAt: new Date()
        // });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

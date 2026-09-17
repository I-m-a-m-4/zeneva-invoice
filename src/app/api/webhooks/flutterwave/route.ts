import { NextResponse } from 'next/server';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('verif-hash');

    // Make sure you have set a Secret Hash in your Flutterwave dashboard and add it to your .env.local as FLUTTERWAVE_SECRET_HASH
    const FLUTTERWAVE_SECRET_HASH = process.env.FLUTTERWAVE_SECRET_HASH; 

    if (!FLUTTERWAVE_SECRET_KEY || !FLUTTERWAVE_SECRET_HASH) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!signature || signature !== FLUTTERWAVE_SECRET_HASH) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.completed' && event.data.status === 'successful') {
      const invoiceId = event.data.meta?.invoice_id;

      if (invoiceId) {
        // TODO: Import adminDb and update the Firestore document to mark invoice as paid
        console.log(`Payment successful for invoice ${invoiceId}. Reference: ${event.data.tx_ref}`);
        
        // Example:
        // await adminDb.collection('receipts').doc(invoiceId).update({
        //   status: 'paid',
        //   paymentReference: event.data.tx_ref,
        //   paidAt: new Date()
        // });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

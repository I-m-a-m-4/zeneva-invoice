import { NextResponse } from 'next/server';
import { adminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK-43d41d0befc821edd7a9b6a098ae827b-1a0a6503a4avt-X';
const FLUTTERWAVE_SECRET_HASH = process.env.FLUTTERWAVE_SECRET_HASH;

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('verif-hash');

    // If secret hash is set in Flutterwave dashboard, verify signature
    if (FLUTTERWAVE_SECRET_HASH && signature && signature !== FLUTTERWAVE_SECRET_HASH) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    if (!rawBody) {
      return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.completed' && event.data.status === 'successful') {
      const data = event.data;
      const meta = data.meta || {};
      const tx_ref = data.tx_ref;
      const transactionId = data.id;

      // Double-verify transaction with Flutterwave API for absolute security
      if (transactionId) {
        try {
          const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
            headers: {
              Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || verifyData?.status !== 'success' || verifyData?.data?.status !== 'successful') {
            console.warn('[flutterwave-webhook] Transaction verification failed:', transactionId);
            return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
          }
        } catch (vErr) {
          console.error('[flutterwave-webhook] Error verifying with Flutterwave API:', vErr);
        }
      }

      if (adminFirestore) {
        // Idempotency check on purchases
        const existingPurchase = await adminFirestore
          .collection('purchases')
          .where('reference', '==', tx_ref)
          .limit(1)
          .get();

        if (existingPurchase.empty) {
          // Case 1: Subscription payment
          if (meta.businessId && meta.planId) {
            const businessId = meta.businessId;
            const planId = meta.planId;
            const cycleMonths = parseInt(meta.cycleMonths || '1') || 1;
            const currency = (data.currency || 'USD').toUpperCase();
            const chargedAmount = Number(data.amount || data.charged_amount || 0);

            const businessRef = adminFirestore.collection('businessInstances').doc(businessId);
            const businessDoc = await businessRef.get();

            if (businessDoc.exists) {
              const bData = businessDoc.data() || {};
              let currentExpiry = new Date();
              if (bData.trialExpiresAt) {
                const ts = bData.trialExpiresAt;
                currentExpiry = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
              }

              const startDate = currentExpiry > new Date() ? currentExpiry : new Date();
              const newExpiryDate = new Date(startDate);
              newExpiryDate.setMonth(newExpiryDate.getMonth() + cycleMonths);

              const batch = adminFirestore.batch();

              // 1. Upgrade business
              batch.update(businessRef, {
                plan: planId,
                trialExpiresAt: newExpiryDate,
                accessLevel: null,
                updatedAt: new Date(),
              });

              // 2. Add purchase record
              const purchaseRef = adminFirestore.collection('purchases').doc();
              batch.set(purchaseRef, {
                businessId,
                plan: planId,
                amount: chargedAmount,
                currency,
                reference: tx_ref,
                transactionId,
                gateway: 'flutterwave',
                timestamp: FieldValue.serverTimestamp(),
                verifiedServerSide: true,
              });

              // 3. Add to business subscription history
              const historyRef = businessRef.collection('subscription_history').doc();
              batch.set(historyRef, {
                action: `Subscribed to ${planId} plan for ${cycleMonths} month(s)`,
                amount: chargedAmount,
                currency,
                gateway: 'flutterwave',
                reference: tx_ref,
                timestamp: FieldValue.serverTimestamp(),
              });

              await batch.commit();
              console.log(`[flutterwave-webhook] Upgraded business ${businessId} to ${planId}`);
            }
          }

          // Case 2: Invoice payment
          const invoiceId = meta.invoice_id || meta.invoiceId;
          if (invoiceId) {
            const receiptRef = adminFirestore.collection('receipts').doc(invoiceId);
            const receiptSnap = await receiptRef.get();
            if (receiptSnap.exists) {
              await receiptRef.update({
                status: 'paid',
                paymentReference: tx_ref,
                paymentMethod: 'flutterwave',
                paidAt: new Date(),
              });
              console.log(`[flutterwave-webhook] Marked invoice ${invoiceId} as paid`);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[flutterwave-webhook] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

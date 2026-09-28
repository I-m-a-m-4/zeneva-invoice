import { NextResponse } from 'next/server';
import { adminFirestore, adminAuth } from '@/firebase/admin';
import { requireSuperAdmin, corsHeaders } from '../_guard';

// Real-time by design: the admin dashboard must never show a cached snapshot of
// platform state. Uncached to reflect real-time live platform data.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/admin/metrics
 *
 * Full platform telemetry and financial metrics for Zeneva Invoice:
 * Users, businesses, products, sales receipts, invoices, expenses, bills,
 * estimates, recurring invoices, payments received, credit notes, vendors,
 * purchases, download clicks, and branches.
 *
 * Super-admin only.
 */
export async function GET(req: Request) {
    const auth = await requireSuperAdmin(req);
    if (!auth.ok) return auth.res;

    try {
        const db = adminFirestore;

        // Fetch all collections in parallel directly from Firestore (real-time)
        // Notice: collection('users').get() without orderBy('name') so users lacking a 'name' field are not dropped.
        const [
            usersSnap,
            businessesSnap,
            productsSnap,
            receiptsSnap,
            purchasesSnap,
            downloadClicksSnap,
            applicationsSnap,
            grantsSnap,
            checkoutAttemptsSnap,
            branchesSnap,
            expensesSnap,
            billsSnap,
            estimatesSnap,
            recurringInvoicesSnap,
            paymentsReceivedSnap,
            creditNotesSnap,
            vendorsSnap,
            servicesSnap
        ] = await Promise.all([
            db.collection('users').get(),
            db.collection('businessInstances').get(),
            db.collection('products').get(),
            db.collection('receipts').get(),
            db.collection('purchases').get(),
            db.collection('download_clicks').get(),
            db.collection('job_applications').get(),
            db.collection('grants').get(),
            db.collection('checkout_attempts').orderBy('timestamp', 'desc').get().catch(() => ({ docs: [] })),
            db.collectionGroup('branches').get().catch(() => ({ docs: [] })),
            db.collectionGroup('expenses').get().catch(() => ({ docs: [] })),
            db.collectionGroup('bills').get().catch(() => ({ docs: [] })),
            db.collectionGroup('estimates').get().catch(() => ({ docs: [] })),
            db.collectionGroup('recurring-invoices').get().catch(() => ({ docs: [] })),
            db.collectionGroup('payment-received').get().catch(() => ({ docs: [] })),
            db.collectionGroup('credit-notes').get().catch(() => ({ docs: [] })),
            db.collectionGroup('vendors').get().catch(() => ({ docs: [] })),
            db.collectionGroup('services').get().catch(() => ({ docs: [] })),
        ]);

        let authUsersMap = new Map<string, any>();
        if (adminAuth) {
            try {
                const listUsersResult = await adminAuth.listUsers(1000);
                listUsersResult.users.forEach((u: any) => {
                    authUsersMap.set(u.uid, u);
                });
            } catch (e) {
                console.warn('Could not list auth users:', e);
            }
        }

        const usersMap = new Map<string, any>();
        usersSnap.docs.forEach((doc: any) => {
            const data = doc.data();
            const authRecord = authUsersMap.get(doc.id);
            usersMap.set(doc.id, {
                id: doc.id,
                email: data.email || authRecord?.email || undefined,
                name: data.name || authRecord?.displayName || undefined,
                ...data,
            });
        });

        // Also add any Firebase Auth users who don't have a Firestore document yet
        authUsersMap.forEach((authUser, uid) => {
            if (!usersMap.has(uid)) {
                usersMap.set(uid, {
                    id: uid,
                    email: authUser.email,
                    name: authUser.displayName,
                    createdAt: authUser.metadata.creationTime,
                    status: 'active',
                });
            }
        });

        const users = Array.from(usersMap.values());
        const businesses = businessesSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        const products = productsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        const applications = applicationsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        const grants = grantsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        const allReceipts = receiptsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        const purchases = purchasesSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        const downloadClicks = downloadClicksSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        const checkoutAttempts = checkoutAttemptsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        
        const branches = branchesSnap.docs.map((doc: any) => ({ 
            id: doc.id, 
            businessId: doc.data().businessId || doc.ref.parent?.parent?.id, 
            ...doc.data() 
        }));

        // Zeneva Invoice Subcollections
        const expenses = expensesSnap.docs.map((doc: any) => ({
            id: doc.id,
            businessId: doc.data().businessId || doc.ref.parent?.parent?.id,
            ...doc.data()
        }));

        const bills = billsSnap.docs.map((doc: any) => ({
            id: doc.id,
            businessId: doc.data().businessId || doc.ref.parent?.parent?.id,
            ...doc.data()
        }));

        const estimates = estimatesSnap.docs.map((doc: any) => ({
            id: doc.id,
            businessId: doc.data().businessId || doc.ref.parent?.parent?.id,
            ...doc.data()
        }));

        const recurringInvoices = recurringInvoicesSnap.docs.map((doc: any) => ({
            id: doc.id,
            businessId: doc.data().businessId || doc.ref.parent?.parent?.id,
            ...doc.data()
        }));

        const paymentsReceived = paymentsReceivedSnap.docs.map((doc: any) => ({
            id: doc.id,
            businessId: doc.data().businessId || doc.ref.parent?.parent?.id,
            ...doc.data()
        }));

        const creditNotes = creditNotesSnap.docs.map((doc: any) => ({
            id: doc.id,
            businessId: doc.data().businessId || doc.ref.parent?.parent?.id,
            ...doc.data()
        }));

        const vendors = vendorsSnap.docs.map((doc: any) => ({
            id: doc.id,
            businessId: doc.data().businessId || doc.ref.parent?.parent?.id,
            ...doc.data()
        }));

        const services = servicesSnap.docs.map((doc: any) => ({
            id: doc.id,
            businessId: doc.data().businessId || doc.ref.parent?.parent?.id,
            ...doc.data()
        }));

        // Separate Invoices vs Sales / POS Receipts
        const invoices = allReceipts.filter((r: any) => 
            r.type === 'invoice' || 
            r.paymentMethod === 'Invoice' || 
            (typeof r.receiptNumber === 'string' && r.receiptNumber.startsWith('INV'))
        );

        const receipts = allReceipts.filter((r: any) => 
            r.type !== 'invoice' && 
            r.paymentMethod !== 'Invoice' && 
            !(typeof r.receiptNumber === 'string' && r.receiptNumber.startsWith('INV'))
        );

        const payload = {
            users,
            businesses,
            products,
            applications,
            grants,
            allReceipts,
            receipts,
            invoices,
            expenses,
            bills,
            estimates,
            recurringInvoices,
            paymentsReceived,
            creditNotes,
            vendors,
            services,
            purchases,
            downloadClicks,
            checkoutAttempts,
            branches
        };

        return NextResponse.json(payload, { 
            headers: {
                ...corsHeaders,
                'Cache-Control': 'no-store, max-age=0',
            } 
        });

    } catch (error) {
        console.error('Error fetching admin metrics data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch admin data' },
            { status: 500, headers: corsHeaders },
        );
    }
}

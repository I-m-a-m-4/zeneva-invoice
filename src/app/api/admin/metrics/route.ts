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

// Server-side cache and in-flight promise coalescing.
// Prevents concurrent requests from firing duplicate full-database scans against Firestore
// which saturates gRPC and causes ECONNRESET / 14 UNAVAILABLE.
let cachedPayload: any = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds TTL
let inFlightPromise: Promise<any> | null = null;

// Helper to retry transient gRPC connection errors (ECONNRESET, UNAVAILABLE)
async function getWithRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
    try {
        return await fn();
    } catch (err: any) {
        const isTransient = err?.code === 14 || 
            err?.message?.includes('ECONNRESET') || 
            err?.message?.includes('UNAVAILABLE') ||
            err?.message?.includes('No connection established');
        if (retries > 0 && isTransient) {
            console.warn(`[admin/metrics] Transient error (${err?.message || err?.code}), retrying in ${delayMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            return getWithRetry(fn, retries - 1, delayMs * 2);
        }
        throw err;
    }
}

async function fetchMetricsData() {
    const db = adminFirestore;

    // Execute in smaller staged batches to prevent saturating gRPC channel streams
    // Batch 1: Primary core collections
    const [usersSnap, businessesSnap, productsSnap, receiptsSnap] = await Promise.all([
        getWithRetry(() => db.collection('users').get()),
        getWithRetry(() => db.collection('businessInstances').get()),
        getWithRetry(() => db.collection('products').get()),
        getWithRetry(() => db.collection('receipts').get()),
    ]);

    // Batch 2: Secondary top-level collections
    const [purchasesSnap, downloadClicksSnap, applicationsSnap, grantsSnap, checkoutAttemptsSnap] = await Promise.all([
        getWithRetry(() => db.collection('purchases').get()),
        getWithRetry(() => db.collection('download_clicks').get()),
        getWithRetry(() => db.collection('job_applications').get()),
        getWithRetry(() => db.collection('grants').get()),
        getWithRetry(() => db.collection('checkout_attempts').orderBy('timestamp', 'desc').get().catch(() => ({ docs: [] }))),
    ]);

    // Batch 3: CollectionGroup subcollections
    const [
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
        getWithRetry(() => db.collectionGroup('branches').get().catch(() => ({ docs: [] }))),
        getWithRetry(() => db.collectionGroup('expenses').get().catch(() => ({ docs: [] }))),
        getWithRetry(() => db.collectionGroup('bills').get().catch(() => ({ docs: [] }))),
        getWithRetry(() => db.collectionGroup('estimates').get().catch(() => ({ docs: [] }))),
        getWithRetry(() => db.collectionGroup('recurring-invoices').get().catch(() => ({ docs: [] }))),
        getWithRetry(() => db.collectionGroup('payment-received').get().catch(() => ({ docs: [] }))),
        getWithRetry(() => db.collectionGroup('credit-notes').get().catch(() => ({ docs: [] }))),
        getWithRetry(() => db.collectionGroup('vendors').get().catch(() => ({ docs: [] }))),
        getWithRetry(() => db.collectionGroup('services').get().catch(() => ({ docs: [] }))),
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

    return {
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
        servicesSnap,
        authUsersMap,
    };
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

    const url = new URL(req.url);
    const forceFresh = url.searchParams.get('fresh') === 'true';

    // Serve cached payload if still valid and fresh was not explicitly requested
    const now = Date.now();
    if (!forceFresh && cachedPayload && now - cachedAt < CACHE_TTL_MS) {
        return NextResponse.json(cachedPayload, {
            headers: {
                ...corsHeaders,
                'Cache-Control': 'no-store, max-age=0',
                'X-Metrics-Cached': 'true',
            },
        });
    }

    try {
        // Single-flight coalescing: If a fetch is already running, await that same promise
        if (!inFlightPromise) {
            inFlightPromise = fetchMetricsData().finally(() => {
                inFlightPromise = null;
            });
        }

        const {
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
            servicesSnap,
            authUsersMap,
        } = await inFlightPromise;

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

        // Cache the newly fetched metrics in memory for 60 seconds
        cachedPayload = payload;
        cachedAt = Date.now();

        return NextResponse.json(payload, { 
            headers: {
                ...corsHeaders,
                'Cache-Control': 'no-store, max-age=0',
                'X-Metrics-Fresh': 'true',
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

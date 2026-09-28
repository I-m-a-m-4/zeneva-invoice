import { NextResponse } from 'next/server';
import { adminFirestore, adminAuth } from '@/firebase/admin';
import { requireSuperAdmin, corsHeaders } from '../_guard';

// Uncached on purpose — see the note on the handler. The build-injected
// `dynamic = 'force-static'` this file used to carry would have defeated that.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/admin/users
 *
 * Returns the users collection fresh from Firestore (no Redis cache), so the
 * admin User Management page always shows accurate real-time `lastSeen`
 * presence data.
 *
 * Super-admin only: this is every account on the platform, with emails.
 */
export async function GET(req: Request) {
    const auth = await requireSuperAdmin(req);
    if (!auth.ok) return auth.res;

    try {
        const snapshot = await adminFirestore
            .collection('users')
            .get();

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
        snapshot.docs.forEach(doc => {
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

        // Sort in memory so documents missing a 'name' field are never dropped by Firestore
        users.sort((a: any, b: any) => {
            const nameA = (a.name || a.email || a.phone || '').toLowerCase();
            const nameB = (b.name || b.email || b.phone || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        // No-cache headers so the browser also doesn't cache this
        return NextResponse.json(users, {
            headers: {
                ...corsHeaders,
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500, headers: corsHeaders },
        );
    }
}

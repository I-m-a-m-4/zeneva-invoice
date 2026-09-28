
import admin from 'firebase-admin';

import fs from 'fs';
import path from 'path';

// Check for required environment variables
let projectId = process.env.FIREBASE_PROJECT_ID;
let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Fallback: If any environment variable is missing, check for a service account JSON file in root
if (!projectId || !clientEmail || !privateKey) {
    try {
        const rootDir = process.cwd();
        const files = fs.readdirSync(rootDir);
        const serviceAccountFile = files.find(f => 
            (f.includes('firebase-adminsdk') || f.includes('serviceAccountKey')) && f.endsWith('.json')
        );
        if (serviceAccountFile) {
            const raw = fs.readFileSync(path.join(rootDir, serviceAccountFile), 'utf-8');
            const parsed = JSON.parse(raw);
            projectId = projectId || parsed.project_id;
            clientEmail = clientEmail || parsed.client_email;
            privateKey = privateKey || parsed.private_key;
        }
    } catch (e) {
        // Fallback file scan failed, proceed to normal env validation below
    }
}

if (!admin.apps.length) {
    if (projectId && clientEmail && privateKey) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    // Handle literal \n and real newlines in the string
                    privateKey: privateKey.includes('---') 
                        ? privateKey.replace(/\\n/g, '\n') 
                        : privateKey,
                }),
            });
        } catch (error: any) {
            console.error('Firebase admin initialization error:', error.message);
        }
    } else {
        const missing = [];
        if (!projectId) missing.push('FIREBASE_PROJECT_ID');
        if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
        if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
        console.warn(`Firebase Admin missing: ${missing.join(', ')}. Admin features will be disabled.`);
    }
}

// Export safe instances (or null/mock if initialization failed to prevent build crashes)
// If not initialized, accessing these will throw, so we check app length again.
export const adminAuth = admin.apps.length ? admin.auth() : null as any;
export const adminFirestore = admin.apps.length ? admin.firestore() : null as any;
export const adminMessaging = admin.apps.length ? admin.messaging() : null as any;

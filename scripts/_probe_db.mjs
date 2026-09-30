import { createRequire } from 'module';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname; // this file is IN scripts/, parent is project root
const require = createRequire(join(projectRoot, '..', 'package.json'));
const admin = require('firebase-admin');

const files = readdirSync(join(projectRoot, '..'));
const saFile = files.find(f => (f.includes('firebase-adminsdk') || f.includes('serviceAccountKey')) && f.endsWith('.json'));
const serviceAccount = JSON.parse(readFileSync(join(projectRoot, '..', saFile), 'utf-8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const TARGET_EMAIL = 'belloimam431@gmail.com';

// Find user
const userSnap = await db.collection('users').where('email', '==', TARGET_EMAIL).limit(1).get();
if (userSnap.empty) { console.log('No user found'); process.exit(1); }
const userDoc = userSnap.docs[0];
const userId = userDoc.id;
console.log('User ID:', userId);
console.log('User data keys:', Object.keys(userDoc.data()));
console.log('businessId field:', userDoc.data().businessId);

// Find business by ownerId
const bizSnap = await db.collection('businesses').where('ownerId', '==', userId).limit(5).get();
console.log('\nBusinesses (by ownerId):', bizSnap.size);
bizSnap.docs.forEach(d => console.log('  ID:', d.id, '| name:', d.data().name));

// List all root collections
const cols = await db.listCollections();
console.log('\nAll root collections:', cols.map(c => c.id).join(', '));

process.exit(0);

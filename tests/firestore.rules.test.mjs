import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

let testEnv;

const profile = (businessId, role = 'admin', permissions = {}) => ({
  businessId,
  email: `${businessId}-${role}@example.test`,
  name: `${businessId} ${role}`,
  permissions,
  role,
  status: 'active',
});

const product = (businessId, name = 'Product') => ({
  businessId,
  name,
  price: 100,
  sku: `${businessId}-${name}`,
  stock: 5,
});

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'zeneva-rules-test',
    firestore: {
      host: '127.0.0.1',
      port: 8081,
      rules: await readFile('firestore.rules', 'utf8'),
    },
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'businessInstances', 'business-a'), {
        name: 'Business A',
        ownerId: 'owner-a',
        plan: 'starter',
        settings: {},
        status: 'active',
      }),
      setDoc(doc(db, 'businessInstances', 'business-b'), {
        name: 'Business B',
        ownerId: 'owner-b',
        plan: 'starter',
        settings: {},
        status: 'active',
      }),
      setDoc(doc(db, 'users', 'owner-a'), profile('business-a')),
      setDoc(doc(db, 'users', 'owner-b'), profile('business-b')),
      setDoc(doc(db, 'users', 'manager-a'), profile('business-a', 'manager')),
      setDoc(doc(db, 'users', 'vendor-a'), profile('business-a', 'vendor_operator')),
      setDoc(doc(db, 'users', 'restricted-manager-a'), profile('business-a', 'manager', { manage_inventory: false })),
      setDoc(doc(db, 'products', 'product-a'), product('business-a', 'A')),
      setDoc(doc(db, 'products', 'product-b'), product('business-b', 'B')),
      setDoc(doc(db, 'customers', 'customer-a'), { businessId: 'business-a', name: 'Customer A' }),
      setDoc(doc(db, 'customers', 'customer-b'), { businessId: 'business-b', name: 'Customer B' }),
      setDoc(doc(db, 'branches', 'branch-a'), { businessId: 'business-a', name: 'Main' }),
    ]);
  });
});

after(async () => {
  await testEnv.cleanup();
});

const dbFor = (uid, token = {}) => testEnv.authenticatedContext(uid, token).firestore();

test('rejects unauthenticated reads', async () => {
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'products', 'product-a')));
});

test('allows a tenant to read only its own products', async () => {
  const db = dbFor('owner-a');
  await assertSucceeds(getDoc(doc(db, 'products', 'product-a')));
  await assertSucceeds(getDocs(query(collection(db, 'products'), where('businessId', '==', 'business-a'))));
  await assertFails(getDoc(doc(db, 'products', 'product-b')));
  await assertFails(getDocs(query(collection(db, 'products'), where('businessId', '==', 'business-b'))));
});

test('prevents cross-tenant creates and tenant reassignment', async () => {
  const db = dbFor('owner-a');
  await assertFails(setDoc(doc(db, 'products', 'cross-tenant'), product('business-b', 'Cross tenant')));
  await assertFails(updateDoc(doc(db, 'products', 'product-a'), { businessId: 'business-b' }));
});

test('enforces inventory permissions and explicit denials', async () => {
  await assertSucceeds(setDoc(doc(dbFor('manager-a'), 'products', 'manager-product'), product('business-a', 'Manager')));
  await assertFails(setDoc(doc(dbFor('vendor-a'), 'products', 'vendor-product'), product('business-a', 'Vendor')));
  await assertFails(setDoc(doc(dbFor('restricted-manager-a'), 'products', 'restricted-product'), product('business-a', 'Restricted')));
});

test('enforces customer permissions', async () => {
  await assertSucceeds(getDoc(doc(dbFor('vendor-a'), 'customers', 'customer-a')));
  await assertFails(getDoc(doc(dbFor('vendor-a'), 'customers', 'customer-b')));
  await assertSucceeds(setDoc(doc(dbFor('vendor-a'), 'customers', 'vendor-customer'), { businessId: 'business-a', name: 'Vendor customer' }));
});

test('prevents self-promotion and tenant switching', async () => {
  const db = dbFor('manager-a');
  await assertFails(updateDoc(doc(db, 'users', 'manager-a'), { role: 'admin' }));
  await assertFails(updateDoc(doc(db, 'users', 'manager-a'), { businessId: 'business-b' }));
  await assertSucceeds(updateDoc(doc(db, 'users', 'manager-a'), { name: 'Updated manager' }));
});

test('lets tenant admins manage users only in their tenant', async () => {
  const db = dbFor('owner-a');
  await assertSucceeds(updateDoc(doc(db, 'users', 'manager-a'), { permissions: { view_reports: true } }));
  await assertFails(updateDoc(doc(db, 'users', 'owner-b'), { permissions: { view_reports: true } }));
});

test('locks subscription and ownership fields from clients', async () => {
  const db = dbFor('owner-a');
  await assertSucceeds(updateDoc(doc(db, 'businessInstances', 'business-a'), { name: 'Renamed Business A' }));
  await assertFails(updateDoc(doc(db, 'businessInstances', 'business-a'), { plan: 'business' }));
  await assertFails(updateDoc(doc(db, 'businessInstances', 'business-a'), { ownerId: 'owner-b' }));
});

test('denies unknown and platform-only paths', async () => {
  const db = dbFor('owner-a');
  await assertFails(getDoc(doc(db, 'system_stats', 'global')));
  await assertFails(setDoc(doc(db, 'terminationLogs', 'entry-a'), { businessId: 'business-a' }));
});

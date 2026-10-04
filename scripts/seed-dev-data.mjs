/**
 * seed-dev-data.mjs
 *
 * Populates Firestore with realistic test data for the belloimam431@gmail.com account.
 * Run:    node scripts/seed-dev-data.mjs
 * Delete: node scripts/seed-dev-data.mjs --delete
 */
import { createRequire } from 'module';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const require = createRequire(join(projectRoot, 'package.json'));
const admin = require('firebase-admin');

// Auto-discover service account JSON
const files = readdirSync(projectRoot);
const saFile = files.find(
  (f) => (f.includes('firebase-adminsdk') || f.includes('serviceAccountKey')) && f.endsWith('.json')
);
if (!saFile) { console.error('No Firebase service account JSON found.'); process.exit(1); }
const serviceAccount = JSON.parse(readFileSync(join(projectRoot, saFile), 'utf-8'));
console.log('Using service account:', saFile);

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;

const TARGET_EMAIL = 'belloimam431@gmail.com';
const SEED_TAG = '__seeded__';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return Timestamp.fromDate(d);
}
function ri(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rf(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function findUserAndBusiness() {
  const snap = await db.collection('users').where('email', '==', TARGET_EMAIL).limit(1).get();
  if (snap.empty) { console.error('No user found:', TARGET_EMAIL); process.exit(1); }
  const doc = snap.docs[0];
  const userId = doc.id;
  let businessId = doc.data().businessId;

  if (!businessId) {
    console.log('User has no businessId. Creating business instance for', TARGET_EMAIL);
    const bizRef = db.collection('businessInstances').doc();
    businessId = bizRef.id;
    await bizRef.set({
      id: businessId,
      name: 'Zeneva Solutions',
      ownerId: userId,
      plan: 'business',
      status: 'active',
      accessLevel: 'lifetime',
      createdAt: Timestamp.now(),
      trialExpiresAt: Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
      settings: {
        currency: 'NGN',
        primaryColor: '#7c3aed',
        phone: '08012345678',
        email: TARGET_EMAIL,
        defaultTaxRate: 7.5,
        paymentBankName: 'Zenith Bank',
        paymentBankAccountId: '1012345678',
        paymentAccountName: 'Zeneva Solutions',
        paymentInstructions: 'Please include your invoice number in payment description.'
      }
    });
    await doc.ref.update({
      businessId,
      role: 'owner',
      name: doc.data().name || 'Bello Imam',
      updatedAt: Timestamp.now()
    });
    console.log('Created businessInstance:', businessId, 'and updated user profile.');
  } else {
    // Check if businessInstance exists
    const bizSnap = await db.collection('businessInstances').doc(businessId).get();
    if (!bizSnap.exists) {
      await db.collection('businessInstances').doc(businessId).set({
        id: businessId,
        name: 'Zeneva Solutions',
        ownerId: userId,
        plan: 'business',
        status: 'active',
        accessLevel: 'lifetime',
        createdAt: Timestamp.now(),
        settings: {
          currency: 'NGN',
          primaryColor: '#7c3aed',
          phone: '08012345678',
          email: TARGET_EMAIL,
          defaultTaxRate: 7.5,
          paymentBankName: 'Zenith Bank',
          paymentBankAccountId: '1012345678',
          paymentAccountName: 'Zeneva Solutions',
          paymentInstructions: 'Please include your invoice number in payment description.'
        }
      });
      console.log('Ensured businessInstance document exists for businessId:', businessId);
    }
  }

  console.log('Found user:', userId, '| businessId:', businessId);
  return { userId, businessId };
}

async function deleteSeedData(businessId) {
  const cols = [
    'products','customers','receipts','invoices','estimates',
    'expenses','recurring_invoices','credit_notes','payment_received',
    'delivery_challans','proforma_invoices','bills','projects','time_logs',
    'purchase_orders','vendors',
  ];
  console.log('\nDeleting seeded data...');
  for (const col of cols) {
    const snap = await db.collection(col)
      .where('businessId', '==', businessId)
      .where('_seed', '==', SEED_TAG)
      .get();
    if (snap.empty) continue;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    console.log('  Deleted', snap.size, 'from', col);
  }

  // Also delete from businessInstances/{businessId}/expenses
  const expSubSnap = await db.collection(`businessInstances/${businessId}/expenses`)
    .where('_seed', '==', SEED_TAG)
    .get();
  if (!expSubSnap.empty) {
    const expBatch = db.batch();
    expSubSnap.docs.forEach((d) => expBatch.delete(d.ref));
    await expBatch.commit();
    console.log('  Deleted', expSubSnap.size, 'from businessInstances expenses');
  }

  console.log('Done.');
}

async function seed() {
  const { userId, businessId } = await findUserAndBusiness();

  // CUSTOMERS
  const customerDefs = [
    ['Amaka Obi', 'amaka.obi@gmail.com', '08012345678'],
    ['Chidi Nwosu', 'chidi.nwosu@yahoo.com', '08023456789'],
    ['Fatima Bello', 'fatima.bello@gmail.com', '08034567890'],
    ['Emeka Johnson', 'emeka.j@hotmail.com', '08045678901'],
    ['Ngozi Adeleke', 'ngozi.adeleke@gmail.com', '08056789012'],
    ['Taiwo Okafor', 'taiwo.ok@gmail.com', '08067890123'],
    ['Ifeanyi Eze', 'ife.eze@gmail.com', '08078901234'],
    ['Blessing Umar', 'blessing.u@gmail.com', '08089012345'],
  ];
  const customerIds = [];
  console.log('\nSeeding customers...');
  const cb = db.batch();
  for (const [name, email, phone] of customerDefs) {
    const ref = db.collection('customers').doc();
    customerIds.push(ref.id);
    cb.set(ref, {
      _seed: SEED_TAG, businessId, name, email, phone,
      loyaltyPoints: ri(0, 500),
      totalSpent: ri(10000, 500000),
      lastPurchaseDate: daysAgo(ri(1, 60)),
      createdAt: daysAgo(ri(60, 180)),
      lowercaseName: name.toLowerCase(),
      lowercaseEmail: email.toLowerCase(),
      tags: rf([['loyal'], ['wholesale'], ['vip'], ['new'], []]),
    });
  }
  await cb.commit();
  console.log(' ', customerDefs.length, 'customers');

  // PRODUCTS
  const productDefs = [
    { name: 'Indomie Noodles (Box)', category: 'Food & Drinks', price: 5500, cost: 4200, stock: 80 },
    { name: 'Dangote Sugar (1kg)', category: 'Food & Drinks', price: 1200, cost: 900, stock: 150 },
    { name: 'Peak Milk Tin (400g)', category: 'Food & Drinks', price: 2800, cost: 2200, stock: 60 },
    { name: 'Sunlight Detergent (500g)', category: 'Household', price: 800, cost: 600, stock: 200 },
    { name: 'Omo Detergent (1kg)', category: 'Household', price: 1500, cost: 1100, stock: 120 },
    { name: 'Airwick Air Freshener', category: 'Household', price: 2500, cost: 1800, stock: 45 },
    { name: 'Tecno Spark 10 (6GB/128GB)', category: 'Electronics', price: 115000, cost: 98000, stock: 12 },
    { name: 'Infinix Hot 40 (8GB/256GB)', category: 'Electronics', price: 135000, cost: 112000, stock: 8 },
    { name: 'itel A70 Budget Phone', category: 'Electronics', price: 65000, cost: 54000, stock: 20 },
    { name: 'Phone Screen Protector', category: 'Accessories', price: 2000, cost: 500, stock: 300 },
    { name: 'USB-C Charging Cable', category: 'Accessories', price: 1500, cost: 600, stock: 250 },
    { name: 'Power Bank 10000mAh', category: 'Accessories', price: 12000, cost: 8500, stock: 35 },
    { name: 'Barbing Service', category: 'Services', price: 1500, cost: 0, stock: 999, categoryType: 'service' },
    { name: 'Hair Braiding (Full)', category: 'Services', price: 8000, cost: 1500, stock: 999, categoryType: 'service' },
  ];
  const productIds = [];
  console.log('\nSeeding products...');
  const pb = db.batch();
  for (const p of productDefs) {
    const ref = db.collection('products').doc();
    productIds.push(ref.id);
    pb.set(ref, {
      _seed: SEED_TAG, businessId, id: ref.id,
      name: p.name,
      sku: 'SKU-' + ref.id.slice(0, 6).toUpperCase(),
      category: p.category,
      categoryType: p.categoryType || 'product',
      price: p.price, costPrice: p.cost, stock: p.stock,
      lowStockThreshold: 10,
      lowercaseName: p.name.toLowerCase(),
      createdAt: daysAgo(ri(90, 365)),
      updatedAt: daysAgo(ri(1, 30)),
    });
  }
  await pb.commit();
  console.log(' ', productDefs.length, 'products');

  // RECEIPTS
  console.log('\nSeeding receipts...');
  const receiptIds = [];
  const rb = db.batch();
  for (let i = 0; i < 35; i++) {
    const ref = db.collection('receipts').doc();
    receiptIds.push(ref.id);
    const items = [];
    let subtotal = 0;
    for (let j = 0; j < ri(1, 4); j++) {
      const pi = ri(0, productDefs.length - 1);
      const qty = ri(1, 5);
      const price = productDefs[pi].price;
      items.push({ productId: productIds[pi], name: productDefs[pi].name, quantity: qty, price, costPrice: productDefs[pi].cost, total: price * qty });
      subtotal += price * qty;
    }
    const tax = Math.round(subtotal * 0.075);
    const discount = rf([0, 0, 0, ri(200, 1000)]);
    const total = subtotal + tax - discount;
    const ci = ri(0, customerIds.length - 1);
    rb.set(ref, {
      _seed: SEED_TAG, businessId,
      receiptNumber: 'RCP-' + (1000 + i),
      items, subtotal, tax, discount, total,
      totalCost: items.reduce((s, it) => s + (it.costPrice || 0) * it.quantity, 0),
      profit: total - items.reduce((s, it) => s + (it.costPrice || 0) * it.quantity, 0),
      customer: { id: customerIds[ci], name: customerDefs[ci][0], email: customerDefs[ci][1] },
      paymentMethod: rf(['Cash', 'Card', 'Bank Transfer']),
      status: 'paid',
      createdAt: daysAgo(ri(0, 90)),
      createdBy: userId,
    });
  }
  await rb.commit();
  console.log('  35 receipts');

  // INVOICES
  console.log('\nSeeding invoices...');
  const invoiceIds = [];
  const ib = db.batch();
  const rbInvoices = db.batch();
  for (let i = 0; i < 20; i++) {
    const ref = db.collection('invoices').doc();
    const receiptRef = db.collection('receipts').doc(ref.id);
    invoiceIds.push(ref.id);
    const items = [];
    let subtotal = 0;
    for (let j = 0; j < ri(1, 3); j++) {
      const pi = ri(0, productDefs.length - 1);
      const qty = ri(1, 10);
      const price = productDefs[pi].price;
      items.push({ productId: productIds[pi], name: productDefs[pi].name, quantity: qty, price, total: price * qty });
      subtotal += price * qty;
    }
    const tax = Math.round(subtotal * 0.075);
    const total = subtotal + tax;
    const ci = ri(0, customerIds.length - 1);
    const createdAt = daysAgo(ri(0, 60));
    const due = new Date(createdAt.toDate()); due.setDate(due.getDate() + 30);
    const invStatus = rf(['paid', 'unpaid', 'unpaid', 'pending']);
    const invData = {
      _seed: SEED_TAG, businessId,
      receiptNumber: 'INV-' + (2000 + i),
      customer: { id: customerIds[ci], name: customerDefs[ci][0], email: customerDefs[ci][1], phone: customerDefs[ci][2] },
      items, subtotal, tax, discount: 0, total,
      status: invStatus,
      paymentMethod: 'Invoice',
      type: 'invoice',
      createdAt,
      dueDate: due.toISOString(),
      notes: 'Thank you for your business. Please remit payment via bank transfer.',
      createdBy: userId,
    };
    ib.set(ref, invData);
    rbInvoices.set(receiptRef, invData);
  }
  await ib.commit();
  await rbInvoices.commit();
  console.log('  20 invoices (synced to invoices and receipts)');

  // ESTIMATES
  console.log('\nSeeding estimates/quotes...');
  const eb = db.batch();
  for (let i = 0; i < 10; i++) {
    const ref = db.collection('estimates').doc();
    const ci = ri(0, customerIds.length - 1);
    const pi = ri(0, productDefs.length - 1);
    const qty = ri(1, 5);
    const subtotal = productDefs[pi].price * qty;
    const due = new Date(); due.setDate(due.getDate() + 14);
    eb.set(ref, {
      _seed: SEED_TAG, businessId,
      estimateNumber: 'QT-' + (3000 + i),
      customer: { id: customerIds[ci], name: customerDefs[ci][0], email: customerDefs[ci][1] },
      items: [{ productId: productIds[pi], name: productDefs[pi].name, quantity: qty, price: productDefs[pi].price, total: subtotal }],
      subtotal, tax: 0, discount: 0, total: subtotal,
      status: rf(['draft', 'sent', 'accepted', 'declined']),
      createdAt: daysAgo(ri(1, 30)),
      expiryDate: Timestamp.fromDate(due),
    });
  }
  await eb.commit();
  console.log('  10 estimates');

  // EXPENSES
  console.log('\nSeeding expenses...');
  const exb = db.batch();
  const exSubBatch = db.batch();
  for (let i = 0; i < 15; i++) {
    const ref = db.collection('expenses').doc();
    const subRef = db.collection(`businessInstances/${businessId}/expenses`).doc(ref.id);
    const amount = ri(5000, 200000);
    const category = rf(['Rent & Utilities','Logistics & Fuel','Staff Salaries','Digital Marketing','Office Maintenance','Packaging Supplies','Software Subscriptions']);
    const desc = rf(['Monthly office rent','Electricity utility bill','Team salary disbursement','Google & Social Ads campaign','Generator servicing & fuel','Packaging boxes order','Cloud server subscription']);
    const date = daysAgo(ri(0, 90));
    const expData = {
      _seed: SEED_TAG, businessId,
      amount,
      category,
      paymentMode: rf(['Cash', 'Bank Transfer', 'Card']),
      description: desc,
      date,
      paidBy: 'Bello Imam',
      status: rf(['paid','pending']),
      createdAt: date,
    };
    exb.set(ref, expData);
    exSubBatch.set(subRef, expData);
  }
  await exb.commit();
  await exSubBatch.commit();
  console.log('  15 expenses (synced to root and business subcollection)');

  // RECURRING INVOICES
  console.log('\nSeeding recurring invoices...');
  const rrb = db.batch();
  for (let i = 0; i < 3; i++) {
    const ref = db.collection('recurring_invoices').doc();
    const ci = ri(0, customerIds.length - 1);
    const pi = ri(0, productDefs.length - 1);
    rrb.set(ref, {
      _seed: SEED_TAG, businessId,
      recurringNumber: 'RI-' + (4000 + i),
      customer: { id: customerIds[ci], name: customerDefs[ci][0], email: customerDefs[ci][1] },
      items: [{ productId: productIds[pi], name: productDefs[pi].name, quantity: 1, price: productDefs[pi].price, total: productDefs[pi].price }],
      total: productDefs[pi].price * ri(1, 3),
      frequency: rf(['monthly','weekly','quarterly']),
      status: 'active',
      nextInvoiceDate: daysAgo(-ri(5, 30)),
      startDate: daysAgo(ri(30, 90)),
      createdAt: daysAgo(ri(30, 90)),
    });
  }
  await rrb.commit();
  console.log('  3 recurring invoices');

  // CREDIT NOTES
  console.log('\nSeeding credit notes...');
  const cnb = db.batch();
  for (let i = 0; i < 5; i++) {
    const ref = db.collection('credit_notes').doc();
    const ci = ri(0, customerIds.length - 1);
    cnb.set(ref, {
      _seed: SEED_TAG, businessId,
      creditNoteNumber: 'CN-' + (5000 + i),
      customer: { id: customerIds[ci], name: customerDefs[ci][0], email: customerDefs[ci][1] },
      amount: ri(2000, 30000),
      reason: rf(['Returned goods','Overcharge correction','Defective product','Goodwill adjustment']),
      status: rf(['issued','applied','void']),
      relatedInvoiceId: invoiceIds[ri(0, invoiceIds.length - 1)],
      createdAt: daysAgo(ri(1, 45)),
    });
  }
  await cnb.commit();
  console.log('  5 credit notes');

  // PAYMENTS RECEIVED
  console.log('\nSeeding payments received...');
  const prb = db.batch();
  for (let i = 0; i < 8; i++) {
    const ref = db.collection('payment_received').doc();
    const ci = ri(0, customerIds.length - 1);
    prb.set(ref, {
      _seed: SEED_TAG, businessId,
      paymentNumber: 'PAY-' + (6000 + i),
      customer: { id: customerIds[ci], name: customerDefs[ci][0], email: customerDefs[ci][1] },
      amount: ri(10000, 200000),
      paymentMethod: rf(['Bank Transfer','Cash','Paystack']),
      reference: 'REF-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
      relatedInvoiceId: invoiceIds[ri(0, invoiceIds.length - 1)],
      notes: 'Payment received in full',
      createdAt: daysAgo(ri(0, 30)),
    });
  }
  await prb.commit();
  console.log('  8 payments received');

  // DELIVERY CHALLANS
  console.log('\nSeeding delivery challans...');
  const dcb = db.batch();
  for (let i = 0; i < 5; i++) {
    const ref = db.collection('delivery_challans').doc();
    const ci = ri(0, customerIds.length - 1);
    const pi = ri(0, productDefs.length - 1);
    dcb.set(ref, {
      _seed: SEED_TAG, businessId,
      challanNumber: 'DC-' + (7000 + i),
      customer: { id: customerIds[ci], name: customerDefs[ci][0], email: customerDefs[ci][1] },
      items: [{ productId: productIds[pi], name: productDefs[pi].name, quantity: ri(1, 10) }],
      deliveryAddress: ri(1, 50) + ' Victoria Island, Lagos',
      status: rf(['draft','dispatched','delivered']),
      deliveryDate: daysAgo(-ri(1, 7)),
      createdAt: daysAgo(ri(1, 20)),
    });
  }
  await dcb.commit();
  console.log('  5 delivery challans');

  // PROFORMA INVOICES
  console.log('\nSeeding proforma invoices...');
  const pfb = db.batch();
  for (let i = 0; i < 5; i++) {
    const ref = db.collection('proforma_invoices').doc();
    const ci = ri(0, customerIds.length - 1);
    const pi = ri(0, productDefs.length - 1);
    pfb.set(ref, {
      _seed: SEED_TAG, businessId,
      proformaNumber: 'PF-' + (8000 + i),
      customer: { id: customerIds[ci], name: customerDefs[ci][0], email: customerDefs[ci][1] },
      items: [{ productId: productIds[pi], name: productDefs[pi].name, quantity: 1, price: productDefs[pi].price, total: productDefs[pi].price }],
      total: productDefs[pi].price * ri(1, 5),
      status: rf(['draft','sent','converted']),
      validUntil: daysAgo(-ri(5, 20)),
      createdAt: daysAgo(ri(1, 30)),
    });
  }
  await pfb.commit();
  console.log('  5 proforma invoices');

  // BILLS
  console.log('\nSeeding bills...');
  const blb = db.batch();
  for (let i = 0; i < 6; i++) {
    const ref = db.collection('bills').doc();
    blb.set(ref, {
      _seed: SEED_TAG, businessId,
      billNumber: 'BILL-' + (9000 + i),
      vendor: rf(['LECO (Electricity)','MTN Nigeria','DSTV','Landlord','Water Board','Google Ads']),
      amount: ri(5000, 100000),
      dueDate: daysAgo(-ri(0, 30)),
      status: rf(['unpaid','paid','overdue']),
      category: rf(['utilities','marketing','rent','subscriptions']),
      createdAt: daysAgo(ri(0, 60)),
    });
  }
  await blb.commit();
  console.log('  6 bills');

  // PROJECTS
  console.log('\nSeeding projects...');
  const projectNames = [
    'Website Redesign for Amaka Obi',
    'Monthly Content Management (Chidi)',
    'Brand Identity Package',
    'E-commerce Setup for Client',
  ];
  const projectIds = [];
  const pjb = db.batch();
  for (let i = 0; i < projectNames.length; i++) {
    const ref = db.collection('projects').doc();
    projectIds.push(ref.id);
    const ci = i % customerIds.length;
    const budget = ri(100000, 1000000);
    pjb.set(ref, {
      _seed: SEED_TAG, businessId,
      name: projectNames[i],
      customer: { id: customerIds[ci], name: customerDefs[ci][0] },
      budget,
      amountBilled: Math.round(budget * ri(20, 80) / 100),
      status: rf(['active','completed','on_hold']),
      startDate: daysAgo(ri(30, 90)),
      endDate: daysAgo(-ri(10, 60)),
      description: 'A key client project.',
      createdAt: daysAgo(ri(30, 90)),
    });
  }
  await pjb.commit();
  console.log(' ', projectNames.length, 'projects');

  // TIME LOGS
  console.log('\nSeeding time logs...');
  const tlb = db.batch();
  for (let i = 0; i < 12; i++) {
    const ref = db.collection('time_logs').doc();
    const hours = ri(1, 8);
    const rate = rf([5000, 7500, 10000, 15000]);
    const pi = i % projectIds.length;
    tlb.set(ref, {
      _seed: SEED_TAG, businessId,
      projectId: projectIds[pi],
      projectName: projectNames[pi],
      description: rf(['UI design work','Client meeting','Development','Testing & QA','Planning session','Content writing']),
      hours, hourlyRate: rate, total: hours * rate,
      billable: true,
      billed: rf([true, false]),
      date: daysAgo(ri(0, 30)),
      createdAt: daysAgo(ri(0, 30)),
    });
  }
  await tlb.commit();
  console.log('  12 time logs');

  // VENDORS
  console.log('\nSeeding vendors...');
  const vendorDefs = [
    { name: 'Dangote Distributors Ltd', phone: '08100000001', email: 'sales@dangote-dist.com' },
    { name: 'Lagos Phone Wholesale', phone: '08100000002', email: 'orders@lgphonewholesale.com' },
    { name: 'FastFreight Logistics', phone: '08100000003', email: 'shipping@fastfreight.ng' },
    { name: 'Chukwudi Supplies', phone: '08100000004', email: 'chukwudi.sup@gmail.com' },
  ];
  const vendorIds = [];
  const vb = db.batch();
  for (const v of vendorDefs) {
    const ref = db.collection('vendors').doc();
    vendorIds.push(ref.id);
    vb.set(ref, {
      _seed: SEED_TAG, businessId,
      name: v.name, phone: v.phone, email: v.email,
      paymentTerms: rf(['Net 30','Immediate','Net 15','Cash on Delivery']),
      totalPurchases: ri(50000, 2000000),
      outstandingBalance: ri(0, 200000),
      createdAt: daysAgo(ri(60, 180)),
    });
  }
  await vb.commit();
  console.log(' ', vendorDefs.length, 'vendors');

  // PURCHASE ORDERS
  console.log('\nSeeding purchase orders...');
  const pob = db.batch();
  for (let i = 0; i < 6; i++) {
    const ref = db.collection('purchase_orders').doc();
    const vi = ri(0, vendorIds.length - 1);
    const pi = ri(0, productDefs.length - 1);
    const qty = ri(10, 100);
    const unitCost = productDefs[pi].cost;
    const total = qty * unitCost;
    pob.set(ref, {
      _seed: SEED_TAG, businessId,
      purchaseNumber: 'PO-' + (1001 + i),
      supplierId: vendorIds[vi], supplierName: vendorDefs[vi].name,
      orderDate: daysAgo(ri(0, 30)),
      status: rf(['draft','ordered','received']),
      paymentStatus: rf(['unpaid','partially_paid','paid']),
      items: [{ productId: productIds[pi], productName: productDefs[pi].name, quantityOrdered: qty, quantityReceived: 0, unitCost, totalCost: total }],
      totalAmount: total,
      amountPaid: rf([0, Math.round(total / 2)]),
      balanceDue: total,
      createdAt: daysAgo(ri(0, 30)),
      createdByName: 'Bello Imam',
    });
  }
  await pob.commit();
  console.log('  6 purchase orders');

  console.log('\n========================================');
  console.log('SEED COMPLETE for businessId:', businessId);
  console.log('  8 customers | 14 products | 35 receipts | 20 invoices');
  console.log('  10 quotes   | 15 expenses | 3 recurring | 5 credit notes');
  console.log('  8 payments  | 5 challans  | 5 proforma  | 6 bills');
  console.log('  4 projects  | 12 timelogs | 4 vendors   | 6 purchase orders');
  console.log('\nTo delete all seeded data: node scripts/seed-dev-data.mjs --delete');
}

if (process.argv.includes('--delete')) {
  const { businessId } = await findUserAndBusiness();
  await deleteSeedData(businessId);
} else {
  await seed();
}
process.exit(0);

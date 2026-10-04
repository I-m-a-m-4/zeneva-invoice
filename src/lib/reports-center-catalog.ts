export interface ReportItem {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  description: string;
  isFavorite?: boolean;
  columns: Array<{
    key: string;
    label: string;
    align?: 'left' | 'center' | 'right';
    isCurrency?: boolean;
    isDate?: boolean;
    isNumeric?: boolean;
  }>;
}

export interface ReportCategory {
  id: string;
  label: string;
  reports: ReportItem[];
}

export const REPORTS_CATALOG: ReportCategory[] = [
  // ==========================================
  // 1. SALES
  // ==========================================
  {
    id: 'sales',
    label: 'Sales',
    reports: [
      {
        id: 'sales-by-customer',
        name: 'Sales by Customer',
        category: 'sales',
        categoryLabel: 'Sales',
        description: 'Comprehensive breakdown of invoice count, total sales, and tax contribution grouped by client.',
        isFavorite: true,
        columns: [
          { key: 'name', label: 'NAME', align: 'left' },
          { key: 'invoiceCount', label: 'INVOICE COUNT', align: 'center', isNumeric: true },
          { key: 'sales', label: 'SALES', align: 'right', isCurrency: true },
          { key: 'salesWithTax', label: 'SALES WITH TAX', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'sales-by-item',
        name: 'Sales by Item',
        category: 'sales',
        categoryLabel: 'Sales',
        description: 'Product and inventory line-item turnover, quantities sold, average price, and revenue contribution.',
        isFavorite: true,
        columns: [
          { key: 'name', label: 'ITEM NAME', align: 'left' },
          { key: 'sku', label: 'SKU / CODE', align: 'left' },
          { key: 'quantitySold', label: 'QUANTITY SOLD', align: 'center', isNumeric: true },
          { key: 'sales', label: 'SALES', align: 'right', isCurrency: true },
          { key: 'salesWithTax', label: 'SALES WITH TAX', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'sales-by-salesperson',
        name: 'Sales by Salesperson',
        category: 'sales',
        categoryLabel: 'Sales',
        description: 'Performance metrics, invoice volume, and closed revenue per sales agent or cashier.',
        isFavorite: true,
        columns: [
          { key: 'name', label: 'SALESPERSON', align: 'left' },
          { key: 'role', label: 'ROLE / BRANCH', align: 'left' },
          { key: 'invoiceCount', label: 'INVOICE COUNT', align: 'center', isNumeric: true },
          { key: 'avgBasket', label: 'AVG BASKET', align: 'right', isCurrency: true },
          { key: 'sales', label: 'TOTAL SALES', align: 'right', isCurrency: true },
        ],
      },
    ],
  },

  // ==========================================
  // 2. RECEIVABLES
  // ==========================================
  {
    id: 'receivables',
    label: 'Receivables',
    reports: [
      {
        id: 'ar-aging-summary',
        name: 'AR Aging Summary',
        category: 'receivables',
        categoryLabel: 'Receivables',
        description: 'Aging debt summary bracketed into Current, 1-30, 31-60, 61-90, and >90 days overdue.',
        isFavorite: true,
        columns: [
          { key: 'customer', label: 'CUSTOMER', align: 'left' },
          { key: 'current', label: 'CURRENT', align: 'right', isCurrency: true },
          { key: 'days1_30', label: '1 - 30 DAYS', align: 'right', isCurrency: true },
          { key: 'days31_60', label: '31 - 60 DAYS', align: 'right', isCurrency: true },
          { key: 'days61_90', label: '61 - 90 DAYS', align: 'right', isCurrency: true },
          { key: 'days90plus', label: '> 90 DAYS', align: 'right', isCurrency: true },
          { key: 'total', label: 'TOTAL DUE', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'ar-aging-details',
        name: 'AR Aging Details',
        category: 'receivables',
        categoryLabel: 'Receivables',
        description: 'Invoice-by-invoice breakdown of unpaid balances, days past due, and interest accrual.',
        columns: [
          { key: 'customer', label: 'CUSTOMER', align: 'left' },
          { key: 'invoiceNum', label: 'INVOICE #', align: 'left' },
          { key: 'date', label: 'DATE', align: 'center', isDate: true },
          { key: 'dueDate', label: 'DUE DATE', align: 'center', isDate: true },
          { key: 'age', label: 'AGE (DAYS)', align: 'center', isNumeric: true },
          { key: 'balanceDue', label: 'BALANCE DUE', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'invoice-details',
        name: 'Invoice Details',
        category: 'receivables',
        categoryLabel: 'Receivables',
        description: 'Comprehensive registry of all issued invoices, payment status, settlement date, and balances.',
        columns: [
          { key: 'status', label: 'STATUS', align: 'center' },
          { key: 'date', label: 'DATE', align: 'center', isDate: true },
          { key: 'invoiceNum', label: 'INVOICE #', align: 'left' },
          { key: 'customer', label: 'CUSTOMER NAME', align: 'left' },
          { key: 'dueDate', label: 'DUE DATE', align: 'center', isDate: true },
          { key: 'amount', label: 'AMOUNT', align: 'right', isCurrency: true },
          { key: 'balanceDue', label: 'BALANCE DUE', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'quote-details',
        name: 'Quote Details',
        category: 'receivables',
        categoryLabel: 'Receivables',
        description: 'Track price quotations, customer estimates, conversion rates, and expiration dates.',
        columns: [
          { key: 'status', label: 'STATUS', align: 'center' },
          { key: 'date', label: 'DATE', align: 'center', isDate: true },
          { key: 'quoteNum', label: 'QUOTE #', align: 'left' },
          { key: 'customer', label: 'CUSTOMER NAME', align: 'left' },
          { key: 'expiryDate', label: 'EXPIRY DATE', align: 'center', isDate: true },
          { key: 'amount', label: 'AMOUNT', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'quote-item-details',
        name: 'Quote Item Details',
        category: 'receivables',
        categoryLabel: 'Receivables',
        description: 'Itemized breakdown of services and goods quoted across active proposals.',
        columns: [
          { key: 'quoteNum', label: 'QUOTE #', align: 'left' },
          { key: 'customer', label: 'CUSTOMER', align: 'left' },
          { key: 'itemName', label: 'ITEM & DESCRIPTION', align: 'left' },
          { key: 'quantity', label: 'QUANTITY', align: 'center', isNumeric: true },
          { key: 'rate', label: 'RATE', align: 'right', isCurrency: true },
          { key: 'amount', label: 'AMOUNT', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'bad-debts',
        name: 'Bad Debts',
        category: 'receivables',
        categoryLabel: 'Receivables',
        description: 'Uncollectible invoices and write-offs marked as bad debts for fiscal reconciliation.',
        columns: [
          { key: 'customer', label: 'CUSTOMER', align: 'left' },
          { key: 'invoiceNum', label: 'INVOICE #', align: 'left' },
          { key: 'date', label: 'INVOICE DATE', align: 'center', isDate: true },
          { key: 'daysOverdue', label: 'DAYS OVERDUE', align: 'center', isNumeric: true },
          { key: 'amount', label: 'WRITTEN-OFF AMOUNT', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'bank-charges',
        name: 'Bank Charges',
        category: 'receivables',
        categoryLabel: 'Receivables',
        description: 'Processing fees, wire surcharges, and gateway deductions incurred on receivables.',
        columns: [
          { key: 'date', label: 'DATE', align: 'center', isDate: true },
          { key: 'ref', label: 'PAYMENT REF', align: 'left' },
          { key: 'gateway', label: 'CHANNEL / GATEWAY', align: 'left' },
          { key: 'fee', label: 'FEE DEDUCTED', align: 'right', isCurrency: true },
          { key: 'netAmount', label: 'NET SETTLED', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'customer-balance-summary',
        name: 'Customer Balance Summary',
        category: 'receivables',
        categoryLabel: 'Receivables',
        description: 'Gross invoice volume, payments made, and current net balances owed across all customers.',
        columns: [
          { key: 'customer', label: 'CUSTOMER NAME', align: 'left' },
          { key: 'totalInvoiced', label: 'TOTAL INVOICED', align: 'right', isCurrency: true },
          { key: 'amountPaid', label: 'AMOUNT PAID', align: 'right', isCurrency: true },
          { key: 'closingBalance', label: 'CLOSING BALANCE', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'receivable-summary',
        name: 'Receivable Summary',
        category: 'receivables',
        categoryLabel: 'Receivables',
        description: 'High-level accounts receivable ledger with credit limits and settlement status.',
        columns: [
          { key: 'customer', label: 'CUSTOMER NAME', align: 'left' },
          { key: 'creditLimit', label: 'CREDIT LIMIT', align: 'right', isCurrency: true },
          { key: 'lastPaymentDate', label: 'LAST PAYMENT DATE', align: 'center', isDate: true },
          { key: 'outstandingBalance', label: 'OUTSTANDING BALANCE', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'receivable-details',
        name: 'Receivable Details',
        category: 'receivables',
        categoryLabel: 'Receivables',
        description: 'Transaction-level log of invoices and payments affecting customer account balances.',
        columns: [
          { key: 'date', label: 'DATE', align: 'center', isDate: true },
          { key: 'transactionNum', label: 'TRANSACTION #', align: 'left' },
          { key: 'type', label: 'TYPE', align: 'center' },
          { key: 'customer', label: 'CUSTOMER', align: 'left' },
          { key: 'amount', label: 'AMOUNT', align: 'right', isCurrency: true },
          { key: 'openBalance', label: 'OPEN BALANCE', align: 'right', isCurrency: true },
        ],
      },
    ],
  },

  // ==========================================
  // 3. PAYMENTS RECEIVED
  // ==========================================
  {
    id: 'payments-received',
    label: 'Payments Received',
    reports: [
      {
        id: 'payments-received-list',
        name: 'Payments Received',
        category: 'payments-received',
        categoryLabel: 'Payments Received',
        description: 'Chronological log of settled customer receipts, payment methods, and linked invoices.',
        isFavorite: true,
        columns: [
          { key: 'date', label: 'DATE', align: 'center', isDate: true },
          { key: 'paymentNum', label: 'PAYMENT #', align: 'left' },
          { key: 'customer', label: 'CUSTOMER NAME', align: 'left' },
          { key: 'method', label: 'PAYMENT METHOD', align: 'left' },
          { key: 'invoiceNum', label: 'INVOICE #', align: 'left' },
          { key: 'amount', label: 'AMOUNT', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'time-to-get-paid',
        name: 'Time to Get Paid',
        category: 'payments-received',
        categoryLabel: 'Payments Received',
        description: 'Days elapsed between invoice generation and final payment settlement per account.',
        columns: [
          { key: 'customer', label: 'CUSTOMER', align: 'left' },
          { key: 'invoiceNum', label: 'INVOICE #', align: 'left' },
          { key: 'invoiceDate', label: 'INVOICE DATE', align: 'center', isDate: true },
          { key: 'paidDate', label: 'PAID DATE', align: 'center', isDate: true },
          { key: 'daysToPay', label: 'DAYS TO GET PAID', align: 'center', isNumeric: true },
          { key: 'amount', label: 'AMOUNT', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'credit-note-details',
        name: 'Credit Note Details',
        category: 'payments-received',
        categoryLabel: 'Payments Received',
        description: 'Record of issued credit notes, returns, and balance deductions applied against invoices.',
        columns: [
          { key: 'date', label: 'DATE', align: 'center', isDate: true },
          { key: 'creditNoteNum', label: 'CREDIT NOTE #', align: 'left' },
          { key: 'customer', label: 'CUSTOMER NAME', align: 'left' },
          { key: 'reason', label: 'REASON / REMARK', align: 'left' },
          { key: 'amount', label: 'CREDIT AMOUNT', align: 'right', isCurrency: true },
          { key: 'balance', label: 'UNUSED BALANCE', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'refund-history',
        name: 'Refund History',
        category: 'payments-received',
        categoryLabel: 'Payments Received',
        description: 'Historical register of client refunds, reversal channels, and transaction authorizations.',
        columns: [
          { key: 'date', label: 'DATE', align: 'center', isDate: true },
          { key: 'refundNum', label: 'REFUND #', align: 'left' },
          { key: 'customer', label: 'CUSTOMER NAME', align: 'left' },
          { key: 'originalRef', label: 'ORIGINAL RECEIPT', align: 'left' },
          { key: 'mode', label: 'PAYMENT MODE', align: 'left' },
          { key: 'amount', label: 'REFUNDED AMOUNT', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'withholding-tax',
        name: 'Withholding Tax',
        category: 'payments-received',
        categoryLabel: 'Payments Received',
        description: 'Withholding tax (WHT) amounts deducted by enterprise clients prior to settlement.',
        columns: [
          { key: 'date', label: 'DATE', align: 'center', isDate: true },
          { key: 'invoiceNum', label: 'INVOICE #', align: 'left' },
          { key: 'customer', label: 'CUSTOMER / ENTITY', align: 'left' },
          { key: 'taxRate', label: 'WHT RATE %', align: 'center' },
          { key: 'whtDeducted', label: 'TAX DEDUCTED', align: 'right', isCurrency: true },
          { key: 'netPaid', label: 'NET RECEIVED', align: 'right', isCurrency: true },
        ],
      },
    ],
  },

  // ==========================================
  // 4. RECURRING INVOICES
  // ==========================================
  {
    id: 'recurring-invoices',
    label: 'Recurring Invoices',
    reports: [
      {
        id: 'recurring-invoice-details',
        name: 'Recurring Invoice Details',
        category: 'recurring-invoices',
        categoryLabel: 'Recurring Invoices',
        description: 'Active subscription and recurring billing schedules, frequencies, and next dispatch dates.',
        isFavorite: true,
        columns: [
          { key: 'profileName', label: 'PROFILE NAME', align: 'left' },
          { key: 'customer', label: 'CUSTOMER', align: 'left' },
          { key: 'frequency', label: 'FREQUENCY', align: 'center' },
          { key: 'nextInvoiceDate', label: 'NEXT INVOICE DATE', align: 'center', isDate: true },
          { key: 'amount', label: 'CYCLE AMOUNT', align: 'right', isCurrency: true },
          { key: 'status', label: 'STATUS', align: 'center' },
        ],
      },
    ],
  },

  // ==========================================
  // 5. PURCHASES AND EXPENSES
  // ==========================================
  {
    id: 'purchases-expenses',
    label: 'Purchases and Expenses',
    reports: [
      {
        id: 'expense-details',
        name: 'Expense Details',
        category: 'purchases-expenses',
        categoryLabel: 'Purchases and Expenses',
        description: 'Itemized disbursement registry with merchant details, date stamps, and payment sources.',
        isFavorite: true,
        columns: [
          { key: 'date', label: 'DATE', align: 'center', isDate: true },
          { key: 'expenseNum', label: 'EXPENSE #', align: 'left' },
          { key: 'category', label: 'CATEGORY', align: 'left' },
          { key: 'vendor', label: 'VENDOR / PAYEE', align: 'left' },
          { key: 'account', label: 'PAID THROUGH', align: 'left' },
          { key: 'amount', label: 'AMOUNT', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'expenses-by-category',
        name: 'Expenses by Category',
        category: 'purchases-expenses',
        categoryLabel: 'Purchases and Expenses',
        description: 'Consolidated overhead and COGS categorized by operational expense accounts.',
        columns: [
          { key: 'category', label: 'CATEGORY', align: 'left' },
          { key: 'count', label: 'TRANSACTION COUNT', align: 'center', isNumeric: true },
          { key: 'totalAmount', label: 'TOTAL AMOUNT', align: 'right', isCurrency: true },
          { key: 'percentage', label: '% OF TOTAL', align: 'right' },
        ],
      },
      {
        id: 'expenses-by-customer',
        name: 'Expenses by Customer',
        category: 'purchases-expenses',
        categoryLabel: 'Purchases and Expenses',
        description: 'Direct project expenditures and pass-through costs attributed to client contracts.',
        columns: [
          { key: 'customer', label: 'CUSTOMER NAME', align: 'left' },
          { key: 'project', label: 'PROJECT / REF', align: 'left' },
          { key: 'billable', label: 'BILLABLE AMOUNT', align: 'right', isCurrency: true },
          { key: 'nonBillable', label: 'NON-BILLABLE', align: 'right', isCurrency: true },
          { key: 'total', label: 'TOTAL EXPENSE', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'expenses-by-project',
        name: 'Expenses by Project',
        category: 'purchases-expenses',
        categoryLabel: 'Purchases and Expenses',
        description: 'Budget vs. actual cost comparisons across ongoing operational and client projects.',
        columns: [
          { key: 'project', label: 'PROJECT NAME', align: 'left' },
          { key: 'budget', label: 'BUDGETED COST', align: 'right', isCurrency: true },
          { key: 'actual', label: 'ACTUAL EXPENSES', align: 'right', isCurrency: true },
          { key: 'variance', label: 'VARIANCE', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'billable-expense-details',
        name: 'Billable Expense Details',
        category: 'purchases-expenses',
        categoryLabel: 'Purchases and Expenses',
        description: 'Audit log of client-reimbursable expenses and their associated invoice billing statuses.',
        columns: [
          { key: 'date', label: 'DATE', align: 'center', isDate: true },
          { key: 'customer', label: 'CUSTOMER', align: 'left' },
          { key: 'description', label: 'DESCRIPTION', align: 'left' },
          { key: 'status', label: 'INVOICED STATUS', align: 'center' },
          { key: 'amount', label: 'AMOUNT', align: 'right', isCurrency: true },
        ],
      },
    ],
  },

  // ==========================================
  // 6. TAXES
  // ==========================================
  {
    id: 'taxes',
    label: 'Taxes',
    reports: [
      {
        id: 'tax-summary',
        name: 'Tax Summary',
        category: 'taxes',
        categoryLabel: 'Taxes',
        description: 'Summary of taxable sales, tax rates, input/output tax collected, and net tax liabilities.',
        isFavorite: true,
        columns: [
          { key: 'taxName', label: 'TAX AUTHORITY / RATE', align: 'left' },
          { key: 'taxableAmount', label: 'TAXABLE SALES', align: 'right', isCurrency: true },
          { key: 'taxCollected', label: 'TAX COLLECTED', align: 'right', isCurrency: true },
          { key: 'netPayable', label: 'NET PAYABLE', align: 'right', isCurrency: true },
        ],
      },
    ],
  },

  // ==========================================
  // 7. PROJECTS AND TIMESHEET
  // ==========================================
  {
    id: 'projects-timesheet',
    label: 'Projects and Timesheet',
    reports: [
      {
        id: 'timesheet-details',
        name: 'Timesheet Details',
        category: 'projects-timesheet',
        categoryLabel: 'Projects and Timesheet',
        description: 'Logged employee hours, task categories, billable rate calculations, and approval status.',
        isFavorite: true,
        columns: [
          { key: 'date', label: 'DATE', align: 'center', isDate: true },
          { key: 'staff', label: 'STAFF MEMBER', align: 'left' },
          { key: 'project', label: 'PROJECT', align: 'left' },
          { key: 'hours', label: 'HOURS LOGGED', align: 'center', isNumeric: true },
          { key: 'billableRate', label: 'BILLABLE RATE', align: 'right', isCurrency: true },
          { key: 'amount', label: 'TOTAL AMOUNT', align: 'right', isCurrency: true },
        ],
      },
      {
        id: 'project-summary',
        name: 'Project Summary',
        category: 'projects-timesheet',
        categoryLabel: 'Projects and Timesheet',
        description: 'Status overview of active client deliverables, billed revenue, and logged milestones.',
        columns: [
          { key: 'project', label: 'PROJECT NAME', align: 'left' },
          { key: 'client', label: 'CLIENT', align: 'left' },
          { key: 'status', label: 'STATUS', align: 'center' },
          { key: 'billedAmount', label: 'BILLED REVENUE', align: 'right', isCurrency: true },
          { key: 'hoursLogged', label: 'HOURS LOGGED', align: 'center', isNumeric: true },
        ],
      },
      {
        id: 'project-details',
        name: 'Project Details',
        category: 'projects-timesheet',
        categoryLabel: 'Projects and Timesheet',
        description: 'Granular task-level progress, assignee completion rates, and estimated delivery dates.',
        columns: [
          { key: 'task', label: 'TASK / MILESTONE', align: 'left' },
          { key: 'assignee', label: 'ASSIGNEE', align: 'left' },
          { key: 'estimatedHours', label: 'EST. HOURS', align: 'center', isNumeric: true },
          { key: 'actualHours', label: 'ACTUAL HOURS', align: 'center', isNumeric: true },
          { key: 'completion', label: 'COMPLETION %', align: 'right' },
        ],
      },
      {
        id: 'projects-revenue-summary',
        name: 'Projects Revenue Summary',
        category: 'projects-timesheet',
        categoryLabel: 'Projects and Timesheet',
        description: 'Realized project billings vs. unbilled work-in-progress (WIP) and projected retainers.',
        columns: [
          { key: 'project', label: 'PROJECT NAME', align: 'left' },
          { key: 'client', label: 'CLIENT', align: 'left' },
          { key: 'invoiced', label: 'INVOICED REVENUE', align: 'right', isCurrency: true },
          { key: 'unbilledWip', label: 'UNBILLED WIP', align: 'right', isCurrency: true },
          { key: 'total', label: 'TOTAL VALUE', align: 'right', isCurrency: true },
        ],
      },
    ],
  },

  // ==========================================
  // 8. ACTIVITY
  // ==========================================
  {
    id: 'activity',
    label: 'Activity',
    reports: [
      {
        id: 'system-mails',
        name: 'System Mails',
        category: 'activity',
        categoryLabel: 'Activity',
        description: 'Audit log of automated notifications, invoice emails, receipt dispatches, and delivery status.',
        isFavorite: true,
        columns: [
          { key: 'timestamp', label: 'TIMESTAMP', align: 'center', isDate: true },
          { key: 'recipient', label: 'RECIPIENT', align: 'left' },
          { key: 'subject', label: 'SUBJECT / EVENT', align: 'left' },
          { key: 'type', label: 'TEMPLATE TYPE', align: 'left' },
          { key: 'status', label: 'DELIVERY STATUS', align: 'center' },
        ],
      },
      {
        id: 'activity-logs',
        name: 'Activity Logs',
        category: 'activity',
        categoryLabel: 'Activity',
        description: 'Internal security and audit trail recording staff operations, price overrides, and data edits.',
        columns: [
          { key: 'timestamp', label: 'TIMESTAMP', align: 'center', isDate: true },
          { key: 'user', label: 'USER / STAFF', align: 'left' },
          { key: 'action', label: 'ACTION', align: 'left' },
          { key: 'target', label: 'ENTITY / TARGET', align: 'left' },
          { key: 'terminal', label: 'BRANCH / DEVICE', align: 'left' },
        ],
      },
      {
        id: 'exception-report',
        name: 'Exception Report',
        category: 'activity',
        categoryLabel: 'Activity',
        description: 'System-flagged anomalies: price overrides, voids, manual discounts, and negative stock actions.',
        columns: [
          { key: 'timestamp', label: 'TIMESTAMP', align: 'center', isDate: true },
          { key: 'severity', label: 'SEVERITY', align: 'center' },
          { key: 'module', label: 'MODULE', align: 'left' },
          { key: 'description', label: 'ANOMALY DESCRIPTION', align: 'left' },
          { key: 'resolved', label: 'STATUS', align: 'center' },
        ],
      },
      {
        id: 'portal-activities',
        name: 'Portal Activities',
        category: 'activity',
        categoryLabel: 'Activity',
        description: 'Client customer portal interactions: viewed invoices, quote approvals, and self-service downloads.',
        columns: [
          { key: 'timestamp', label: 'TIMESTAMP', align: 'center', isDate: true },
          { key: 'client', label: 'CUSTOMER', align: 'left' },
          { key: 'activity', label: 'ACTIVITY', align: 'left' },
          { key: 'document', label: 'ACCESSED DOCUMENT', align: 'left' },
          { key: 'ip', label: 'IP ADDRESS', align: 'left' },
        ],
      },
      {
        id: 'customer-reviews',
        name: 'Customer Reviews',
        category: 'activity',
        categoryLabel: 'Activity',
        description: 'Satisfaction ratings, post-sale feedback, and customer NPS survey scores.',
        columns: [
          { key: 'date', label: 'DATE', align: 'center', isDate: true },
          { key: 'customer', label: 'CUSTOMER', align: 'left' },
          { key: 'rating', label: 'RATING', align: 'center' },
          { key: 'feedback', label: 'FEEDBACK / REMARKS', align: 'left' },
          { key: 'status', label: 'FOLLOW-UP', align: 'center' },
        ],
      },
    ],
  },
];

// Helper to look up a report by ID across all categories
export function findReportById(id: string): ReportItem | undefined {
  for (const cat of REPORTS_CATALOG) {
    const found = cat.reports.find((r) => r.id === id);
    if (found) return found;
  }
  return undefined;
}

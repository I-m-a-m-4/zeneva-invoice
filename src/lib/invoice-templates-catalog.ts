export interface TemplateDefinition {
  id: string;
  name: string;
  category: 'standard' | 'spreadsheet' | 'premium' | 'universal' | 'retail';
  description: string;
  badge?: string;
  hasSealBoxes?: boolean;
  docType?: 'invoices' | 'quotes' | 'credit-notes' | 'receipts' | 'statements';
}

export const INVOICE_TEMPLATES: TemplateDefinition[] = [
  // ==========================================
  // STANDARD (7 Templates)
  // ==========================================
  {
    id: 'standard',
    name: 'Standard',
    category: 'standard',
    description: 'Clean, modern layout matching the official standard with logo on the top-left, invoice metadata on the right, dark charcoal table header bar, and payment terms.',
    badge: 'Popular',
  },
  {
    id: 'standard-japanese',
    name: 'Standard - Japanese Style',
    category: 'standard',
    description: 'Traditional Japanese Qualified Invoice format (御請求書) with 3 Hanko approval seal boxes (Authorizer, Reviewer, Creator), registration number, and tax breakdown.',
    badge: 'Seal Boxes',
    hasSealBoxes: true,
  },
  {
    id: 'standard-japanese-no-seal',
    name: 'Standard - Japanese Style (Without Seal Boxes)',
    category: 'standard',
    description: 'Japanese invoice format featuring formal typography, dual tax rate breakdowns (10% and 8% reduced), and bank payment details, without approval seal boxes.',
  },
  {
    id: 'standard-european',
    name: 'Standard - European Style',
    category: 'standard',
    description: 'Compliant European B2B layout with supplier and customer VAT numbers, IBAN/BIC banking identifiers, and reverse charge tax indicators.',
    badge: 'EU VAT',
  },
  {
    id: 'standard-india-gst',
    name: 'Standard - India GST Style',
    category: 'standard',
    description: 'Official Indian Tax Invoice with GSTIN numbers, State code, Place of Supply, HSN/SAC codes, and CGST/SGST/IGST tax distribution.',
    badge: 'GST Ready',
  },
  {
    id: 'standard-srilanka',
    name: 'Standard - Sri Lanka Tax Invoice',
    category: 'standard',
    description: 'Structured Sri Lankan Tax Invoice with prominent center insignia, Tax Identification Number (TIN), VAT registration, and itemized VAT analysis.',
  },
  {
    id: 'standard-classical',
    name: 'Standard - Classical Elegant',
    category: 'standard',
    description: 'Traditional double-rule framed invoice with dignified typography, centered company header, and formal remittance section.',
  },

  // ==========================================
  // UNIVERSAL (4 Templates)
  // ==========================================
  {
    id: 'universal-lite',
    name: 'Lite',
    category: 'universal',
    description: 'Ultra-light, airy aesthetic featuring gentle gray divider rules, minimal typography, and generous whitespace for a contemporary look.',
    badge: 'Modern',
  },
  {
    id: 'universal-simple',
    name: 'Simple',
    category: 'universal',
    description: 'Clean boxed metadata sections, structured line items, and no superfluous ornamentation for direct clarity.',
  },
  {
    id: 'universal-compact',
    name: 'Compact',
    category: 'universal',
    description: 'Space-saving layout engineered for invoices with many line items, utilizing condensed padding to ensure single-page printing.',
    badge: 'High Density',
  },
  {
    id: 'universal-basic',
    name: 'Basic',
    category: 'universal',
    description: 'High-contrast design featuring an eye-catching coral-red header banner, matching bold typography, and framed item tables.',
    badge: 'Accent',
  },

  // ==========================================
  // RETAIL (4 Templates)
  // ==========================================
  {
    id: 'retail-pos',
    name: 'Retail - Store Receipt',
    category: 'retail',
    description: 'Authentic 80mm thermal register receipt with centered store heading, dashed tear-lines, monospace items, and barcode footer.',
    badge: 'POS Thermal',
  },
  {
    id: 'retail-supply',
    name: 'Retail - Supply Invoice',
    category: 'retail',
    description: 'Compact supply invoice format with delivery location, structured item rates, and quick customer sign-off stub.',
  },
  {
    id: 'retail-supermarket',
    name: 'Retail - Supermarket & Grocery',
    category: 'retail',
    description: 'Itemized retail slip featuring savings highlights, loyalty point counters, cashier identification, and store return policies.',
  },
  {
    id: 'retail-boutique',
    name: 'Retail - Boutique Slip',
    category: 'retail',
    description: 'Sophisticated narrow receipt format with elegant brand styling, social media handles, and digital payment QR code.',
    badge: 'Boutique',
  },

  // ==========================================
  // SPREADSHEET (4 Templates)
  // ==========================================
  {
    id: 'spreadsheet',
    name: 'Spreadsheet - Accounting Ledger',
    category: 'spreadsheet',
    description: 'Structured accounting ledger with clear column and row gridlines, banded zebra rows, and high numerical precision.',
    badge: 'Ledger',
  },
  {
    id: 'spreadsheet-financial',
    name: 'Spreadsheet - Financial Dense',
    category: 'spreadsheet',
    description: 'High-density corporate balance sheet invoice with SKU codes, rate multipliers, and multi-tier tax summary rows.',
  },
  {
    id: 'spreadsheet-columnar',
    name: 'Spreadsheet - Columnar',
    category: 'spreadsheet',
    description: 'Vertical column border dividers, distinct dark headers, and ledger summary blocks suited for auditing.',
  },
  {
    id: 'spreadsheet-minimal',
    name: 'Spreadsheet - Clean Grid',
    category: 'spreadsheet',
    description: 'Subtle gray gridlines with alternating rows and accounting double-underlines on balance totals.',
  },

  // ==========================================
  // PREMIUM (3 Templates)
  // ==========================================
  {
    id: 'continental',
    name: 'Premium Executive',
    category: 'premium',
    description: 'Executive corporate styling with a bold colored gradient header band, inverted white branding, and high-impact balance callout.',
    badge: 'Executive',
  },
  {
    id: 'editorial',
    name: 'Warm Editorial',
    category: 'premium',
    description: 'Warm sandstone tones, elegant serif headers, and polished card sections echoing luxury studio aesthetics.',
    badge: 'Staff Pick',
  },
  {
    id: 'tokyo',
    name: 'Tokyo Studio (Dark)',
    category: 'premium',
    description: 'High-contrast dark slate aesthetic with deep purple and emerald accents, designed for creative agencies & tech firms.',
    badge: 'Dark Mode',
  },
];

// Additional Document Types Catalog (Quotes, Credit Notes, Receipts, Statements)
export const OTHER_DOC_TEMPLATES: Record<string, TemplateDefinition[]> = {
  quotes: [
    {
      id: 'quote-standard',
      name: 'Standard Quotation',
      category: 'standard',
      description: 'Formal price estimate with validity dates, project milestones, and client signature approval section.',
      badge: 'Estimate',
    },
    {
      id: 'quote-proposal',
      name: 'Commercial Proposal',
      category: 'premium',
      description: 'Executive project pitch layout with scope of work description, terms of delivery, and acceptance terms.',
      badge: 'Proposal',
    },
    {
      id: 'quote-contractor',
      name: 'Contractor Estimate',
      category: 'spreadsheet',
      description: 'Itemized material and labor breakdown with hourly rates, contingency margins, and work schedule.',
    },
  ],
  'credit-notes': [
    {
      id: 'credit-standard',
      name: 'Standard Credit Note',
      category: 'standard',
      description: 'Formal credit note referencing original invoice number, return reason, and adjusted balance.',
      badge: 'Adjustment',
    },
    {
      id: 'credit-corporate',
      name: 'Corporate Credit Memo',
      category: 'premium',
      description: 'Structured refund memorandum with ledger tracking and authorized management sign-off.',
    },
  ],
  receipts: [
    {
      id: 'receipt-formal',
      name: 'Payment Acknowledgment',
      category: 'standard',
      description: 'Official payment receipt confirming settled invoice amounts, payment channel, and remaining balance zero.',
      badge: 'Settled',
    },
    {
      id: 'receipt-thermal',
      name: 'Counter Cash Slip',
      category: 'retail',
      description: 'Compact 80mm cash receipt format with change due calculation and thank you message.',
    },
  ],
  statements: [
    {
      id: 'statement-standard',
      name: 'Monthly Account Statement',
      category: 'standard',
      description: 'Comprehensive statement of accounts listing opening balance, billed invoices, paid receipts, and aging summary.',
      badge: 'Ledger',
    },
    {
      id: 'statement-compact',
      name: 'Customer Activity Summary',
      category: 'universal',
      description: 'Condensed transaction history showing chronological debits, credits, and current outstanding amount.',
    },
  ],
};

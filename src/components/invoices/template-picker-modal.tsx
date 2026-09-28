'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePOS } from '@/context/pos-context';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import ReceiptDetails from '@/components/receipts/receipt-details';
import {
  FileText,
  FileCheck,
  CreditCard,
  Receipt as ReceiptIcon,
  Users,
  Check,
  Eye,
  Sparkles,
  Download,
  Printer,
  X,
  Search,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Receipt } from '@/types';

export interface TemplateDefinition {
  id: string;
  name: string;
  category: 'standard' | 'spreadsheet' | 'premium' | 'universal' | 'retail';
  description: string;
  badge?: string;
  hasSealBoxes?: boolean;
}

export const INVOICE_TEMPLATES: TemplateDefinition[] = [
  {
    id: 'standard',
    name: 'Standard',
    category: 'standard',
    description: 'Clean, modern layout with logo top-left, invoice metadata on the right, and dark charcoal table header bar.',
    badge: 'Popular',
  },
  {
    id: 'standard-japanese',
    name: 'Standard - Japanese Style',
    category: 'standard',
    description: 'Traditional Japanese Qualified Invoice format with 3 Hanko approval seal boxes (Authorizer, Reviewer, Creator).',
    badge: 'Seal Boxes',
    hasSealBoxes: true,
  },
  {
    id: 'standard-japanese-no-seal',
    name: 'Standard - Japanese Style (Without Seal Boxes)',
    category: 'standard',
    description: 'Japanese invoice layout with clean typography, tax category breakdowns, without the seal boxes.',
  },
  {
    id: 'spreadsheet',
    name: 'Spreadsheet',
    category: 'spreadsheet',
    description: 'Structured accounting ledger with clear column and row gridlines and high numerical density.',
    badge: 'Ledger',
  },
  {
    id: 'continental',
    name: 'Premium Executive',
    category: 'premium',
    description: 'Executive corporate style featuring a bold colored header band, inverted branding, and high-impact totals.',
    badge: 'Executive',
  },
  {
    id: 'universal',
    name: 'Universal',
    category: 'universal',
    description: 'Minimalist whitespace, airy typography, and sleek modern borderless layout.',
    badge: 'Modern',
  },
  {
    id: 'retail',
    name: 'Retail',
    category: 'retail',
    description: 'Compact POS layout with dashed separators, barcode preview, and itemized customer receipt styling.',
    badge: 'POS Store',
  },
];

export interface TemplatePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate?: (templateId: string) => void;
  currentTemplateId?: string;
}

export function TemplatePickerModal({
  open,
  onOpenChange,
  onSelectTemplate,
  currentTemplateId,
}: TemplatePickerModalProps) {
  const { business, mutateBusiness, currencySymbol } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedDocType, setSelectedDocType] = React.useState<'invoices' | 'quotes' | 'credit-notes' | 'receipts' | 'statements'>('invoices');
  const [activeCategory, setActiveCategory] = React.useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const activeTemplate = currentTemplateId || (business?.settings as any)?.invoiceTemplate || 'standard';

  const filteredTemplates = React.useMemo(() => {
    if (activeCategory === 'all') return INVOICE_TEMPLATES;
    return INVOICE_TEMPLATES.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  const handleApply = async (templateId: string) => {
    if (onSelectTemplate) {
      onSelectTemplate(templateId);
    }

    if (!business?.id || !firestore) {
      toast({ title: 'Template chosen', description: `${templateId} template selected.` });
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, 'businessInstances', business.id), {
        'settings.invoiceTemplate': templateId,
        updatedAt: serverTimestamp(),
      });
      if (mutateBusiness) mutateBusiness();
      toast({
        variant: 'success',
        title: 'Template Activated',
        description: `Invoices will now format using the ${templateId} template.`,
      });
      onOpenChange(false);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to update template' });
    } finally {
      setIsSaving(false);
    }
  };

  const sampleReceipt: Receipt = React.useMemo(() => ({
    id: 'sample-001',
    receiptNumber: 'INV-000045',
    businessId: business?.id || 'sample-biz',
    createdAt: new Date() as any,
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString() as any,
    customer: {
      name: 'Acme Global Corporation',
      email: 'billing@acmeglobal.com',
    },
    items: [
      { productId: 'p1', name: 'Software Development & API Integration', price: 120000, quantity: 1, total: 120000 },
      { productId: 'p2', name: 'Cloud Infrastructure Setup & Security Audit', price: 65000, quantity: 1, total: 65000 },
      { productId: 'p3', name: 'Monthly Maintenance & Support SLA', price: 35000, quantity: 1, total: 35000 },
    ],
    subtotal: 220000,
    tax: 16500,
    discount: 0,
    total: 236500,
    status: 'unpaid',
    paymentMethod: 'Invoice',
  }), [business?.id]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden bg-white text-zinc-900 border border-zinc-200 shadow-2xl h-[88vh] max-h-[820px] flex flex-col rounded-xl">
          {/* Window Title Bar matching Zoho Screenshot */}
          <div className="bg-[#1e222d] text-white px-5 py-3 flex items-center justify-between border-b border-zinc-800 select-none">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-5 rounded bg-purple-600 flex items-center justify-center text-[11px] font-bold">
                Z
              </div>
              <span className="font-semibold text-sm tracking-wide">Zeneva Invoice - Templates</span>
            </div>
            <div className="text-xs text-zinc-400 font-mono">
              Active: <span className="text-white font-bold capitalize">{activeTemplate}</span>
            </div>
          </div>

          {/* Main Layout: Left Sidebar + Right Gallery */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar: Document Types */}
            <div className="w-56 bg-[#f8fafc] border-r border-zinc-200 p-3 flex flex-col justify-between select-none">
              <div className="space-y-1">
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Documents
                </div>
                {[
                  { id: 'quotes', label: 'Quotes', icon: FileCheck },
                  { id: 'invoices', label: 'Invoices', icon: FileText, count: '22' },
                  { id: 'credit-notes', label: 'Credit Notes', icon: CreditCard },
                  { id: 'receipts', label: 'Payment Receipts', icon: ReceiptIcon },
                  { id: 'statements', label: 'Customer Statement', icon: Users },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedDocType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedDocType(item.id as any)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left',
                        isSelected
                          ? 'bg-purple-100 text-purple-900 font-bold shadow-xs'
                          : 'text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn('h-4 w-4', isSelected ? 'text-purple-700' : 'text-zinc-400')} />
                        <span>{item.label}</span>
                      </div>
                      {item.count && (
                        <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full', isSelected ? 'bg-purple-200 text-purple-900' : 'text-zinc-400')}>
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl text-xs space-y-1 text-purple-950">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                  Custom Branding
                </p>
                <p className="text-[11px] text-purple-800 leading-snug">
                  Templates automatically format with your company logo, bank transfer info, and currency symbol.
                </p>
              </div>
            </div>

            {/* Right Area: Category Tabs + Templates Grid */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {/* Header: Title & Category Tabs */}
              <div className="px-6 pt-5 pb-3 border-b border-zinc-200">
                <h1 className="text-xl font-bold text-zinc-900">Choose a Template</h1>

                {/* Filter Tabs matching Zoho screenshot */}
                <div className="flex items-center gap-6 mt-4 border-b border-zinc-200 text-xs">
                  {[
                    { id: 'all', label: 'All (22)' },
                    { id: 'standard', label: 'Standard (7)' },
                    { id: 'spreadsheet', label: 'Spreadsheet (4)' },
                    { id: 'premium', label: 'Premium (3)' },
                    { id: 'universal', label: 'Universal (4)' },
                    { id: 'retail', label: 'Retail (4)' },
                  ].map((tab) => {
                    const isActive = activeCategory === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveCategory(tab.id)}
                        className={cn(
                          'pb-2.5 font-medium transition-colors relative',
                          isActive
                            ? 'text-purple-700 font-bold border-b-2 border-purple-700'
                            : 'text-zinc-500 hover:text-zinc-900'
                        )}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable Template Cards Grid */}
              <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/40">
                <div className="mb-4 text-xs font-black tracking-wider uppercase text-zinc-500">
                  {activeCategory === 'all' ? 'STANDARD & FEATURED TEMPLATES' : `${activeCategory.toUpperCase()} TEMPLATES`}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((tmpl) => {
                    const isActive = activeTemplate === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        className={cn(
                          'group bg-white rounded-xl border-2 transition-all duration-200 flex flex-col overflow-hidden shadow-xs hover:shadow-md',
                          isActive ? 'border-purple-600 ring-2 ring-purple-500/20' : 'border-zinc-200 hover:border-zinc-400'
                        )}
                      >
                        {/* Miniature Template Preview Canvas */}
                        <div className="relative bg-zinc-100 p-4 border-b border-zinc-200 aspect-[1/1.15] flex flex-col justify-between overflow-hidden cursor-pointer" onClick={() => setPreviewTemplate(tmpl.id)}>
                          {/* Standard Template Miniature */}
                          {tmpl.id === 'standard' && (
                            <div className="h-full w-full bg-white rounded shadow-xs border border-zinc-200 p-3 text-[7px] flex flex-col justify-between">
                              <div className="flex justify-between items-start border-b border-zinc-200 pb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-4 w-4 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[7px]">Z</div>
                                  <div>
                                    <div className="font-bold text-zinc-800">Your Business</div>
                                    <div className="text-[6px] text-zinc-400">123 Market St</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-black text-zinc-900 text-[8px]">INVOICE</div>
                                  <div className="text-zinc-500 text-[6px]">#INV-000045</div>
                                </div>
                              </div>
                              <div className="my-1.5 bg-zinc-50 p-1 rounded border border-zinc-100">
                                <div className="text-[6px] text-zinc-400 font-bold uppercase">Bill To</div>
                                <div className="font-semibold text-zinc-800">Acme Global Corp</div>
                              </div>
                              <div className="border border-zinc-200 my-1 overflow-hidden">
                                <div className="bg-[#1f2937] text-white flex justify-between px-1.5 py-0.5 font-bold text-[6px]">
                                  <span>Item & Description</span>
                                  <span>Amount</span>
                                </div>
                                <div className="divide-y divide-zinc-100 bg-white">
                                  <div className="flex justify-between px-1.5 py-0.5 text-zinc-700">
                                    <span>Web Platform Development</span>
                                    <span className="font-mono">$1,200.00</span>
                                  </div>
                                  <div className="flex justify-between px-1.5 py-0.5 text-zinc-700">
                                    <span>Cloud Setup & Audit</span>
                                    <span className="font-mono">$650.00</span>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-0.5 text-right font-mono text-[6px] pt-1">
                                <div className="text-zinc-500">Sub Total: $1,850.00</div>
                                <div className="bg-zinc-100 px-1 py-0.5 rounded font-black text-zinc-900 text-[7px] inline-block">
                                  Balance Due: $1,850.00
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Standard - Japanese Style Miniature (With Seal Boxes) */}
                          {tmpl.id === 'standard-japanese' && (
                            <div className="h-full w-full bg-white rounded shadow-xs border border-zinc-300 p-2.5 text-[6px] flex flex-col justify-between">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-black text-[8px] tracking-wider text-zinc-900">御 請 求 書</div>
                                  <div className="text-zinc-500">No. INV-000045</div>
                                  <div className="text-zinc-400 text-[5px]">登録番号: T1234567890123</div>
                                </div>
                                {/* 3 Hanko Boxes */}
                                <div className="border border-zinc-600 divide-x divide-zinc-600 flex text-center text-[5px] w-20 bg-white">
                                  <div className="flex-1"><div className="bg-zinc-100 font-bold border-b border-zinc-600">承認</div><div className="h-4 flex items-center justify-center text-zinc-300">印</div></div>
                                  <div className="flex-1"><div className="bg-zinc-100 font-bold border-b border-zinc-600">審査</div><div className="h-4 flex items-center justify-center text-zinc-300">印</div></div>
                                  <div className="flex-1"><div className="bg-zinc-100 font-bold border-b border-zinc-600">作成</div><div className="h-4 flex items-center justify-center text-zinc-300">印</div></div>
                                </div>
                              </div>
                              <div className="border-b border-zinc-800 pb-1 mt-1 flex justify-between">
                                <span className="font-bold text-zinc-900">得意先 御中</span>
                                <span className="text-zinc-500">Zeneva Business</span>
                              </div>
                              <div className="bg-zinc-100 p-1 border border-zinc-700 rounded flex justify-between font-bold my-1">
                                <span>ご請求金額</span>
                                <span>¥236,500</span>
                              </div>
                              <div className="border border-zinc-400 divide-y divide-zinc-300">
                                <div className="bg-zinc-800 text-white flex justify-between px-1 py-0.5 font-bold">
                                  <span>品名・項目</span>
                                  <span>金額</span>
                                </div>
                                <div className="flex justify-between px-1 py-0.5 text-zinc-700">
                                  <span>システム開発</span>
                                  <span>¥220,000</span>
                                </div>
                              </div>
                              <div className="text-right text-zinc-500 text-[5px] pt-1">
                                消費税 (10%): ¥16,500
                              </div>
                            </div>
                          )}

                          {/* Standard - Japanese Style (Without Seal Boxes) */}
                          {tmpl.id === 'standard-japanese-no-seal' && (
                            <div className="h-full w-full bg-white rounded shadow-xs border border-zinc-300 p-2.5 text-[6px] flex flex-col justify-between">
                              <div className="flex justify-between items-start border-b-2 border-zinc-800 pb-1">
                                <div>
                                  <div className="font-black text-[8px] tracking-wider text-zinc-900">御 請 求 書</div>
                                  <div className="text-zinc-500">INV-000045</div>
                                </div>
                                <div className="text-right text-[5px] text-zinc-500">
                                  <div className="font-bold text-zinc-800">Zeneva Business</div>
                                  <div>発行日: 2026/09/28</div>
                                </div>
                              </div>
                              <div className="my-1.5">
                                <span className="font-bold text-zinc-900 border-b border-zinc-400 pb-0.5">株式会社 テスト 御中</span>
                              </div>
                              <div className="bg-zinc-100 p-1 border border-zinc-700 rounded flex justify-between font-bold">
                                <span>ご請求金額 (税込)</span>
                                <span className="font-mono">¥236,500</span>
                              </div>
                              <div className="border border-zinc-400 divide-y divide-zinc-300 my-1">
                                <div className="bg-zinc-800 text-white flex justify-between px-1 py-0.5 font-bold">
                                  <span>品名</span>
                                  <span>金額</span>
                                </div>
                                <div className="flex justify-between px-1 py-0.5 text-zinc-700">
                                  <span>コンサルティング業務</span>
                                  <span>¥220,000</span>
                                </div>
                              </div>
                              <div className="text-[5px] text-zinc-400">振込先: ○○銀行 ○○支店</div>
                            </div>
                          )}

                          {/* Spreadsheet Miniature */}
                          {tmpl.id === 'spreadsheet' && (
                            <div className="h-full w-full bg-white rounded shadow-xs border-2 border-zinc-800 p-2 text-[6px] flex flex-col justify-between">
                              <div className="border border-zinc-800 grid grid-cols-2 divide-x divide-zinc-800 p-1">
                                <div className="font-bold">ZENEVA LEDGER</div>
                                <div className="text-right font-mono">#INV-000045</div>
                              </div>
                              <div className="border border-zinc-800 my-1">
                                <div className="grid grid-cols-3 divide-x divide-zinc-700 bg-zinc-800 text-white font-bold p-0.5">
                                  <div>ITEM</div>
                                  <div>QTY</div>
                                  <div className="text-right">AMT</div>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-zinc-300 p-0.5">
                                  <div>Consulting</div>
                                  <div>1</div>
                                  <div className="text-right">$1,200</div>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-zinc-300 p-0.5 bg-zinc-50">
                                  <div>Maintenance</div>
                                  <div>1</div>
                                  <div className="text-right">$650</div>
                                </div>
                              </div>
                              <div className="border border-zinc-800 bg-zinc-900 text-white flex justify-between p-1 font-bold">
                                <span>TOTAL BALANCE</span>
                                <span>$1,850.00</span>
                              </div>
                            </div>
                          )}

                          {/* Premium Miniature */}
                          {tmpl.id === 'continental' && (
                            <div className="h-full w-full bg-white rounded shadow-xs border border-zinc-200 overflow-hidden flex flex-col justify-between text-[6px]">
                              <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-2 flex justify-between items-start">
                                <div>
                                  <div className="font-black text-[7px]">ZENEVA CORP</div>
                                  <div className="text-purple-200 text-[5px]">Executive Edition</div>
                                </div>
                                <div className="text-right font-bold">INVOICE</div>
                              </div>
                              <div className="p-2 space-y-1">
                                <div className="bg-zinc-50 p-1 rounded border border-zinc-200 flex justify-between">
                                  <span>Client: Acme Corp</span>
                                  <span className="text-purple-700 font-bold">Net 15</span>
                                </div>
                                <div className="border-b border-zinc-200 pb-1 flex justify-between">
                                  <span>Software Engineering</span>
                                  <span className="font-bold">$1,850.00</span>
                                </div>
                              </div>
                              <div className="p-1.5 bg-purple-50 text-purple-900 flex justify-between font-bold border-t border-purple-200">
                                <span>TOTAL AMOUNT:</span>
                                <span>$1,850.00</span>
                              </div>
                            </div>
                          )}

                          {/* Universal Miniature */}
                          {tmpl.id === 'universal' && (
                            <div className="h-full w-full bg-white rounded shadow-xs border border-zinc-200 p-3 text-[6px] flex flex-col justify-between">
                              <div className="flex justify-between items-center border-b border-zinc-100 pb-1">
                                <span className="font-bold text-zinc-900 text-[7px]">Zeneva</span>
                                <span className="text-purple-600 font-mono">#000045</span>
                              </div>
                              <div className="my-1 text-zinc-600">
                                <div>Acme Global Corp</div>
                                <div className="text-zinc-400">Due in 15 days</div>
                              </div>
                              <div className="border-t border-b border-zinc-100 py-1 flex justify-between">
                                <span>Platform Architecture</span>
                                <span className="font-mono">$1,850.00</span>
                              </div>
                              <div className="flex justify-between font-bold text-zinc-900 pt-1">
                                <span>Total Due</span>
                                <span className="text-purple-600 font-mono">$1,850.00</span>
                              </div>
                            </div>
                          )}

                          {/* Retail Miniature */}
                          {tmpl.id === 'retail' && (
                            <div className="h-full w-full bg-white rounded shadow-xs border border-zinc-300 p-2 font-mono text-[5px] flex flex-col justify-between">
                              <div className="text-center border-b border-dashed border-zinc-300 pb-1">
                                <div className="font-bold text-[6px]">STORE RECEIPT</div>
                                <div className="text-zinc-400">#INV-000045</div>
                              </div>
                              <div className="my-1 space-y-0.5">
                                <div className="flex justify-between"><span>ITEM 1</span><span>$120.00</span></div>
                                <div className="flex justify-between"><span>ITEM 2</span><span>$65.00</span></div>
                              </div>
                              <div className="border-t border-dashed border-zinc-300 pt-1 text-right font-bold text-[6px]">
                                TOTAL: $185.00
                              </div>
                              <div className="text-center text-[4px] tracking-widest text-zinc-400 mt-1">
                                |||| |||| ||||
                              </div>
                            </div>
                          )}

                          {/* Hover Overlay with Preview Button */}
                          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 text-xs font-semibold bg-white text-zinc-900 hover:bg-zinc-100 shadow"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewTemplate(tmpl.id);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Preview
                            </Button>
                          </div>
                        </div>

                        {/* Card Footer Details */}
                        <div className="p-4 flex flex-col justify-between flex-1 bg-white">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-bold text-sm text-zinc-900 truncate" title={tmpl.name}>
                                {tmpl.name}
                              </h3>
                              {tmpl.badge && (
                                <Badge variant="outline" className="text-[10px] font-semibold bg-purple-50 text-purple-700 border-purple-200">
                                  {tmpl.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed line-clamp-2">
                              {tmpl.description}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-2">
                            <Button
                              onClick={() => handleApply(tmpl.id)}
                              disabled={isSaving}
                              variant={isActive ? 'default' : 'outline'}
                              className={cn(
                                'flex-1 text-xs font-bold h-8',
                                isActive
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                                  : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                              )}
                            >
                              {isActive ? (
                                <span className="flex items-center gap-1.5">
                                  <Check className="h-3.5 w-3.5 stroke-[3]" /> Active Template
                                </span>
                              ) : (
                                'Use This Template'
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900"
                              onClick={() => setPreviewTemplate(tmpl.id)}
                              title="Full Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Screen Live Invoice Preview Dialog */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 bg-zinc-100 border-zinc-300">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-3.5 flex items-center justify-between z-10 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-zinc-900">
                  Previewing: <span className="text-purple-600 capitalize">{previewTemplate}</span> Template
                </span>
                {previewTemplate === activeTemplate && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                    Currently Active
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    handleApply(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 px-4"
                >
                  <Check className="h-3.5 w-3.5 mr-1.5 stroke-[3]" />
                  Apply This Template
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewTemplate(null)}
                  className="h-8 text-xs border-zinc-300"
                >
                  Close
                </Button>
              </div>
            </div>

            <div className="p-6 sm:p-10 flex justify-center">
              <ReceiptDetails
                receipt={sampleReceipt}
                business={business}
                currencySymbol={currencySymbol || '₦'}
                isInvoice={true}
                overrideTemplate={previewTemplate}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

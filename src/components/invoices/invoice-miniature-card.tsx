'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { TemplateDefinition } from '@/lib/invoice-templates-catalog';

interface InvoiceMiniatureCardProps {
  template: TemplateDefinition;
  businessName?: string;
  currencySymbol?: string;
  className?: string;
}

export const InvoiceMiniatureCard: React.FC<InvoiceMiniatureCardProps> = ({
  template,
  businessName = 'Zylker Inc',
  currencySymbol = '$',
  className,
}) => {
  const id = template.id;

  // ----------------------------------------------------
  // 1. STANDARD
  // ----------------------------------------------------
  if (id === 'standard') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border border-zinc-200 p-2.5 sm:p-3 text-[7px] flex flex-col justify-between select-none overflow-hidden", className)}>
        {/* Header */}
        <div className="flex justify-between items-start border-b border-zinc-200 pb-2">
          <div className="flex items-start gap-1.5">
            <div className="h-5 w-5 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-[8px] shrink-0 shadow-xs">
              Z
            </div>
            <div>
              <div className="font-bold text-zinc-900 leading-tight">{businessName}</div>
              <div className="text-[6px] text-zinc-400">1234 Market St, Suite 400<br />San Francisco CA 94103</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-black text-zinc-900 text-[10px] tracking-tight">INVOICE</div>
            <div className="text-[6px] text-zinc-500 font-mono mt-0.5">#INV-000045</div>
            <div className="text-[6px] text-zinc-400">Date: 15 Sep 2026</div>
            <div className="mt-1 bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5 text-right font-black text-zinc-800 text-[7px] font-mono">
              Due: {currencySymbol}643.75
            </div>
          </div>
        </div>

        {/* Bill To & Ship To */}
        <div className="grid grid-cols-2 gap-2 my-1.5 py-1 px-1.5 bg-zinc-50 rounded border border-zinc-100 text-[6px]">
          <div>
            <div className="font-bold text-zinc-400 uppercase text-[5px]">Bill To</div>
            <div className="font-semibold text-zinc-800">Acme Global Ltd</div>
            <div className="text-zinc-400">456 Broadway Ave</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-zinc-400 uppercase text-[5px]">Invoice Details</div>
            <div className="text-zinc-600">Terms: Due on Receipt</div>
            <div className="text-zinc-600">Due: 15 Sep 2026</div>
          </div>
        </div>

        {/* Table */}
        <div className="border border-zinc-200 rounded overflow-hidden my-1">
          <div className="bg-[#1f2937] text-white flex justify-between px-1.5 py-1 font-bold text-[6px]">
            <span className="w-6">#</span>
            <span className="flex-1 text-left">Item & Description</span>
            <span className="w-8 text-center">Qty</span>
            <span className="w-12 text-right">Rate</span>
            <span className="w-14 text-right">Amount</span>
          </div>
          <div className="divide-y divide-zinc-100 bg-white text-[6px]">
            <div className="flex justify-between px-1.5 py-0.5 text-zinc-700">
              <span className="w-6 text-zinc-400">1</span>
              <span className="flex-1 text-left font-medium">Brochure Design</span>
              <span className="w-8 text-center font-mono">1.00</span>
              <span className="w-12 text-right font-mono">300.00</span>
              <span className="w-14 text-right font-mono font-bold">300.00</span>
            </div>
            <div className="flex justify-between px-1.5 py-0.5 text-zinc-700 bg-zinc-50/50">
              <span className="w-6 text-zinc-400">2</span>
              <span className="flex-1 text-left font-medium">Web Development</span>
              <span className="w-8 text-center font-mono">1.00</span>
              <span className="w-12 text-right font-mono">250.00</span>
              <span className="w-14 text-right font-mono font-bold">250.00</span>
            </div>
            <div className="flex justify-between px-1.5 py-0.5 text-zinc-700">
              <span className="w-6 text-zinc-400">3</span>
              <span className="flex-1 text-left font-medium">Print Advertising</span>
              <span className="w-8 text-center font-mono">1.00</span>
              <span className="w-12 text-right font-mono">80.00</span>
              <span className="w-14 text-right font-mono font-bold">80.00</span>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-between items-end pt-1">
          <div className="text-[5px] text-zinc-400 max-w-[120px]">
            <div className="font-semibold text-zinc-600">Thanks for your business.</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="bg-blue-100 text-blue-800 px-1 rounded font-bold">PayPal</span>
              <span>Bank Transfer</span>
            </div>
          </div>
          <div className="space-y-0.5 text-right font-mono text-[6px] w-36">
            <div className="flex justify-between text-zinc-500">
              <span>Sub Total:</span>
              <span>{currencySymbol}630.00</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Tax (4.75%):</span>
              <span>{currencySymbol}13.75</span>
            </div>
            <div className="flex justify-between bg-zinc-100 border border-zinc-200 px-1 py-0.5 rounded font-black text-zinc-900 text-[7px]">
              <span>Balance Due:</span>
              <span>{currencySymbol}643.75</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. STANDARD - JAPANESE STYLE (WITH SEAL BOXES)
  // ----------------------------------------------------
  if (id === 'standard-japanese') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border border-zinc-300 p-2.5 text-[6px] flex flex-col justify-between select-none overflow-hidden", className)}>
        {/* Top Header with 3 Hanko Approval Stamp Boxes */}
        <div className="flex justify-between items-start">
          <div>
            <div className="font-black text-[9px] tracking-widest text-zinc-900">御 請 求 書</div>
            <div className="text-zinc-500 text-[6px] font-mono mt-0.5">INV-000045</div>
            <div className="text-zinc-400 text-[5px]">登録番号: T1234567890123</div>
          </div>

          {/* 3 Hanko Approval Boxes */}
          <div className="border border-zinc-700 divide-x divide-zinc-700 flex text-center text-[5px] w-24 bg-white shadow-xs">
            <div className="flex-1">
              <div className="bg-zinc-100 font-bold border-b border-zinc-700 py-0.5 text-zinc-700">承認</div>
              <div className="h-5 flex items-center justify-center text-zinc-300 font-serif">印</div>
            </div>
            <div className="flex-1">
              <div className="bg-zinc-100 font-bold border-b border-zinc-700 py-0.5 text-zinc-700">審査</div>
              <div className="h-5 flex items-center justify-center text-zinc-300 font-serif">印</div>
            </div>
            <div className="flex-1">
              <div className="bg-zinc-100 font-bold border-b border-zinc-700 py-0.5 text-zinc-700">作成</div>
              <div className="h-5 flex items-center justify-center text-zinc-300 font-serif">印</div>
            </div>
          </div>
        </div>

        {/* Client & Issuer */}
        <div className="border-b border-zinc-800 pb-1 mt-1 flex justify-between items-baseline">
          <div>
            <span className="font-bold text-zinc-900 text-[7px]">山田商事 株式会社 御中</span>
          </div>
          <div className="text-right text-[5px] text-zinc-500">
            <span className="font-bold text-zinc-800">{businessName}</span>
            <div>発行日: 2026年9月15日</div>
          </div>
        </div>

        {/* Claim Amount Banner */}
        <div className="bg-zinc-100 p-1 border border-zinc-700 rounded flex justify-between items-center font-bold my-1">
          <span className="text-[6px]">ご請求金額 (税込)</span>
          <span className="font-mono text-[8px] text-zinc-900">¥279,500</span>
        </div>

        {/* Items Table */}
        <div className="border border-zinc-400 rounded overflow-hidden">
          <div className="bg-zinc-800 text-white flex justify-between px-1.5 py-0.5 font-bold text-[6px]">
            <span className="flex-1 text-left">品名・項目</span>
            <span className="w-8 text-center">数量</span>
            <span className="w-12 text-right">単価</span>
            <span className="w-14 text-right">金額</span>
          </div>
          <div className="divide-y divide-zinc-200 bg-white text-[6px]">
            <div className="flex justify-between px-1.5 py-0.5 text-zinc-700">
              <span className="flex-1 text-left">システム設計・開発業務</span>
              <span className="w-8 text-center font-mono">1</span>
              <span className="w-12 text-right font-mono">200,000</span>
              <span className="w-14 text-right font-mono font-bold">200,000</span>
            </div>
            <div className="flex justify-between px-1.5 py-0.5 text-zinc-700 bg-zinc-50/50">
              <span className="flex-1 text-left">保守運用サポート (月額)</span>
              <span className="w-8 text-center font-mono">1</span>
              <span className="w-12 text-right font-mono">60,000</span>
              <span className="w-14 text-right font-mono font-bold">60,000</span>
            </div>
          </div>
        </div>

        {/* Totals & Tax Detail */}
        <div className="flex justify-between items-end pt-1 text-[5px]">
          <div className="text-zinc-400">振込先: 三井住友銀行 渋谷支店 普通 1234567</div>
          <div className="text-right font-mono text-[6px]">
            <div>小計: ¥260,000</div>
            <div>消費税 (10%): ¥19,500</div>
            <div className="font-bold text-zinc-900 text-[7px]">合計: ¥279,500</div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 3. STANDARD - JAPANESE STYLE (WITHOUT SEAL BOXES)
  // ----------------------------------------------------
  if (id === 'standard-japanese-no-seal') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border border-zinc-300 p-2.5 text-[6px] flex flex-col justify-between select-none overflow-hidden", className)}>
        <div className="flex justify-between items-start border-b-2 border-zinc-800 pb-1.5">
          <div>
            <div className="font-black text-[9px] tracking-wider text-zinc-900">御 請 求 書</div>
            <div className="text-zinc-500 font-mono text-[6px]">No. INV-000045</div>
            <div className="text-zinc-400 text-[5px]">登録番号: T1234567890123</div>
          </div>
          <div className="text-right text-[6px] text-zinc-600">
            <div className="font-bold text-zinc-900 text-[7px]">{businessName}</div>
            <div>東京都渋谷区道玄坂1-2-3</div>
            <div className="text-zinc-400 text-[5px]">発行日: 2026/09/15</div>
          </div>
        </div>

        <div className="my-1 border-b border-zinc-300 pb-0.5">
          <span className="font-bold text-zinc-900 text-[7px]">株式会社 テストクライアント 御中</span>
        </div>

        <div className="bg-zinc-100 p-1 border border-zinc-700 rounded flex justify-between items-center font-bold">
          <span className="text-[6px]">ご請求金額 (税込)</span>
          <span className="font-mono text-[8px] text-zinc-900">¥279,500</span>
        </div>

        <div className="border border-zinc-400 rounded overflow-hidden my-1">
          <div className="bg-zinc-800 text-white flex justify-between px-1.5 py-0.5 font-bold text-[6px]">
            <span className="flex-1 text-left">品名</span>
            <span className="w-8 text-center">数量</span>
            <span className="w-14 text-right">金額</span>
          </div>
          <div className="divide-y divide-zinc-200 bg-white text-[6px]">
            <div className="flex justify-between px-1.5 py-0.5 text-zinc-700">
              <span className="flex-1 text-left">クラウドインフラ構築支援</span>
              <span className="w-8 text-center font-mono">1</span>
              <span className="w-14 text-right font-mono font-bold">¥180,000</span>
            </div>
            <div className="flex justify-between px-1.5 py-0.5 text-zinc-700 bg-zinc-50/50">
              <span className="flex-1 text-left">セキュリティ診断・監査</span>
              <span className="w-8 text-center font-mono">1</span>
              <span className="w-14 text-right font-mono font-bold">¥80,000</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end text-[5px] text-zinc-500 pt-1">
          <div>お支払期日: 2026年10月15日</div>
          <div className="text-right font-mono text-[6px]">
            <div>消費税 (10%対象): ¥19,500</div>
            <div className="font-bold text-zinc-900 text-[7px]">請求総額: ¥279,500</div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 4. STANDARD - EUROPEAN STYLE
  // ----------------------------------------------------
  if (id === 'standard-european') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border border-zinc-200 p-2.5 text-[6px] flex flex-col justify-between select-none overflow-hidden", className)}>
        <div className="flex justify-between items-start border-b border-zinc-200 pb-2">
          <div>
            <div className="font-black text-zinc-900 text-[10px] tracking-tight">INVOICE</div>
            <div className="text-zinc-500 font-mono text-[6px]">INV-2026-0891</div>
            <div className="text-zinc-400 text-[5px]">VAT ID: EU372009842</div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="text-right">
              <div className="font-bold text-zinc-900 text-[7px]">{businessName} B.V.</div>
              <div className="text-[5px] text-zinc-400">Amsterdam, Netherlands</div>
            </div>
            <div className="h-5 w-5 rounded bg-emerald-600 text-white font-black flex items-center justify-center text-[8px]">
              Z
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 my-1 text-[6px] bg-zinc-50 p-1.5 rounded border border-zinc-100">
          <div>
            <div className="font-bold text-zinc-400 uppercase text-[5px]">Customer Details</div>
            <div className="font-semibold text-zinc-800">Berlin Tech GmbH</div>
            <div className="text-zinc-400">VAT: DE987654321</div>
          </div>
          <div className="text-right font-mono text-zinc-500">
            <div>Date: 15.09.2026</div>
            <div>Due: 15.10.2026 (Net 30)</div>
          </div>
        </div>

        <div className="border border-zinc-200 rounded overflow-hidden my-1">
          <div className="bg-zinc-800 text-white flex justify-between px-1.5 py-1 font-bold text-[6px]">
            <span className="flex-1 text-left">Description</span>
            <span className="w-8 text-center">Qty</span>
            <span className="w-12 text-right">Price</span>
            <span className="w-14 text-right">Total</span>
          </div>
          <div className="divide-y divide-zinc-100 bg-white text-[6px]">
            <div className="flex justify-between px-1.5 py-0.5 text-zinc-700">
              <span className="flex-1 text-left font-medium">Enterprise Cloud License</span>
              <span className="w-8 text-center font-mono">1</span>
              <span className="w-12 text-right font-mono">€1,200.00</span>
              <span className="w-14 text-right font-mono font-bold">€1,200.00</span>
            </div>
            <div className="flex justify-between px-1.5 py-0.5 text-zinc-700 bg-zinc-50/50">
              <span className="flex-1 text-left font-medium">DevOps Architecture</span>
              <span className="w-8 text-center font-mono">1</span>
              <span className="w-12 text-right font-mono">€650.00</span>
              <span className="w-14 text-right font-mono font-bold">€650.00</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end pt-1">
          <div className="text-[5px] text-zinc-500 space-y-0.5">
            <div>IBAN: NL91 ABNA 0417 1643 00</div>
            <div>BIC / SWIFT: ABNANL2A</div>
            <div className="text-zinc-400 italic">Intra-community supply — reverse charge applies.</div>
          </div>
          <div className="text-right font-mono text-[6px] w-28">
            <div className="text-zinc-500">Net Amount: €1,850.00</div>
            <div className="text-zinc-500">VAT (0%): €0.00</div>
            <div className="font-black text-zinc-900 text-[8px] bg-zinc-100 p-0.5 rounded border border-zinc-200 mt-0.5">
              Total: €1,850.00
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 5. STANDARD - INDIA GST STYLE
  // ----------------------------------------------------
  if (id === 'standard-india-gst') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border border-zinc-300 p-2.5 text-[6px] flex flex-col justify-between select-none overflow-hidden", className)}>
        <div className="flex justify-between items-start border-b border-zinc-300 pb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-[8px]">
              Z
            </div>
            <div>
              <div className="font-bold text-zinc-900 text-[7px]">{businessName} Pvt Ltd</div>
              <div className="text-[5px] text-zinc-500">GSTIN: 27AABCS1429B1ZB | State: Maharashtra (27)</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-black text-zinc-900 text-[9px]">TAX INVOICE</div>
            <div className="text-[5px] text-zinc-500 font-mono">INV/26-27/0145</div>
            <div className="text-[5px] text-zinc-400">Place of Supply: 27-Maharashtra</div>
          </div>
        </div>

        <div className="border border-zinc-200 rounded p-1 bg-zinc-50 my-1 grid grid-cols-2 text-[5px]">
          <div>
            <span className="font-bold uppercase text-zinc-500">Billed To:</span>
            <div className="font-bold text-zinc-800">Reliance Digital Services</div>
            <div className="text-zinc-500">GSTIN: 27AAACR1234A1Z5</div>
          </div>
          <div className="text-right">
            <div>Invoice Date: 15-Sep-2026</div>
            <div>Due Date: 30-Sep-2026</div>
            <div className="font-semibold text-emerald-700">Reverse Charge: No</div>
          </div>
        </div>

        <div className="border border-zinc-300 rounded overflow-hidden">
          <div className="bg-[#1f2937] text-white flex justify-between px-1 py-0.5 font-bold text-[5px]">
            <span className="w-4">#</span>
            <span className="flex-1 text-left">Description</span>
            <span className="w-8 text-center">HSN/SAC</span>
            <span className="w-8 text-right">Taxable</span>
            <span className="w-8 text-right">CGST</span>
            <span className="w-8 text-right">SGST</span>
            <span className="w-10 text-right">Total</span>
          </div>
          <div className="divide-y divide-zinc-200 bg-white text-[5px]">
            <div className="flex justify-between px-1 py-0.5 text-zinc-700">
              <span className="w-4 text-zinc-400">1</span>
              <span className="flex-1 text-left font-medium">Software Consulting</span>
              <span className="w-8 text-center font-mono">998314</span>
              <span className="w-8 text-right font-mono">₹50,000</span>
              <span className="w-8 text-right font-mono">₹4,500</span>
              <span className="w-8 text-right font-mono">₹4,500</span>
              <span className="w-10 text-right font-mono font-bold">₹59,000</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end pt-1 text-[5px]">
          <div className="text-zinc-400">Amount in Words: INR Fifty-Nine Thousand Only</div>
          <div className="text-right font-mono">
            <div className="text-zinc-500">Total Tax: ₹9,000.00</div>
            <div className="font-black text-zinc-900 text-[7px] bg-zinc-100 p-0.5 rounded border border-zinc-300">
              Grand Total: ₹59,000.00
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 6. STANDARD - SRI LANKA TAX INVOICE
  // ----------------------------------------------------
  if (id === 'standard-srilanka') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border border-zinc-300 p-2.5 text-[6px] flex flex-col justify-between select-none overflow-hidden", className)}>
        <div className="text-center border-b border-zinc-300 pb-1.5">
          <div className="h-5 w-5 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-[8px] mx-auto mb-0.5">
            Z
          </div>
          <div className="font-black text-[9px] tracking-wide text-zinc-900">SRI LANKA TAX INVOICE</div>
          <div className="font-bold text-zinc-700 text-[6px]">{businessName} (Pvt) Ltd</div>
          <div className="text-[5px] text-zinc-500">TIN: 102938475 | VAT Reg No: 102938475-7000</div>
        </div>

        <div className="grid grid-cols-2 gap-2 my-1 text-[5px]">
          <div>
            <span className="font-bold text-zinc-500 block">Recipient:</span>
            <div className="font-bold text-zinc-800">Colombo Trading Corp</div>
            <div className="text-zinc-400">TIN: 998877665</div>
          </div>
          <div className="text-right font-mono">
            <div>Invoice No: SL-INV-0045</div>
            <div>Date of Supply: 15-09-2026</div>
          </div>
        </div>

        <div className="border border-zinc-300 rounded overflow-hidden">
          <div className="bg-zinc-800 text-white flex justify-between px-1.5 py-0.5 font-bold text-[5px]">
            <span className="flex-1 text-left">Description of Goods / Services</span>
            <span className="w-8 text-center">Qty</span>
            <span className="w-12 text-right">Unit Price</span>
            <span className="w-14 text-right">Value (LKR)</span>
          </div>
          <div className="divide-y divide-zinc-200 text-[5px] bg-white">
            <div className="flex justify-between px-1.5 py-0.5 text-zinc-700">
              <span className="flex-1 text-left">IT Infrastructure Services</span>
              <span className="w-8 text-center font-mono">1</span>
              <span className="w-12 text-right font-mono">120,000</span>
              <span className="w-14 text-right font-mono font-bold">120,000</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end pt-1 text-[5px]">
          <div className="text-zinc-400">VAT Charged at standard 18% rate</div>
          <div className="text-right font-mono text-[6px]">
            <div>Sub Total: LKR 120,000</div>
            <div>VAT (18%): LKR 21,600</div>
            <div className="font-black text-zinc-900 text-[7px] bg-zinc-100 p-0.5 rounded border border-zinc-300">
              Total: LKR 141,600.00
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 7. STANDARD - CLASSICAL ELEGANT
  // ----------------------------------------------------
  if (id === 'standard-classical') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border-2 border-double border-zinc-800 p-2.5 text-[6px] flex flex-col justify-between select-none overflow-hidden font-serif", className)}>
        <div className="text-center border-b border-zinc-800 pb-1.5">
          <div className="font-black text-[9px] uppercase tracking-widest text-zinc-900">{businessName}</div>
          <div className="text-[5px] text-zinc-500 font-sans mt-0.5">ESTABLISHED 2020 • COMMERCIAL INVOICE</div>
        </div>

        <div className="flex justify-between items-center my-1 text-[5px] font-sans border-b border-zinc-200 pb-1">
          <div>
            <span className="text-zinc-400 uppercase">INVOICE TO:</span>
            <div className="font-bold text-zinc-900 font-serif text-[7px]">Sir Arthur Pendelton</div>
          </div>
          <div className="text-right font-mono">
            <div>INVOICE #{template.id.slice(0, 4).toUpperCase()}-045</div>
            <div>DATE: 15 SEP 2026</div>
          </div>
        </div>

        <div className="border-t border-b border-zinc-800 py-1 font-sans">
          <div className="flex justify-between font-bold text-[5px] uppercase border-b border-zinc-300 pb-0.5 text-zinc-600">
            <span>Particulars</span>
            <span>Rate</span>
            <span>Total</span>
          </div>
          <div className="flex justify-between py-1 text-[6px]">
            <span className="font-serif">Architectural Advisory</span>
            <span className="font-mono">{currencySymbol}1,250.00</span>
            <span className="font-mono font-bold">{currencySymbol}1,250.00</span>
          </div>
        </div>

        <div className="flex justify-between items-end pt-1 font-sans text-[6px]">
          <div className="text-[5px] text-zinc-400 italic font-serif">Respectfully submitted.</div>
          <div className="text-right font-mono">
            <div className="font-black text-zinc-900 text-[8px] border-t-2 border-b-2 border-zinc-900 py-0.5">
              AMOUNT DUE: {currencySymbol}1,250.00
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 8. UNIVERSAL - LITE
  // ----------------------------------------------------
  if (id === 'universal-lite') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-800 rounded-sm shadow-xs border border-zinc-150 p-3 text-[6px] flex flex-col justify-between select-none overflow-hidden", className)}>
        <div className="flex justify-between items-start border-b border-zinc-100 pb-2">
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[7px]">
              Z
            </div>
            <span className="font-bold text-zinc-900 text-[7px]">{businessName}</span>
          </div>
          <div className="text-right">
            <span className="text-zinc-400 font-mono text-[5px]">#000045</span>
            <div className="font-black text-zinc-900 text-[8px]">INVOICE</div>
          </div>
        </div>

        <div className="my-1.5 text-[5px] text-zinc-500">
          <div className="text-zinc-400 uppercase">BILLED TO</div>
          <div className="font-semibold text-zinc-800 text-[6px]">Studio Minimal Inc</div>
        </div>

        <div className="border-t border-b border-zinc-100 py-1 space-y-1 text-[6px]">
          <div className="flex justify-between text-zinc-600">
            <span>Creative Consultation</span>
            <span className="font-mono font-medium">{currencySymbol}450.00</span>
          </div>
          <div className="flex justify-between text-zinc-600">
            <span>Visual System Design</span>
            <span className="font-mono font-medium">{currencySymbol}350.00</span>
          </div>
        </div>

        <div className="flex justify-between items-end pt-1">
          <span className="text-[5px] text-zinc-400">Due upon receipt</span>
          <div className="text-right font-mono font-bold text-zinc-900 text-[7px]">
            Total: {currencySymbol}800.00
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 9. UNIVERSAL - SIMPLE
  // ----------------------------------------------------
  if (id === 'universal-simple') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border border-zinc-200 p-2.5 text-[6px] flex flex-col justify-between select-none overflow-hidden", className)}>
        <div className="flex justify-between items-start border-b border-zinc-200 pb-1.5">
          <div>
            <div className="font-bold text-zinc-900 text-[7px]">{businessName}</div>
            <div className="text-[5px] text-zinc-400">Simple Layout</div>
          </div>
          <div className="text-right font-mono text-[6px]">
            <div className="font-black text-zinc-800">INVOICE</div>
            <div className="text-zinc-500">#INV-045</div>
          </div>
        </div>

        <div className="bg-zinc-50 p-1.5 rounded border border-zinc-200 my-1 grid grid-cols-2 text-[5px]">
          <div>
            <span className="text-zinc-400 block">Customer</span>
            <span className="font-bold text-zinc-800">Client Partner</span>
          </div>
          <div className="text-right">
            <span className="text-zinc-400 block">Terms</span>
            <span className="font-mono">Net 15</span>
          </div>
        </div>

        <div className="border border-zinc-200 rounded overflow-hidden">
          <div className="bg-zinc-100 flex justify-between px-1.5 py-0.5 font-bold text-[5px] border-b border-zinc-200">
            <span>Item</span>
            <span>Amount</span>
          </div>
          <div className="p-1 space-y-0.5 text-[6px]">
            <div className="flex justify-between text-zinc-700">
              <span>Standard Service Fee</span>
              <span className="font-mono">{currencySymbol}500.00</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-zinc-200 font-bold text-[7px]">
          <span>Balance Due:</span>
          <span className="font-mono text-zinc-900">{currencySymbol}500.00</span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 10. UNIVERSAL - COMPACT
  // ----------------------------------------------------
  if (id === 'universal-compact') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border border-zinc-200 p-2 text-[5px] flex flex-col justify-between select-none overflow-hidden leading-tight", className)}>
        <div className="flex justify-between items-center border-b border-zinc-200 pb-1">
          <div className="font-bold text-zinc-900 text-[6px]">{businessName}</div>
          <div className="font-mono font-bold text-zinc-800">#INV-045 | 15/09/2026</div>
        </div>

        <div className="my-0.5 text-zinc-600">
          Client: <span className="font-semibold text-zinc-900">Direct Delivery Co</span>
        </div>

        <div className="border-t border-b border-zinc-200 py-0.5 space-y-0.5 font-mono">
          <div className="flex justify-between"><span>1x Item Alpha</span><span>{currencySymbol}150.00</span></div>
          <div className="flex justify-between"><span>2x Item Beta</span><span>{currencySymbol}200.00</span></div>
          <div className="flex justify-between"><span>1x Service Fee</span><span>{currencySymbol}75.00</span></div>
        </div>

        <div className="flex justify-between items-center pt-0.5 font-bold text-[6px]">
          <span>TOTAL DUE</span>
          <span className="font-mono">{currencySymbol}425.00</span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 11. UNIVERSAL - BASIC (ACCENT CORAL/RED HEADER BANNER)
  // ----------------------------------------------------
  if (id === 'universal-basic') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border border-rose-200 flex flex-col justify-between select-none overflow-hidden text-[6px]", className)}>
        {/* Accent Red/Coral Top Banner matching Screenshot */}
        <div className="bg-rose-500 text-white p-2 flex justify-between items-center">
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded-full bg-white text-rose-600 font-black flex items-center justify-center text-[7px]">
              Z
            </div>
            <span className="font-bold text-[7px]">{businessName}</span>
          </div>
          <div className="font-black text-[9px] tracking-wider">INVOICE</div>
        </div>

        <div className="p-2 space-y-1.5 flex-1 flex flex-col justify-between">
          <div className="flex justify-between text-[5px] text-zinc-600">
            <div>
              <span className="text-rose-600 font-bold uppercase block">Bill To</span>
              <span className="font-semibold text-zinc-800">Apex Retailers</span>
            </div>
            <div className="text-right font-mono">
              <div>Invoice: #INV-0045</div>
              <div>Date: 15 Sep 2026</div>
            </div>
          </div>

          <div className="border border-rose-200 rounded overflow-hidden">
            <div className="bg-rose-50 text-rose-900 flex justify-between px-1.5 py-0.5 font-bold text-[5px]">
              <span>Description</span>
              <span>Amount</span>
            </div>
            <div className="divide-y divide-rose-100 bg-white text-[6px] p-1">
              <div className="flex justify-between">
                <span>Product Supply Line</span>
                <span className="font-mono">{currencySymbol}640.00</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-rose-100 font-bold text-[7px]">
            <span className="text-rose-700">Total:</span>
            <span className="font-mono text-rose-800">{currencySymbol}640.00</span>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 12. RETAIL - STORE RECEIPT (80mm Thermal Style)
  // ----------------------------------------------------
  if (id === 'retail-pos') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border-2 border-dashed border-zinc-300 p-2 font-mono text-[5px] flex flex-col justify-between select-none overflow-hidden", className)}>
        <div className="text-center border-b border-dashed border-zinc-300 pb-1">
          <div className="font-black text-[7px] uppercase tracking-wider">{businessName}</div>
          <div className="text-[4px] text-zinc-500">123 RETAIL WAY • TEL: 555-0199</div>
          <div className="mt-0.5 inline-block bg-zinc-100 px-1.5 py-0.2 rounded font-bold text-[5px]">
            RECEIPT #INV-0045
          </div>
        </div>

        <div className="my-1 space-y-0.5 text-[5px]">
          <div className="flex justify-between"><span>1x Milk 1L</span><span>{currencySymbol}3.50</span></div>
          <div className="flex justify-between"><span>2x Whole Bread</span><span>{currencySymbol}5.00</span></div>
          <div className="flex justify-between"><span>1x Coffee Beans</span><span>{currencySymbol}14.50</span></div>
        </div>

        <div className="border-t border-dashed border-zinc-300 pt-1 space-y-0.5 text-right font-bold text-[6px]">
          <div>TOTAL: {currencySymbol}23.00</div>
          <div className="text-[4px] text-zinc-500 font-normal">CASH TENDERED: {currencySymbol}25.00 | CHANGE: {currencySymbol}2.00</div>
        </div>

        <div className="text-center pt-1 border-t border-dashed border-zinc-200 text-[4px] text-zinc-400">
          <div>*** THANK YOU FOR SHOPPING ***</div>
          <div className="tracking-widest font-mono text-[6px] text-zinc-700 mt-0.5">||||| | |||| || |||</div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 13. RETAIL - SUPPLY INVOICE (Matching Screenshot 2)
  // ----------------------------------------------------
  if (id === 'retail-supply') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border border-zinc-300 p-2 text-[5px] flex flex-col justify-between select-none overflow-hidden font-sans", className)}>
        <div className="text-center border-b border-zinc-200 pb-1">
          <div className="h-4 w-4 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[6px] mx-auto mb-0.5">
            Z
          </div>
          <div className="font-bold text-[6px] uppercase">{businessName}</div>
          <div className="font-black text-[7px] tracking-wide text-zinc-900 mt-0.5">SUPPLY INVOICE</div>
          <div className="text-[4px] text-zinc-500 font-mono">Invoice#: INV-000001 • Date: 08 Jul 2026</div>
        </div>

        <div className="border-b border-zinc-200 py-1 text-[5px]">
          <span className="font-bold text-zinc-500">Bill To:</span>
          <div className="font-semibold text-zinc-800">Rob & Sons Traders</div>
        </div>

        <div className="space-y-0.5 font-mono text-[5px] my-1">
          <div className="flex justify-between border-b border-zinc-200 pb-0.5 font-bold font-sans">
            <span>Item</span><span>Qty</span><span>Amount</span>
          </div>
          <div className="flex justify-between"><span>Brochure Design</span><span>1.00</span><span>300.00</span></div>
          <div className="flex justify-between"><span>Web Design</span><span>1.00</span><span>250.00</span></div>
          <div className="flex justify-between"><span>Print Ad</span><span>1.00</span><span>80.00</span></div>
        </div>

        <div className="border-t border-zinc-300 pt-1 text-right font-mono text-[6px] font-bold">
          <div>Sub Total: 630.00</div>
          <div className="text-[7px] text-zinc-900">TOTAL: {currencySymbol}662.75</div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 14. RETAIL - SUPERMARKET & GROCERY
  // ----------------------------------------------------
  if (id === 'retail-supermarket') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border border-zinc-300 p-2 font-mono text-[5px] flex flex-col justify-between select-none overflow-hidden", className)}>
        <div className="text-center border-b border-zinc-300 pb-1">
          <div className="font-black text-[7px]">{businessName} SUPERMARKET</div>
          <div className="text-[4px] text-zinc-500">REG: 04 • CLERK: JANE D.</div>
        </div>

        <div className="my-1 space-y-0.5">
          <div className="flex justify-between"><span>ORGANIC APPLES</span><span>{currencySymbol}4.99</span></div>
          <div className="flex justify-between"><span>ALMOND MILK</span><span>{currencySymbol}3.49</span></div>
          <div className="flex justify-between text-emerald-700 font-bold"><span>STORE DISCOUNT</span><span>-{currencySymbol}1.50</span></div>
        </div>

        <div className="border-t border-zinc-300 pt-1 space-y-0.5">
          <div className="flex justify-between font-bold text-[6px]">
            <span>TOTAL</span>
            <span>{currencySymbol}6.98</span>
          </div>
          <div className="text-emerald-700 font-bold text-[4px] text-center">
            *** YOU SAVED {currencySymbol}1.50 TODAY! ***
          </div>
        </div>

        <div className="text-center text-[4px] text-zinc-400 border-t border-dashed border-zinc-200 pt-1">
          POINTS EARNED: +14 • ZENEVA RETAIL
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 15. RETAIL - BOUTIQUE SLIP
  // ----------------------------------------------------
  if (id === 'retail-boutique') {
    return (
      <div className={cn("w-full h-full bg-[#fdfcfb] text-zinc-900 rounded-sm shadow-xs border border-zinc-200 p-2.5 text-[5px] flex flex-col justify-between select-none overflow-hidden", className)}>
        <div className="text-center border-b border-zinc-200 pb-1">
          <div className="font-serif italic text-[8px] font-bold">{businessName} Boutique</div>
          <div className="text-[4px] text-zinc-400 tracking-widest uppercase mt-0.5">Apparel & Atelier</div>
        </div>

        <div className="my-1 space-y-1 font-serif text-[6px]">
          <div className="flex justify-between border-b border-zinc-100 pb-0.5">
            <span>Silk Scarf (Blush)</span>
            <span className="font-mono">{currencySymbol}85.00</span>
          </div>
          <div className="flex justify-between border-b border-zinc-100 pb-0.5">
            <span>Linen Blazer</span>
            <span className="font-mono">{currencySymbol}210.00</span>
          </div>
        </div>

        <div className="flex justify-between items-center font-bold text-[6px] border-t border-zinc-200 pt-1 font-mono">
          <span>AMOUNT DUE</span>
          <span>{currencySymbol}295.00</span>
        </div>

        <div className="text-center text-[4px] text-zinc-400 italic pt-1 border-t border-zinc-100">
          Follow us @zeneva.atelier • Returns within 14 days
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 16. SPREADSHEET - ACCOUNTING LEDGER
  // ----------------------------------------------------
  if (id === 'spreadsheet') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border-2 border-zinc-800 p-2 text-[5px] flex flex-col justify-between select-none overflow-hidden font-mono", className)}>
        <div className="border border-zinc-800 grid grid-cols-2 divide-x divide-zinc-800 p-1 bg-zinc-100">
          <div className="font-black text-[6px] uppercase">{businessName} LEDGER</div>
          <div className="text-right font-bold">#INV-000045</div>
        </div>

        <div className="border border-zinc-800 my-1 overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-zinc-700 bg-zinc-800 text-white font-bold p-0.5 text-[5px]">
            <div>ITEM</div>
            <div className="text-center">QTY</div>
            <div className="text-right">AMT</div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-zinc-300 p-0.5 text-[5px]">
            <div>Architecture</div>
            <div className="text-center">1</div>
            <div className="text-right">$1,500</div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-zinc-300 p-0.5 bg-zinc-50 text-[5px]">
            <div>DevOps SLA</div>
            <div className="text-center">1</div>
            <div className="text-right">$750</div>
          </div>
        </div>

        <div className="border border-zinc-800 bg-zinc-900 text-white flex justify-between p-1 font-black text-[6px]">
          <span>TOTAL BALANCE</span>
          <span>$2,250.00</span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 17. SPREADSHEET - FINANCIAL DENSE
  // ----------------------------------------------------
  if (id === 'spreadsheet-financial') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border border-zinc-700 p-2 text-[5px] flex flex-col justify-between select-none overflow-hidden font-mono", className)}>
        <div className="flex justify-between border-b border-zinc-700 pb-1">
          <span className="font-bold text-[6px]">{businessName} CORP</span>
          <span>FISCAL STATEMENT</span>
        </div>

        <div className="border border-zinc-400 divide-y divide-zinc-300 my-1 text-[4.5px]">
          <div className="grid grid-cols-4 bg-zinc-200 font-bold p-0.5 divide-x divide-zinc-400">
            <div>SKU</div><div>RATE</div><div>TAX</div><div className="text-right">NET</div>
          </div>
          <div className="grid grid-cols-4 p-0.5 divide-x divide-zinc-200">
            <div>ZN-01</div><div>100.00</div><div>15.00</div><div className="text-right">115.00</div>
          </div>
          <div className="grid grid-cols-4 p-0.5 bg-zinc-50 divide-x divide-zinc-200">
            <div>ZN-02</div><div>250.00</div><div>37.50</div><div className="text-right">287.50</div>
          </div>
        </div>

        <div className="border-t-2 border-zinc-800 flex justify-between font-bold text-[6px] pt-0.5">
          <span>ACC. TOTAL</span>
          <span>$402.50</span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 18. SPREADSHEET - COLUMNAR
  // ----------------------------------------------------
  if (id === 'spreadsheet-columnar') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border border-zinc-600 p-2 text-[5px] flex flex-col justify-between select-none overflow-hidden", className)}>
        <div className="flex justify-between border-b border-zinc-400 pb-1 font-bold text-[6px]">
          <span>{businessName}</span>
          <span className="font-mono">#COL-0045</span>
        </div>

        <div className="border border-zinc-400 divide-x divide-zinc-400 grid grid-cols-3 my-1 text-center font-mono">
          <div className="p-0.5">
            <div className="font-bold border-b border-zinc-300 bg-zinc-100">LINE</div>
            <div>01</div>
            <div>02</div>
          </div>
          <div className="p-0.5">
            <div className="font-bold border-b border-zinc-300 bg-zinc-100">HRS</div>
            <div>20</div>
            <div>15</div>
          </div>
          <div className="p-0.5">
            <div className="font-bold border-b border-zinc-300 bg-zinc-100">SUM</div>
            <div>$1,000</div>
            <div>$750</div>
          </div>
        </div>

        <div className="border-t border-zinc-700 flex justify-between font-bold text-[6px] pt-1">
          <span>COLUMN TOTAL</span>
          <span className="font-mono">$1,750.00</span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 19. SPREADSHEET - CLEAN GRID
  // ----------------------------------------------------
  if (id === 'spreadsheet-minimal') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border border-zinc-300 p-2.5 text-[5px] flex flex-col justify-between select-none overflow-hidden font-mono", className)}>
        <div className="flex justify-between border-b border-zinc-300 pb-1">
          <span className="font-bold text-[6px]">{businessName}</span>
          <span className="text-zinc-500">GRID REF #45</span>
        </div>

        <div className="divide-y divide-zinc-200 border border-zinc-200 rounded my-1 text-[5px]">
          <div className="flex justify-between p-1 bg-zinc-50 font-bold">
            <span>Description</span>
            <span>Total</span>
          </div>
          <div className="flex justify-between p-1">
            <span>Database Optimization</span>
            <span>$950.00</span>
          </div>
        </div>

        <div className="border-b-2 border-double border-zinc-900 flex justify-between font-bold text-[6px] pb-0.5">
          <span>NET DUE:</span>
          <span>$950.00</span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 20. PREMIUM - EXECUTIVE BANNER
  // ----------------------------------------------------
  if (id === 'continental') {
    return (
      <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border border-zinc-200 overflow-hidden flex flex-col justify-between text-[6px] select-none", className)}>
        <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-2 flex justify-between items-start">
          <div>
            <div className="font-black text-[7px]">{businessName}</div>
            <div className="text-purple-200 text-[5px]">Executive Edition</div>
          </div>
          <div className="text-right font-bold text-[7px]">INVOICE</div>
        </div>

        <div className="p-2 space-y-1">
          <div className="bg-zinc-50 p-1 rounded border border-zinc-200 flex justify-between text-[5px]">
            <span>Client: Acme Corp</span>
            <span className="text-purple-700 font-bold">Net 15</span>
          </div>
          <div className="border-b border-zinc-200 pb-1 flex justify-between">
            <span>Software Architecture</span>
            <span className="font-bold font-mono">$2,250.00</span>
          </div>
        </div>

        <div className="p-1.5 bg-purple-50 text-purple-900 flex justify-between font-bold border-t border-purple-200 text-[7px]">
          <span>TOTAL AMOUNT:</span>
          <span className="font-mono">$2,250.00</span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 21. PREMIUM - WARM EDITORIAL
  // ----------------------------------------------------
  if (id === 'editorial') {
    return (
      <div className={cn("w-full h-full bg-[#fbf9f5] rounded-sm shadow-xs border border-[#e8e2d8] p-2.5 text-[6px] flex flex-col justify-between overflow-hidden relative select-none font-serif", className)}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-rose-500 to-amber-700" />
        <div className="flex justify-between items-start pt-1 font-sans">
          <div>
            <div className="font-bold text-[#2d2825] text-[7px] font-serif">{businessName} Studio</div>
            <div className="text-[5px] text-[#7d756d]">Editorial Edition</div>
          </div>
          <div className="text-right">
            <div className="font-black text-[#2d2825] text-[7px]">INVOICE</div>
            <div className="text-[#7d756d] text-[5px]">#INV-0045</div>
          </div>
        </div>

        <div className="bg-[#f8f5ee] p-1 rounded border border-[#e8e2d8] my-1 font-sans text-[5px]">
          <div className="font-bold uppercase text-amber-800">Client</div>
          <div className="font-semibold text-[#2d2825]">Acme Global Corp</div>
        </div>

        <div className="border border-[#e8e2d8] divide-y divide-[#ece6dc] my-0.5 font-sans text-[5px]">
          <div className="flex justify-between px-1 py-0.5 bg-[#f8f5ee] font-bold text-[#7d756d]">
            <span>Service</span><span>Amount</span>
          </div>
          <div className="flex justify-between px-1 py-0.5 text-[#2d2825]">
            <span>Brand Strategy</span><span className="font-mono">$2,250.00</span>
          </div>
        </div>

        <div className="border-t border-[#e8e2d8] pt-1 flex justify-between font-bold text-[#2d2825] font-sans text-[6px]">
          <span className="text-amber-800">Total Due:</span>
          <span className="font-mono">$2,250.00</span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 22. PREMIUM - TOKYO STUDIO DARK
  // ----------------------------------------------------
  if (id === 'tokyo') {
    return (
      <div className={cn("w-full h-full bg-[#0e1118] text-zinc-100 rounded-sm shadow-xs border border-zinc-800 p-2 text-[6px] flex flex-col justify-between select-none overflow-hidden", className)}>
        <div className="flex justify-between items-start border-b border-zinc-800 pb-1">
          <div className="flex items-center gap-1">
            <div className="h-3.5 w-3.5 rounded bg-purple-500 text-black font-black flex items-center justify-center text-[5px]">
              Z
            </div>
            <span className="font-bold text-white text-[7px]">{businessName}</span>
          </div>
          <span className="px-1 py-0.2 bg-purple-950 text-purple-300 rounded font-mono text-[5px] border border-purple-800">
            INV-0045
          </span>
        </div>

        <div className="bg-[#181d28] p-1 rounded border border-zinc-800 my-1 text-[5px]">
          <span className="text-zinc-500 block">CLIENT</span>
          <span className="font-semibold text-zinc-200">Tokyo Cybernetics</span>
        </div>

        <div className="divide-y divide-zinc-800/80 my-0.5 text-[5px]">
          <div className="flex justify-between py-0.5 text-zinc-300">
            <span>Engineering SLA</span>
            <span className="font-mono text-purple-400 font-bold">$2,250.00</span>
          </div>
        </div>

        <div className="bg-[#181d28] px-1.5 py-1 rounded flex justify-between font-bold text-white border border-zinc-800 text-[6px]">
          <span className="text-zinc-400">BALANCE</span>
          <span className="text-purple-400 font-mono">$2,250.00</span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Fallback Generic Card (for Quotes, Credit Notes, etc.)
  // ----------------------------------------------------
  return (
    <div className={cn("w-full h-full bg-white text-zinc-900 rounded-sm shadow-xs border border-zinc-200 p-2.5 text-[6px] flex flex-col justify-between select-none overflow-hidden", className)}>
      <div className="flex justify-between items-center border-b border-zinc-200 pb-1">
        <span className="font-bold text-[7px]">{template.name}</span>
        <span className="text-purple-600 font-mono text-[5px] uppercase">{template.badge || 'Document'}</span>
      </div>
      <div className="my-1.5 p-1 bg-zinc-50 rounded border border-zinc-100 text-zinc-600 text-[5px] leading-relaxed">
        {template.description}
      </div>
      <div className="border-t border-zinc-200 pt-1 flex justify-between font-bold text-[6px]">
        <span>Status</span>
        <span className="text-emerald-700">Ready</span>
      </div>
    </div>
  );
};

import * as React from "react";
import type { Receipt, BusinessInstance } from "@/types";
import { format } from "date-fns";
import { Card, CardContent } from "../ui/card";
import { Separator } from "../ui/separator";
import { safeToDate } from "@/lib/utils";
import Image from "next/image";

interface ReceiptDetailsProps {
  receipt: Receipt;
  business?: BusinessInstance | null;
  currencySymbol?: string;
  isInvoice?: boolean;
  amountReceived?: number;
  showAdminDetails?: boolean;
  overrideTemplate?: string;
}

const Watermark = ({ businessName }: { businessName: string }) => (
  <div className="watermark absolute inset-0 flex items-center justify-center text-gray-200 text-8xl font-bold uppercase select-none -z-10 opacity-20 -rotate-45 pointer-events-none">
    {businessName.split(' ').slice(0, 2).join(' ')}
  </div>
);

const ReceiptDetails = React.memo(React.forwardRef<HTMLDivElement, ReceiptDetailsProps>(
  ({ receipt, business, currencySymbol = '₦', isInvoice = false, amountReceived, showAdminDetails = false, overrideTemplate }, ref) => {
    const businessName = business?.name || 'Your Business';
    const businessAddress = business?.address || '';
    const logoUrl = business?.settings?.logoUrl;
    const template = (overrideTemplate || (business?.settings as any)?.invoiceTemplate || 'standard').toLowerCase();
    const invoiceNum = receipt.receiptNumber || `INV-${receipt.id.substring(0, 8).toUpperCase()}`;
    const invoiceDate = receipt.createdAt ? format(safeToDate(receipt.createdAt), 'dd MMMM yyyy') : 'N/A';
    const dueDate = (receipt as any).dueDate ? format(new Date((receipt as any).dueDate), 'dd MMMM yyyy') : 'Net 15 Days';
    const status = receipt.status || (receipt.paymentMethod === 'Invoice' ? 'unpaid' : 'paid');

    // ==========================================
    // 1. INVOICE TEMPLATES
    // ==========================================
    if (isInvoice) {
      // ----------------------------------------
      // TEMPLATE A: CONTINENTAL
      // Executive corporate style with bold header banner
      // ----------------------------------------
      if (template === 'continental') {
        return (
          <div ref={ref} className="w-full bg-white text-zinc-900 print:p-0">
            <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden print:border-none print:shadow-none">
              {/* Bold Header Banner */}
              <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white p-8">
                <div className="flex justify-between items-start">
                  <div>
                    {logoUrl ? (
                      <div className="h-12 w-32 relative mb-2">
                        <Image src={logoUrl} alt={businessName} fill className="object-contain object-left filter brightness-0 invert" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center font-black text-xl mb-2">
                        {businessName.charAt(0)}
                      </div>
                    )}
                    <h1 className="text-xl font-black tracking-tight">{businessName}</h1>
                    <p className="text-purple-200 text-xs mt-0.5 max-w-xs">{businessAddress}</p>
                    {business?.settings?.phone && <p className="text-purple-200 text-xs">Tel: {business.settings.phone}</p>}
                  </div>

                  <div className="text-right">
                    <h2 className="text-3xl font-black tracking-wider uppercase">INVOICE</h2>
                    <p className="text-purple-200 font-mono font-bold text-sm mt-1">#{invoiceNum}</p>
                    <div className="mt-3 text-xs text-purple-100 space-y-0.5">
                      <div>Issued: {invoiceDate}</div>
                      <div>Due: {dueDate}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-8">
                {/* Bill To & Status Cards */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-4">
                    <h3 className="text-[10px] font-bold uppercase text-purple-700 tracking-wider mb-1">Billed To</h3>
                    <p className="font-bold text-sm text-zinc-900">{receipt.customer?.name || 'Walk-in Customer'}</p>
                    {receipt.customer?.email && <p className="text-xs text-zinc-600">{receipt.customer.email}</p>}
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-[10px] font-bold uppercase text-purple-700 tracking-wider mb-1">Payment Status</h3>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                        status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {status}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-2">Terms: {dueDate}</p>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full mb-8 text-xs">
                  <thead className="bg-purple-50 text-purple-900 border-b border-purple-200 font-bold">
                    <tr>
                      <th className="py-3 px-4 text-left">ITEM & DESCRIPTION</th>
                      <th className="py-3 px-4 text-center w-20">QTY</th>
                      <th className="py-3 px-4 text-right w-32">RATE</th>
                      <th className="py-3 px-4 text-right w-32">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {receipt.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/50">
                        <td className="py-3.5 px-4 font-medium text-zinc-900">{item.name}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-zinc-700">{item.quantity}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-zinc-700">{currencySymbol}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-900">{currencySymbol}{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end mb-8">
                  <div className="w-72 space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-600">
                      <span>Subtotal</span>
                      <span className="font-mono">{currencySymbol}{receipt.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {receipt.tax > 0 && (
                      <div className="flex justify-between text-zinc-600">
                        <span>Tax</span>
                        <span className="font-mono">{currencySymbol}{receipt.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {receipt.discount > 0 && (
                      <div className="flex justify-between text-rose-600 font-semibold">
                        <span>Discount</span>
                        <span className="font-mono">-{currencySymbol}{receipt.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="border-t-2 border-purple-700 pt-2 flex justify-between items-center text-sm font-black text-purple-900">
                      <span>TOTAL DUE</span>
                      <span className="text-base font-mono">{currencySymbol}{receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Instructions */}
                {(business?.settings?.paymentBankName || business?.settings?.paymentInstructions) && (
                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-xs text-zinc-700 space-y-1">
                    <h4 className="font-bold text-purple-900 text-[11px] uppercase tracking-wider">Bank Transfer Details</h4>
                    {business.settings.paymentBankName && (
                      <p>Bank: <span className="font-semibold">{business.settings.paymentBankName}</span> | Account: <span className="font-mono font-semibold">{business.settings.paymentBankAccountId}</span> ({business.settings.paymentAccountName})</p>
                    )}
                    {business.settings.paymentInstructions && (
                      <p className="text-zinc-500 italic mt-1">{business.settings.paymentInstructions}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      // ----------------------------------------
      // TEMPLATE B: SPREADSHEET
      // Accounting ledger with full tabular gridlines
      // ----------------------------------------
      if (template === 'spreadsheet') {
        return (
          <div ref={ref} className="w-full bg-white text-zinc-900 print:p-0">
            <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-lg border-2 border-zinc-800 p-8 print:border-none print:shadow-none font-sans">
              {/* Header Grid */}
              <div className="border-2 border-zinc-800 mb-6">
                <div className="grid grid-cols-2 divide-x-2 divide-zinc-800">
                  <div className="p-4">
                    <h1 className="text-xl font-black uppercase tracking-tight text-zinc-900">{businessName}</h1>
                    <p className="text-xs text-zinc-600 mt-1">{businessAddress}</p>
                    {business?.settings?.phone && <p className="text-xs text-zinc-600">Tel: {business.settings.phone}</p>}
                  </div>
                  <div className="p-4 bg-zinc-100 flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-sm uppercase">INVOICE</span>
                      <span className="font-mono font-bold text-sm">#{invoiceNum}</span>
                    </div>
                    <div className="text-xs text-zinc-600 mt-2 space-y-0.5 font-mono">
                      <div>DATE: {invoiceDate}</div>
                      <div>DUE DATE: {dueDate}</div>
                      <div>STATUS: <span className="font-bold uppercase">{status}</span></div>
                    </div>
                  </div>
                </div>

                <div className="border-t-2 border-zinc-800 p-4 bg-zinc-50">
                  <span className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">CLIENT BILLING INFORMATION</span>
                  <p className="font-bold text-sm">{receipt.customer?.name || 'Walk-in Customer'}</p>
                  {receipt.customer?.email && <p className="text-xs text-zinc-600 font-mono">{receipt.customer.email}</p>}
                </div>
              </div>

              {/* Spreadsheet Table with Column Borders */}
              <div className="border-2 border-zinc-800 mb-6 overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-zinc-800 text-white font-bold">
                    <tr className="divide-x divide-zinc-700">
                      <th className="py-2.5 px-3 text-center w-12">#</th>
                      <th className="py-2.5 px-3 text-left">ITEM & DESCRIPTION</th>
                      <th className="py-2.5 px-3 text-center w-20">QTY</th>
                      <th className="py-2.5 px-3 text-right w-32">RATE</th>
                      <th className="py-2.5 px-3 text-right w-32">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-300">
                    {receipt.items.map((item, idx) => (
                      <tr key={idx} className="divide-x divide-zinc-300 even:bg-zinc-50/80">
                        <td className="py-2.5 px-3 text-center font-mono text-zinc-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-medium text-zinc-900">{item.name}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{currencySymbol}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">{currencySymbol}{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Ledger Summary */}
              <div className="flex justify-end mb-6">
                <div className="w-72 border-2 border-zinc-800 divide-y-2 divide-zinc-800 text-xs font-mono">
                  <div className="flex justify-between p-2">
                    <span className="font-bold text-zinc-700">SUBTOTAL</span>
                    <span>{currencySymbol}{receipt.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {receipt.tax > 0 && (
                    <div className="flex justify-between p-2">
                      <span className="font-bold text-zinc-700">TAX</span>
                      <span>{currencySymbol}{receipt.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {receipt.discount > 0 && (
                    <div className="flex justify-between p-2 text-rose-600">
                      <span className="font-bold">DISCOUNT</span>
                      <span>-{currencySymbol}{receipt.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between p-2.5 bg-zinc-900 text-white font-black text-sm">
                    <span>BALANCE DUE</span>
                    <span>{currencySymbol}{receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Remittance Advice */}
              <div className="border border-zinc-300 rounded p-3 text-xs bg-zinc-50 text-zinc-700">
                <span className="font-bold uppercase text-[10px] text-zinc-600 block mb-1">REMITTANCE ADVICE</span>
                {business?.settings?.paymentBankName && (
                  <p>Direct Deposit: {business.settings.paymentBankName} | Acct: {business.settings.paymentBankAccountId} ({business.settings.paymentAccountName})</p>
                )}
                {business?.settings?.paymentInstructions && (
                  <p className="italic text-zinc-500 mt-1">{business.settings.paymentInstructions}</p>
                )}
              </div>
            </div>
          </div>
        );
      }

      // ----------------------------------------
      // TEMPLATE C: COMPACT
      // Space-saving minimalist single-page layout
      // ----------------------------------------
      if (template === 'compact') {
        return (
          <div ref={ref} className="w-full bg-white text-zinc-900 print:p-0">
            <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-zinc-200 p-6 print:border-none print:shadow-none text-xs">
              <div className="flex justify-between items-start border-b border-zinc-300 pb-4 mb-4">
                <div>
                  <h1 className="text-base font-bold text-zinc-900">{businessName}</h1>
                  <p className="text-[11px] text-zinc-500">{businessAddress}</p>
                  {business?.settings?.phone && <p className="text-[10px] text-zinc-500">Tel: {business.settings.phone}</p>}
                </div>
                <div className="text-right">
                  <span className="text-xs font-black tracking-widest uppercase bg-zinc-100 px-2 py-0.5 rounded">INVOICE</span>
                  <p className="font-mono font-bold mt-1 text-xs">#{invoiceNum}</p>
                  <p className="text-[10px] text-zinc-500">{invoiceDate}</p>
                </div>
              </div>

              <div className="flex justify-between mb-4 text-[11px] bg-zinc-50 p-3 rounded border border-zinc-100">
                <div>
                  <span className="text-[9px] uppercase font-bold text-zinc-400 block">Customer</span>
                  <span className="font-bold text-zinc-800">{receipt.customer?.name || 'Walk-in Customer'}</span>
                  {receipt.customer?.email && <span className="text-zinc-500 block">{receipt.customer.email}</span>}
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 block">Due Date</span>
                  <span className="font-mono text-zinc-800 font-semibold">{dueDate}</span>
                  <span className={`block uppercase font-bold text-[9px] mt-0.5 ${status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {status}
                  </span>
                </div>
              </div>

              <table className="w-full mb-4 text-[11px]">
                <thead className="border-b border-zinc-200 text-zinc-500 font-semibold">
                  <tr>
                    <th className="py-1.5 text-left">ITEM</th>
                    <th className="py-1.5 text-center w-12">QTY</th>
                    <th className="py-1.5 text-right w-24">RATE</th>
                    <th className="py-1.5 text-right w-24">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {receipt.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 text-zinc-800">{item.name}</td>
                      <td className="py-2 text-center font-mono">{item.quantity}</td>
                      <td className="py-2 text-right font-mono">{currencySymbol}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 text-right font-mono font-semibold">{currencySymbol}{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-zinc-300 pt-2 flex justify-end mb-4">
                <div className="w-56 space-y-1 text-[11px]">
                  <div className="flex justify-between text-zinc-500">
                    <span>Subtotal:</span>
                    <span className="font-mono">{currencySymbol}{receipt.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {receipt.tax > 0 && (
                    <div className="flex justify-between text-zinc-500">
                      <span>Tax:</span>
                      <span className="font-mono">{currencySymbol}{receipt.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm text-zinc-900 border-t border-zinc-200 pt-1">
                    <span>Total:</span>
                    <span className="font-mono">{currencySymbol}{receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {business?.settings?.paymentBankName && (
                <div className="text-[10px] text-zinc-500 border-t pt-2 text-center">
                  Payment: {business.settings.paymentBankName} | Acct #{business.settings.paymentBankAccountId} ({business.settings.paymentAccountName})
                </div>
              )}
            </div>
          </div>
        );
      }

      // ----------------------------------------
      // ----------------------------------------
      // TEMPLATE D: STANDARD - JAPANESE STYLE (WITH SEAL BOXES)
      // Features Hanko stamp boxes (Authorizer, Reviewer, Creator) & Japanese invoice format
      // ----------------------------------------
      if (template === 'standard-japanese' || template === 'japanese' || template === 'japanese-seal') {
        return (
          <div ref={ref} className="w-full bg-white text-zinc-900 print:p-0">
            <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-zinc-300 p-8 sm:p-10 print:border-none print:shadow-none font-sans">
              {/* Header with 3 Hanko / Seal Boxes */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-widest text-zinc-900 mb-1">御 請 求 書</h2>
                  <p className="text-[11px] font-mono text-zinc-500">INVOICE #{invoiceNum}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">発行日: <span className="font-mono text-zinc-800">{invoiceDate}</span></p>
                  <p className="text-[11px] text-zinc-500">お支払期限: <span className="font-mono text-zinc-800 font-semibold">{dueDate}</span></p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">登録番号: T{invoiceNum.replace(/[^0-9]/g, '').padEnd(13, '0').slice(0, 13)}</p>
                </div>

                {/* 3 Seal Boxes (Approval Stamps) */}
                <div className="flex flex-col items-end gap-3">
                  <div className="border border-zinc-700 divide-x divide-zinc-700 flex text-center text-[10px] w-48 shadow-xs bg-white">
                    <div className="flex-1">
                      <div className="bg-zinc-100 py-1 font-bold border-b border-zinc-700 text-zinc-700">承認</div>
                      <div className="h-14 flex items-center justify-center text-zinc-300 font-serif">印</div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-zinc-100 py-1 font-bold border-b border-zinc-700 text-zinc-700">審査</div>
                      <div className="h-14 flex items-center justify-center text-zinc-300 font-serif">印</div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-zinc-100 py-1 font-bold border-b border-zinc-700 text-zinc-700">作成</div>
                      <div className="h-14 flex items-center justify-center text-zinc-300 font-serif">印</div>
                    </div>
                  </div>

                  {logoUrl ? (
                    <div className="h-10 w-28 relative">
                      <Image src={logoUrl} alt={businessName} fill className="object-contain object-right" />
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Recipient & Issuer Split */}
              <div className="grid grid-cols-2 gap-8 border-b-2 border-zinc-900 pb-6 mb-6">
                <div>
                  <div className="border-b-2 border-zinc-800 pb-2 mb-3">
                    <h3 className="text-base font-bold text-zinc-900 flex items-baseline gap-2">
                      <span>{receipt.customer?.name || '得意先'}</span>
                      <span className="text-sm font-normal text-zinc-700">御中</span>
                    </h3>
                    {receipt.customer?.email && <p className="text-xs text-zinc-500 mt-0.5">{receipt.customer.email}</p>}
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    下記の通りご請求申し上げます。<br />
                    ご確認のほど、よろしくお願い申し上げます。
                  </p>
                </div>

                <div className="text-right text-xs text-zinc-600 space-y-1">
                  <h4 className="font-bold text-sm text-zinc-900">{businessName}</h4>
                  <p className="whitespace-pre-line">{businessAddress}</p>
                  {business?.settings?.phone && <p>TEL: {business.settings.phone}</p>}
                  {business?.settings?.email && <p>E-mail: {business.settings.email}</p>}
                </div>
              </div>

              {/* Total Billed Amount Callout Banner */}
              <div className="bg-zinc-100 border-2 border-zinc-800 rounded p-4 mb-6 flex justify-between items-center">
                <span className="text-sm font-bold text-zinc-800 tracking-wider">ご請求金額 (税込)</span>
                <span className="text-2xl font-black font-mono text-zinc-900">
                  {currencySymbol}{receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Items Table */}
              <table className="w-full mb-6 text-xs border border-zinc-400 border-collapse">
                <thead className="bg-zinc-800 text-white font-bold">
                  <tr className="divide-x divide-zinc-700">
                    <th className="py-2.5 px-3 text-center w-12">No.</th>
                    <th className="py-2.5 px-3 text-left">品名・項目 (Description)</th>
                    <th className="py-2.5 px-3 text-center w-20">数量 (Qty)</th>
                    <th className="py-2.5 px-3 text-right w-28">単価 (Rate)</th>
                    <th className="py-2.5 px-3 text-right w-32">金額 (Amount)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-300">
                  {receipt.items.map((item, idx) => (
                    <tr key={idx} className="divide-x divide-zinc-300 hover:bg-zinc-50/60">
                      <td className="py-2.5 px-3 text-center font-mono text-zinc-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-zinc-900">{item.name}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-zinc-700">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-zinc-700">{currencySymbol}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900">{currencySymbol}{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & Tax Split */}
              <div className="flex justify-end mb-6">
                <div className="w-80 border border-zinc-400 divide-y divide-zinc-300 text-xs font-mono">
                  <div className="flex justify-between p-2">
                    <span className="font-bold text-zinc-600">小計 (税抜)</span>
                    <span>{currencySymbol}{receipt.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {receipt.tax > 0 && (
                    <div className="flex justify-between p-2">
                      <span className="text-zinc-600">消費税 (10%対象)</span>
                      <span>{currencySymbol}{receipt.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {receipt.discount > 0 && (
                    <div className="flex justify-between p-2 text-rose-600">
                      <span>値引き (Discount)</span>
                      <span>-{currencySymbol}{receipt.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between p-2.5 bg-zinc-900 text-white font-black text-sm">
                    <span>合計金額 (税込)</span>
                    <span>{currencySymbol}{receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Remittance Information */}
              {(business?.settings?.paymentBankName || business?.settings?.paymentInstructions) && (
                <div className="border border-zinc-300 rounded p-4 text-xs bg-zinc-50 text-zinc-700 space-y-1 mb-4">
                  <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px] mb-1">【お振込先】</h4>
                  {business.settings.paymentBankName && (
                    <p>銀行名: <span className="font-semibold text-zinc-900">{business.settings.paymentBankName}</span> | 口座番号: <span className="font-mono font-bold text-zinc-900">{business.settings.paymentBankAccountId}</span> (普通: {business.settings.paymentAccountName})</p>
                  )}
                  {business.settings.paymentInstructions && (
                    <p className="text-zinc-500 italic mt-1">{business.settings.paymentInstructions}</p>
                  )}
                </div>
              )}

              <div className="text-center text-[10px] text-zinc-400 border-t border-zinc-200 pt-3">
                <p>振込手数料はお客様のご負担にてお願い申し上げます。</p>
              </div>
            </div>
          </div>
        );
      }

      // ----------------------------------------
      // TEMPLATE E: STANDARD - JAPANESE STYLE (WITHOUT SEAL BOXES)
      // Same clean Japanese layout without seal boxes
      // ----------------------------------------
      if (template === 'standard-japanese-no-seal' || template === 'japanese-no-seal') {
        return (
          <div ref={ref} className="w-full bg-white text-zinc-900 print:p-0">
            <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-zinc-300 p-8 sm:p-10 print:border-none print:shadow-none font-sans">
              <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-6 mb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-widest text-zinc-900 mb-1">御 請 求 書</h2>
                  <p className="text-[11px] font-mono text-zinc-500">INVOICE #{invoiceNum}</p>
                  <div className="mt-2 border-b border-zinc-400 pb-1">
                    <span className="text-base font-bold text-zinc-900">{receipt.customer?.name || '得意先'} 御中</span>
                  </div>
                </div>

                <div className="text-right text-xs text-zinc-600 space-y-1">
                  {logoUrl && (
                    <div className="h-10 w-28 relative ml-auto mb-2">
                      <Image src={logoUrl} alt={businessName} fill className="object-contain object-right" />
                    </div>
                  )}
                  <h4 className="font-bold text-sm text-zinc-900">{businessName}</h4>
                  <p className="whitespace-pre-line">{businessAddress}</p>
                  <p className="mt-1">発行日: <span className="font-mono text-zinc-800">{invoiceDate}</span></p>
                  <p>お支払期日: <span className="font-mono text-zinc-800 font-semibold">{dueDate}</span></p>
                </div>
              </div>

              {/* Total Billed Box */}
              <div className="bg-zinc-100 border-2 border-zinc-800 rounded p-4 mb-6 flex justify-between items-center">
                <span className="text-sm font-bold text-zinc-800 tracking-wider">ご請求金額 (税込)</span>
                <span className="text-2xl font-black font-mono text-zinc-900">
                  {currencySymbol}{receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Items Table */}
              <table className="w-full mb-6 text-xs border border-zinc-400 border-collapse">
                <thead className="bg-zinc-800 text-white font-bold">
                  <tr className="divide-x divide-zinc-700">
                    <th className="py-2.5 px-3 text-center w-12">No.</th>
                    <th className="py-2.5 px-3 text-left">品名・項目 (Description)</th>
                    <th className="py-2.5 px-3 text-center w-20">数量 (Qty)</th>
                    <th className="py-2.5 px-3 text-right w-28">単価 (Rate)</th>
                    <th className="py-2.5 px-3 text-right w-32">金額 (Amount)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-300">
                  {receipt.items.map((item, idx) => (
                    <tr key={idx} className="divide-x divide-zinc-300 hover:bg-zinc-50/60">
                      <td className="py-2.5 px-3 text-center font-mono text-zinc-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-zinc-900">{item.name}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-zinc-700">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-zinc-700">{currencySymbol}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900">{currencySymbol}{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="flex justify-end mb-6">
                <div className="w-80 border border-zinc-400 divide-y divide-zinc-300 text-xs font-mono">
                  <div className="flex justify-between p-2">
                    <span className="font-bold text-zinc-600">小計 (税抜)</span>
                    <span>{currencySymbol}{receipt.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {receipt.tax > 0 && (
                    <div className="flex justify-between p-2">
                      <span className="text-zinc-600">消費税 (10%)</span>
                      <span>{currencySymbol}{receipt.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between p-2.5 bg-zinc-900 text-white font-black text-sm">
                    <span>合計金額 (税込)</span>
                    <span>{currencySymbol}{receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Remittance */}
              {(business?.settings?.paymentBankName || business?.settings?.paymentInstructions) && (
                <div className="border border-zinc-300 rounded p-4 text-xs bg-zinc-50 text-zinc-700 space-y-1 mb-4">
                  <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px] mb-1">【お振込先】</h4>
                  {business.settings.paymentBankName && (
                    <p>銀行名: <span className="font-semibold text-zinc-900">{business.settings.paymentBankName}</span> | 口座: <span className="font-mono font-bold text-zinc-900">{business.settings.paymentBankAccountId}</span> ({business.settings.paymentAccountName})</p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }

      // ----------------------------------------
      // TEMPLATE F: UNIVERSAL
      // Clean modern typography, airy layout, minimal divider lines
      // ----------------------------------------
      if (template === 'universal') {
        return (
          <div ref={ref} className="w-full bg-white text-zinc-900 print:p-0">
            <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-zinc-200 p-8 sm:p-12 print:border-none print:shadow-none font-sans">
              <div className="flex justify-between items-start mb-10 pb-6 border-b border-zinc-100">
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <div className="h-12 w-28 relative">
                      <Image src={logoUrl} alt={businessName} fill className="object-contain object-left" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-lg">
                      {businessName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h1 className="text-lg font-bold text-zinc-900">{businessName}</h1>
                    <p className="text-xs text-zinc-400">{businessAddress}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold tracking-wider text-purple-600 uppercase">INVOICE</span>
                  <p className="font-mono text-xl font-bold text-zinc-900">#{invoiceNum}</p>
                  <p className="text-xs text-zinc-400 mt-1">{invoiceDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-10">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Invoice To</span>
                  <p className="text-sm font-semibold text-zinc-900">{receipt.customer?.name || 'Walk-in Customer'}</p>
                  {receipt.customer?.email && <p className="text-xs text-zinc-500 mt-0.5">{receipt.customer.email}</p>}
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Payment Due</span>
                  <p className="text-sm font-semibold text-zinc-900">{dueDate}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {status}
                  </span>
                </div>
              </div>

              <table className="w-full mb-10 text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-400 font-medium">
                    <th className="py-3 text-left">DESCRIPTION</th>
                    <th className="py-3 text-center w-20">QTY</th>
                    <th className="py-3 text-right w-28">PRICE</th>
                    <th className="py-3 text-right w-32">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {receipt.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-4 text-zinc-800 font-medium">{item.name}</td>
                      <td className="py-4 text-center font-mono text-zinc-500">{item.quantity}</td>
                      <td className="py-4 text-right font-mono text-zinc-600">{currencySymbol}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-4 text-right font-mono font-semibold text-zinc-900">{currencySymbol}{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end mb-8">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-500">
                    <span>Subtotal</span>
                    <span className="font-mono">{currencySymbol}{receipt.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {receipt.tax > 0 && (
                    <div className="flex justify-between text-zinc-500">
                      <span>Tax</span>
                      <span className="font-mono">{currencySymbol}{receipt.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="border-t border-zinc-200 pt-2 flex justify-between font-bold text-sm text-zinc-900">
                    <span>Total Due</span>
                    <span className="font-mono text-purple-600">{currencySymbol}{receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // ----------------------------------------
      // TEMPLATE G: RETAIL
      // Retail POS store invoice layout
      // ----------------------------------------
      if (template === 'retail') {
        return (
          <div ref={ref} className="w-full bg-white text-zinc-900 print:p-0">
            <div className="w-full max-w-xl mx-auto bg-white rounded-lg shadow-md border-2 border-zinc-300 p-6 print:border-none print:shadow-none font-mono text-xs">
              <div className="text-center pb-4 border-b-2 border-dashed border-zinc-300 mb-4">
                <h2 className="text-lg font-black uppercase tracking-wider">{businessName}</h2>
                <p className="text-[10px] text-zinc-500 mt-1">{businessAddress}</p>
                {business?.settings?.phone && <p className="text-[10px] text-zinc-500">TEL: {business.settings.phone}</p>}
                <div className="mt-2 inline-block bg-zinc-100 px-3 py-1 rounded text-[11px] font-bold uppercase tracking-widest">
                  RETAIL INVOICE
                </div>
              </div>

              <div className="flex justify-between mb-3 text-[11px]">
                <div>
                  <span className="text-zinc-500">INVOICE:</span> #{invoiceNum}<br />
                  <span className="text-zinc-500">CUSTOMER:</span> {receipt.customer?.name || 'Walk-in'}
                </div>
                <div className="text-right">
                  <span className="text-zinc-500">DATE:</span> {invoiceDate}<br />
                  <span className="text-zinc-500">STATUS:</span> <span className="font-bold">{status.toUpperCase()}</span>
                </div>
              </div>

              <table className="w-full my-4 border-t-2 border-b-2 border-dashed border-zinc-300 text-[11px]">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="py-2 text-left">ITEM</th>
                    <th className="py-2 text-center">QTY</th>
                    <th className="py-2 text-right">PRICE</th>
                    <th className="py-2 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {receipt.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 text-left font-sans">{item.name}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right">{currencySymbol}{item.price.toFixed(2)}</td>
                      <td className="py-2 text-right font-bold">{currencySymbol}{(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-1 text-right text-xs mb-4">
                <div>SUBTOTAL: {currencySymbol}{receipt.subtotal.toFixed(2)}</div>
                {receipt.tax > 0 && <div>TAX: {currencySymbol}{receipt.tax.toFixed(2)}</div>}
                <div className="text-sm font-bold border-t border-dashed border-zinc-300 pt-1">
                  TOTAL AMOUNT: {currencySymbol}{receipt.total.toFixed(2)}
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-zinc-300 text-[10px] text-zinc-500">
                <p>THANK YOU FOR SHOPPING WITH US</p>
                <div className="h-8 w-40 bg-zinc-200 mx-auto mt-2 flex items-center justify-center text-[9px] tracking-widest font-mono">
                  ||||| | |||| || ||| |||||
                </div>
              </div>
            </div>
          </div>
        );
      }

      // ----------------------------------------
      // TEMPLATE D: STANDARD (DEFAULT / ZOHO STANDARD)
      // Professional Zoho-style Standard invoice matching screenshot
      // ----------------------------------------
      return (
        <div ref={ref} className="w-full bg-white text-zinc-900 print:p-0">
          <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-zinc-200 p-8 sm:p-10 print:border-none print:shadow-none">
            {/* Header: Company Logo & Details on Left, INVOICE & Meta on Right */}
            <div className="flex justify-between items-start border-b border-zinc-200 pb-8 mb-8">
              <div>
                {logoUrl ? (
                  <div className="h-14 w-36 relative mb-3">
                    <Image src={logoUrl} alt={businessName} fill className="object-contain object-left" />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-2xl text-white shadow-sm mb-3">
                    {businessName.charAt(0) || 'Z'}
                  </div>
                )}
                <h1 className="text-lg font-bold text-zinc-900">{businessName}</h1>
                <p className="text-zinc-500 text-xs mt-0.5 whitespace-pre-line max-w-sm">{businessAddress}</p>
                {business?.settings?.phone && <p className="text-xs text-zinc-600 mt-1">Phone: {business.settings.phone}</p>}
                {business?.settings?.email && <p className="text-xs text-zinc-600">Email: {business.settings.email}</p>}
              </div>

              <div className="text-right">
                <h2 className="text-3xl font-black tracking-tight text-zinc-900 uppercase">INVOICE</h2>
                <div className="text-xs text-zinc-600 mt-3 space-y-1 font-mono">
                  <div>Invoice#: <span className="font-bold text-zinc-900">#{invoiceNum}</span></div>
                  <div>Invoice Date: <span className="font-semibold text-zinc-800">{invoiceDate}</span></div>
                  <div>Terms: <span className="font-semibold text-zinc-800">{dueDate}</span></div>
                  <div>Due Date: <span className="font-semibold text-zinc-800">{dueDate}</span></div>
                  <div className="pt-2">
                    <div className="bg-zinc-100 border border-zinc-300 rounded px-3 py-1.5 text-right inline-block">
                      <span className="text-[10px] text-zinc-500 uppercase block font-sans">Balance Due</span>
                      <span className="text-base font-black font-mono text-zinc-900">
                        {currencySymbol}{receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To Section */}
            <div className="mb-8">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">Bill To</span>
              <p className="text-base font-bold text-zinc-900">{receipt.customer?.name || 'Walk-in Customer'}</p>
              {receipt.customer?.email && <p className="text-xs text-zinc-600 mt-0.5">{receipt.customer.email}</p>}
            </div>

            {/* Dark Charcoal Table Header matching Zoho Standard */}
            <table className="w-full mb-8 text-xs border border-zinc-200">
              <thead className="bg-[#1f2937] text-white font-bold">
                <tr>
                  <th className="py-3 px-3 text-center w-12 border-r border-zinc-700">#</th>
                  <th className="py-3 px-4 text-left">Item & Description</th>
                  <th className="py-3 px-4 text-center w-20">Qty</th>
                  <th className="py-3 px-4 text-right w-28">Rate</th>
                  <th className="py-3 px-4 text-right w-24">Discount</th>
                  <th className="py-3 px-4 text-right w-32">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {receipt.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/50">
                    <td className="py-3 px-3 text-center font-mono text-zinc-400 border-r border-zinc-200">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-medium text-zinc-900">
                      {item.name}
                      {showAdminDetails && item.priceOverridden && (
                        <span className="ml-2 text-[9px] text-orange-600 bg-orange-100 px-1 py-0.5 rounded font-normal no-print">
                          Price Overridden
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-zinc-700">{item.quantity}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-zinc-700">{currencySymbol}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-zinc-500">0.00</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-900">{currencySymbol}{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals & Balance Due */}
            <div className="flex justify-end mb-8">
              <div className="w-80 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Sub Total:</span>
                  <span className="font-mono">{currencySymbol}{receipt.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {receipt.tax > 0 && (
                  <div className="flex justify-between text-zinc-600">
                    <span>Tax:</span>
                    <span className="font-mono">{currencySymbol}{receipt.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {receipt.discount > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Discount:</span>
                    <span className="font-mono">-{currencySymbol}{receipt.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-600 border-t border-zinc-200 pt-2 font-bold">
                  <span>Total:</span>
                  <span className="font-mono">{currencySymbol}{receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Payment Made:</span>
                  <span className="font-mono">(-) {currencySymbol}{status === 'paid' ? receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</span>
                </div>
                <div className="bg-zinc-100 border border-zinc-300 p-2.5 rounded flex justify-between items-center text-sm font-black text-zinc-900">
                  <span>Balance Due:</span>
                  <span className="text-base font-mono text-emerald-700">{currencySymbol}{status === 'paid' ? '0.00' : receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Payment Details & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-200 text-xs">
              <div>
                <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px] mb-2">Payment Options</h4>
                {(business?.settings?.paymentBankName || business?.settings?.paymentInstructions) ? (
                  <div className="space-y-1 text-zinc-700">
                    {business.settings.paymentBankName && (
                      <p>Bank: <span className="font-semibold text-zinc-900">{business.settings.paymentBankName}</span><br />
                      Account: <span className="font-mono font-bold text-zinc-900">{business.settings.paymentBankAccountId}</span> ({business.settings.paymentAccountName})</p>
                    )}
                    {business.settings.paymentInstructions && (
                      <p className="text-zinc-500 italic mt-1">{business.settings.paymentInstructions}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-zinc-500">Direct Bank Transfer or Online Payment supported.</p>
                )}
              </div>

              <div>
                <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px] mb-2">Terms & Conditions</h4>
                <p className="text-zinc-500 leading-relaxed">
                  Payment is due upon receipt or within the agreed terms. Thank you for choosing our services!
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-zinc-400 border-t border-zinc-200 mt-8 pt-4">
              <p className="font-medium text-zinc-500">Thank you for your business!</p>
              <p className="mt-0.5">Powered by Zeneva Invoicing</p>
            </div>
          </div>
        </div>
      );
    }

    // ==========================================
    // 2. DEFAULT RECEIPT VIEW (FOR POS SALES)
    // ==========================================
    return (
      <div ref={ref} className="w-full bg-white sm:py-4 print:py-0">
        <Card className="w-full max-w-[300px] mx-auto relative overflow-hidden print-receipt shadow-none border-dashed border-2 border-gray-200 bg-white text-black print:border-none print:shadow-none">
          <Watermark businessName={businessName} />
          <div className="text-center pb-2 pt-4 px-4">
            <h2 className="text-sm font-bold uppercase tracking-wider">{businessName}</h2>
            {businessAddress && <p className="text-[9px] text-gray-500">{businessAddress}</p>}
          </div>
          <CardContent className="text-[10px] px-4 pb-4">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Receipt ID:</span>
              <span className="font-mono">{receipt.receiptNumber || receipt.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-gray-500">Date:</span>
              <span className="font-mono">{receipt.createdAt ? format(safeToDate(receipt.createdAt), 'dd/MM/yyyy HH:mm') : 'N/A'}</span>
            </div>

            {receipt.customer && (
              <>
                <Separator className="my-2 border-dashed border-gray-300" />
                <div className="mb-2">
                  <h3 className="font-semibold text-gray-500 uppercase text-[9px]">Billed To:</h3>
                  <p className="font-medium text-[11px]">{receipt.customer.name}</p>
                  <p className="text-gray-500 text-[9px]">{receipt.customer.email}</p>
                </div>
              </>
            )}

            <Separator className="my-3 border-dashed border-gray-300" />

            <div className="space-y-2">
              {receipt.items.map((item, index) => (
                <div key={item.productId + index} className="flex justify-between items-start mb-1 text-[10px]">
                  <div className="flex-1 pr-2">
                    <p className="font-medium leading-tight">{item.name}</p>
                    <p className="text-gray-500 text-[9px] mt-0.5">
                      {item.quantity} x {currencySymbol}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <p className="font-medium pt-0.5">{currencySymbol}{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              ))}
            </div>

            <Separator className="my-3 border-dashed border-gray-300" />

            <div className="space-y-1.5 text-[10px] font-medium text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{currencySymbol}{receipt.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{currencySymbol}{receipt.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {receipt.discount > 0 && (
                <div className="flex justify-between text-red-500 font-bold">
                  <span>Discount</span>
                  <span>-{currencySymbol}{receipt.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            <Separator className="my-3 border-dashed border-gray-300" />

            <div className="flex justify-between font-bold text-sm pt-1">
              <span>Total</span>
              <span>{currencySymbol}{receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {receipt.paymentMethod === 'Cash' && amountReceived !== undefined && amountReceived > 0 && (
              <div className="space-y-1 mt-3 pt-3 border-t border-dashed border-gray-300 text-[10px] font-medium text-gray-600">
                <div className="flex justify-between">
                  <span>Cash Received</span>
                  <span>{currencySymbol}{amountReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Change</span>
                  <span>{currencySymbol}{Math.max(0, amountReceived - receipt.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </CardContent>
          <div className="bg-gray-50/50 p-4 pt-2 text-center text-[9px] border-t border-dashed border-gray-200">
            <p className="font-medium text-gray-600 mb-1">Thank you for your business!</p>
            <p className="text-gray-500">Method: <span className="font-semibold uppercase">{receipt.paymentMethod}</span></p>
          </div>
        </Card>
      </div>
    );
  }
));
ReceiptDetails.displayName = "ReceiptDetails";

export default ReceiptDetails;

/**
 * invoice-pdf.ts
 * High-resolution, professional A4 PDF generator for Zeneva invoices.
 */

export interface InvoicePDFOptions {
  filename?: string;
  margin?: number | [number, number, number, number];
  quality?: number;
}

export async function downloadInvoicePDF(
  element: HTMLElement,
  filename: string = 'Invoice.pdf',
  options?: InvoicePDFOptions
): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;

  const opt = {
    margin: options?.margin ?? [10, 10, 10, 10], // 10mm margins for standard print A4
    filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
    image: { type: 'jpeg' as const, quality: options?.quality ?? 0.98 },
    html2canvas: {
      scale: 3, // 300+ DPI equivalent sharpness
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      letterRendering: true,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  await html2pdf().set(opt).from(element).save();
}

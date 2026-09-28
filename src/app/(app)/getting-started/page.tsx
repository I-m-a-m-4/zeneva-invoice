'use client';

import * as React from 'react';
import { usePOS } from '@/context/pos-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  Sparkles,
  Upload,
  Check,
  FileText,
  ArrowRight,
  Printer,
  Palette
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

type TemplateType = 'standard' | 'spreadsheet' | 'continental' | 'compact';

export default function GettingStartedPage() {
  const { business, currentUserProfile, user, currencySymbol, mutateBusiness } = usePOS();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedTemplate, setSelectedTemplate] = React.useState<TemplateType>(
    (business?.settings as any)?.invoiceTemplate || 'standard'
  );
  const [logoPreview, setLogoPreview] = React.useState<string | null>(
    business?.settings?.logoUrl || null
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);

  const userName = currentUserProfile?.name || user?.displayName || 'Bello Imam';
  const businessName = business?.name || 'Zeneva Business';

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAndProceed = async () => {
    if (!business?.id || !firestore) {
      toast({ title: 'Template chosen!', description: 'Your preference has been saved.' });
      router.push('/dashboard');
      return;
    }

    setIsSaving(true);
    try {
      const businessRef = doc(firestore, 'businessInstances', business.id);
      await updateDoc(businessRef, {
        'settings.invoiceTemplate': selectedTemplate,
        ...(logoPreview ? { 'settings.logoUrl': logoPreview } : {}),
        updatedAt: serverTimestamp(),
      });
      if (mutateBusiness) mutateBusiness();

      setIsSaved(true);
      toast({ title: 'Settings Saved', description: 'Your invoice template and branding have been configured.' });
      setTimeout(() => {
        router.push('/invoices/new');
      }, 800);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error saving template' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 w-full max-w-[1400px] mx-auto animate-in fade-in duration-300 bg-background text-foreground">
      {/* Top Celebratory Banner - Adaptive for Light and Dark */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-purple-500/10 dark:from-zinc-900 dark:via-neutral-900 dark:to-zinc-950 p-6 border border-purple-500/20 dark:border-zinc-800 shadow-sm">
        <div className="relative z-10 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-2xl shadow-md shrink-0">
            🎉
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              Welcome {userName} !
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-2xl">
              Your journey to top-tier invoicing starts here. Configure Zeneva Invoice the way you want with our interactive guides and template resources.
            </p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Template Configurator */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-card text-card-foreground rounded-2xl border border-border p-6 md:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-base md:text-lg font-bold text-foreground">
                1. What do you want your invoices to look like?
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Pick a template that suits your business and customize it to reflect your branding.
              </p>
            </div>

            {/* Template Thumbnails Grid */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice Template</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Standard */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('standard')}
                  className={`group relative flex flex-col items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    selectedTemplate === 'standard'
                      ? 'border-purple-600 dark:border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm ring-1 ring-purple-500/30'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/40'
                  }`}
                >
                  <div className="w-full aspect-[4/3] rounded-lg bg-muted/80 dark:bg-zinc-800 p-2 flex flex-col justify-between overflow-hidden border border-border/50">
                    <div className="flex justify-between items-center">
                      <div className="h-2.5 w-2.5 rounded bg-blue-500" />
                      <div className="text-[7px] font-mono text-muted-foreground">INV</div>
                    </div>
                    <div className="space-y-1 my-auto">
                      <div className="h-1 w-full bg-foreground/20 rounded-full" />
                      <div className="h-1 w-3/4 bg-foreground/15 rounded-full" />
                    </div>
                    <div className="h-1 w-1/2 bg-foreground/20 rounded-full self-end" />
                  </div>
                  <span className="text-[11px] font-bold mt-2 uppercase tracking-wider text-foreground">Standard</span>
                  {selectedTemplate === 'standard' && (
                    <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* Spreadsheet */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('spreadsheet')}
                  className={`group relative flex flex-col items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    selectedTemplate === 'spreadsheet'
                      ? 'border-purple-600 dark:border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm ring-1 ring-purple-500/30'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/40'
                  }`}
                >
                  <div className="w-full aspect-[4/3] rounded-lg bg-muted/80 dark:bg-zinc-800 p-2 flex flex-col justify-between overflow-hidden border border-border/50">
                    <div className="flex justify-between items-center border-b border-border pb-1">
                      <div className="h-1.5 w-6 bg-foreground/25 rounded" />
                      <div className="text-[7px] font-mono text-muted-foreground">INV</div>
                    </div>
                    <div className="grid grid-cols-3 gap-0.5 my-auto border border-border p-0.5">
                      <div className="h-1 bg-foreground/20" />
                      <div className="h-1 bg-foreground/20" />
                      <div className="h-1 bg-foreground/20" />
                      <div className="h-1 bg-foreground/15" />
                      <div className="h-1 bg-foreground/15" />
                      <div className="h-1 bg-foreground/15" />
                    </div>
                    <div className="h-1 w-2/3 bg-foreground/20 rounded-full self-end" />
                  </div>
                  <span className="text-[11px] font-bold mt-2 uppercase tracking-wider text-foreground">Spreadsheet</span>
                  {selectedTemplate === 'spreadsheet' && (
                    <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* Continental */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('continental')}
                  className={`group relative flex flex-col items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    selectedTemplate === 'continental'
                      ? 'border-purple-600 dark:border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm ring-1 ring-purple-500/30'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/40'
                  }`}
                >
                  <div className="w-full aspect-[4/3] rounded-lg bg-muted/80 dark:bg-zinc-800 p-2 flex flex-col justify-between overflow-hidden border border-border/50">
                    <div className="h-2.5 w-full bg-orange-500 rounded-sm flex items-center justify-end px-1">
                      <div className="text-[6px] font-bold text-white">INV</div>
                    </div>
                    <div className="space-y-1 my-auto">
                      <div className="h-1 w-full bg-foreground/20 rounded-full" />
                      <div className="h-1 w-4/5 bg-foreground/15 rounded-full" />
                    </div>
                    <div className="h-1 w-1/3 bg-orange-500 rounded-sm self-end" />
                  </div>
                  <span className="text-[11px] font-bold mt-2 uppercase tracking-wider text-foreground">Continental</span>
                  {selectedTemplate === 'continental' && (
                    <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* Compact */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('compact')}
                  className={`group relative flex flex-col items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    selectedTemplate === 'compact'
                      ? 'border-purple-600 dark:border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm ring-1 ring-purple-500/30'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/40'
                  }`}
                >
                  <div className="w-full aspect-[4/3] rounded-lg bg-muted/80 dark:bg-zinc-800 p-1.5 flex flex-col justify-between overflow-hidden border border-border/50">
                    <div className="flex justify-between items-center">
                      <div className="h-2 w-2 rounded bg-purple-500" />
                      <div className="h-1 w-8 bg-foreground/20 rounded" />
                    </div>
                    <div className="space-y-0.5 my-auto">
                      <div className="h-0.5 w-full bg-foreground/20" />
                      <div className="h-0.5 w-full bg-foreground/20" />
                      <div className="h-0.5 w-full bg-foreground/15" />
                    </div>
                    <div className="h-1 w-1/3 bg-foreground/25 rounded-full self-end" />
                  </div>
                  <span className="text-[11px] font-bold mt-2 uppercase tracking-wider text-foreground">Compact</span>
                  {selectedTemplate === 'compact' && (
                    <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Organization Logo */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Organization Logo</Label>
              <div className="flex items-center gap-4">
                <label className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors w-40 h-28 bg-muted/30 hover:bg-muted/50">
                  <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-xs font-semibold text-foreground">Upload</span>
                  <span className="text-[10px] text-muted-foreground">PNG, JPG, SVG</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                {logoPreview && (
                  <div className="relative h-28 w-28 rounded-xl border border-border p-2 bg-background flex items-center justify-center overflow-hidden shadow-sm">
                    <Image src={logoPreview} alt="Logo preview" width={100} height={100} className="object-contain" />
                    <button
                      type="button"
                      onClick={() => setLogoPreview(null)}
                      className="absolute top-1 right-1 h-5 w-5 bg-destructive text-white rounded-full flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic">
              Note : You can find more templates and customization options from <Link href="/templates" className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">Templates</Link>.
            </p>

            <Button
              onClick={handleSaveAndProceed}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-11 px-8 rounded-xl shadow-md transition-all"
            >
              {isSaving ? 'Saving...' : 'Save & Proceed'}
            </Button>
          </div>

          {/* Step 2 Checklist */}
          <div className="bg-card text-card-foreground rounded-2xl border border-border p-6 flex items-center justify-between shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-foreground">2. Make the most of Zeneva Invoice</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Set up online payments, customer records, and item catalogs</p>
            </div>
            <Button variant="outline" size="sm" asChild className="font-semibold text-xs h-9">
              <Link href="/settings">Set Up</Link>
            </Button>
          </div>
        </div>

        {/* Right Column: Live Interactive Real-Time Invoice Preview */}
        <div className="lg:col-span-6 sticky top-6">
          <Card className="rounded-3xl border border-border shadow-xl bg-card text-card-foreground overflow-hidden p-6 md:p-8">
            <div className="text-[11px] font-mono tracking-widest text-muted-foreground uppercase mb-4">
              TEMPLATE <span className="text-foreground font-bold capitalize">{selectedTemplate}</span>
            </div>

            {/* Template Specific Header Styles */}
            <div className={`rounded-2xl p-6 transition-all border ${
              selectedTemplate === 'continental'
                ? 'bg-muted/30 border-t-4 border-t-orange-500 border-border'
                : selectedTemplate === 'spreadsheet'
                ? 'bg-muted/20 border-border'
                : 'bg-muted/20 border-border'
            }`}>
              {/* Header: Logo & Title */}
              <div className="flex justify-between items-start border-b border-border pb-6 mb-6">
                <div>
                  {logoPreview ? (
                    <div className="h-12 w-28 relative">
                      <Image src={logoPreview} alt="Logo" fill className="object-contain object-left" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-xl text-white shadow-md">
                      Z
                    </div>
                  )}
                  <h3 className="font-bold text-sm text-foreground mt-2">{businessName}</h3>
                </div>

                <div className="text-right">
                  <h2 className="text-2xl font-black tracking-tight text-foreground">INVOICE</h2>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">#INV0291</p>
                  <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5 font-mono">
                    <div>Invoice Date : 12.02.2026</div>
                    <div>Due Date : 25.02.2026</div>
                  </div>
                </div>
              </div>

              {/* Invoice Table Mockup */}
              <div className="overflow-hidden rounded-xl border border-border bg-background">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3 text-left">ITEM DESCRIPTION</th>
                      <th className="py-2.5 px-3 text-center">QTY</th>
                      <th className="py-2.5 px-3 text-right">RATE</th>
                      <th className="py-2.5 px-3 text-right">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    <tr>
                      <td className="py-3 px-3 font-medium">
                        MacBook Pro (14.2-inch) Liquid Retina
                        <div className="text-[10px] text-muted-foreground font-normal">Apple M3 Pro Chip, 18GB Unified Memory</div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">1</td>
                      <td className="py-3 px-3 text-right font-mono">1,540,000.00</td>
                      <td className="py-3 px-3 text-right font-bold font-mono text-foreground">1,540,000.00</td>
                    </tr>
                    <tr className="opacity-50">
                      <td className="py-2.5 px-3">
                        <div className="h-2 w-36 bg-muted-foreground/30 rounded" />
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">—</td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">—</td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="flex justify-end mt-6">
                <div className="w-48 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>1,540,000.00</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax (0%):</span>
                    <span>0.00</span>
                  </div>
                  <div className="border-t border-border pt-1.5 flex justify-between font-bold text-sm text-foreground">
                    <span>Total Due:</span>
                    <span className="text-purple-600 dark:text-purple-400">1,540,000.00</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

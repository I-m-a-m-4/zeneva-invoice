'use client';

import * as React from 'react';
import { usePOS } from '@/context/pos-context';
import { Button } from '@/components/ui/button';
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
  const businessName = business?.name || 'Zeneva Solutions';

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
    <div className="flex-1 space-y-6 p-2 sm:p-4 md:p-6 w-full animate-in fade-in duration-300 bg-background text-foreground">
      {/* Top Welcome Header - Sleek and Elegant */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 border border-primary/20 shadow-2xs">
        <div className="relative z-10 flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-xl shadow-sm shrink-0">
            🎉
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Welcome, {userName}!
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Your journey to seamless, modern invoicing starts here. Customize your default invoice look and organization identity.
            </p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        {/* Left Column: Template Configurator */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-card text-card-foreground rounded-xl border border-border/70 p-5 sm:p-7 shadow-xs space-y-6">
            <div>
              <h2 className="text-base md:text-lg font-bold text-foreground">
                1. What do you want your invoices to look like?
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Pick a template that matches your brand style. You can further customize layout and colors anytime.
              </p>
            </div>

            {/* Template Thumbnails Grid */}
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Invoice Template
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Standard */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('standard')}
                  className={`group relative flex flex-col items-center justify-between p-2.5 rounded-lg border-2 transition-all ${
                    selectedTemplate === 'standard'
                      ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20'
                      : 'border-border/70 hover:border-muted-foreground/30 hover:bg-muted/40'
                  }`}
                >
                  <div className="w-full aspect-[4/3] rounded-md bg-muted/70 dark:bg-zinc-800 p-2 flex flex-col justify-between overflow-hidden border border-border/40">
                    <div className="flex justify-between items-center">
                      <div className="h-2 w-2 rounded-xs bg-blue-500" />
                      <div className="text-[7px] font-mono text-muted-foreground">INV</div>
                    </div>
                    <div className="space-y-1 my-auto">
                      <div className="h-1 w-full bg-foreground/20 rounded-full" />
                      <div className="h-1 w-3/4 bg-foreground/15 rounded-full" />
                    </div>
                    <div className="h-1 w-1/2 bg-foreground/20 rounded-full self-end" />
                  </div>
                  <span className="text-[11px] font-semibold mt-2 uppercase tracking-wider text-foreground">Standard</span>
                  {selectedTemplate === 'standard' && (
                    <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow-xs">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* Spreadsheet */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('spreadsheet')}
                  className={`group relative flex flex-col items-center justify-between p-2.5 rounded-lg border-2 transition-all ${
                    selectedTemplate === 'spreadsheet'
                      ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20'
                      : 'border-border/70 hover:border-muted-foreground/30 hover:bg-muted/40'
                  }`}
                >
                  <div className="w-full aspect-[4/3] rounded-md bg-muted/70 dark:bg-zinc-800 p-2 flex flex-col justify-between overflow-hidden border border-border/40">
                    <div className="flex justify-between items-center border-b border-border/60 pb-1">
                      <div className="h-1.5 w-5 bg-foreground/25 rounded-xs" />
                      <div className="text-[7px] font-mono text-muted-foreground">INV</div>
                    </div>
                    <div className="grid grid-cols-3 gap-0.5 my-auto border border-border/60 p-0.5">
                      <div className="h-1 bg-foreground/20" />
                      <div className="h-1 bg-foreground/20" />
                      <div className="h-1 bg-foreground/20" />
                      <div className="h-1 bg-foreground/15" />
                      <div className="h-1 bg-foreground/15" />
                      <div className="h-1 bg-foreground/15" />
                    </div>
                    <div className="h-1 w-2/3 bg-foreground/20 rounded-full self-end" />
                  </div>
                  <span className="text-[11px] font-semibold mt-2 uppercase tracking-wider text-foreground">Spreadsheet</span>
                  {selectedTemplate === 'spreadsheet' && (
                    <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow-xs">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* Continental */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('continental')}
                  className={`group relative flex flex-col items-center justify-between p-2.5 rounded-lg border-2 transition-all ${
                    selectedTemplate === 'continental'
                      ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20'
                      : 'border-border/70 hover:border-muted-foreground/30 hover:bg-muted/40'
                  }`}
                >
                  <div className="w-full aspect-[4/3] rounded-md bg-muted/70 dark:bg-zinc-800 p-2 flex flex-col justify-between overflow-hidden border border-border/40">
                    <div className="h-2 w-full bg-orange-500 rounded-xs flex items-center justify-end px-1">
                      <div className="text-[6px] font-bold text-white">INV</div>
                    </div>
                    <div className="space-y-1 my-auto">
                      <div className="h-1 w-full bg-foreground/20 rounded-full" />
                      <div className="h-1 w-4/5 bg-foreground/15 rounded-full" />
                    </div>
                    <div className="h-1 w-1/3 bg-orange-500 rounded-xs self-end" />
                  </div>
                  <span className="text-[11px] font-semibold mt-2 uppercase tracking-wider text-foreground">Continental</span>
                  {selectedTemplate === 'continental' && (
                    <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow-xs">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* Compact */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('compact')}
                  className={`group relative flex flex-col items-center justify-between p-2.5 rounded-lg border-2 transition-all ${
                    selectedTemplate === 'compact'
                      ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20'
                      : 'border-border/70 hover:border-muted-foreground/30 hover:bg-muted/40'
                  }`}
                >
                  <div className="w-full aspect-[4/3] rounded-md bg-muted/70 dark:bg-zinc-800 p-1.5 flex flex-col justify-between overflow-hidden border border-border/40">
                    <div className="flex justify-between items-center">
                      <div className="h-1.5 w-1.5 rounded-xs bg-purple-500" />
                      <div className="h-1 w-6 bg-foreground/20 rounded-xs" />
                    </div>
                    <div className="space-y-0.5 my-auto">
                      <div className="h-0.5 w-full bg-foreground/20" />
                      <div className="h-0.5 w-full bg-foreground/20" />
                      <div className="h-0.5 w-full bg-foreground/15" />
                    </div>
                    <div className="h-1 w-1/3 bg-foreground/25 rounded-full self-end" />
                  </div>
                  <span className="text-[11px] font-semibold mt-2 uppercase tracking-wider text-foreground">Compact</span>
                  {selectedTemplate === 'compact' && (
                    <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow-xs">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Organization Logo */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Organization Logo
              </Label>
              <div className="flex items-center gap-4">
                <label className="border border-dashed border-border/90 hover:border-primary/60 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer transition-colors w-36 h-24 bg-muted/20 hover:bg-muted/40">
                  <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                  <span className="text-xs font-semibold text-foreground">Upload</span>
                  <span className="text-[10px] text-muted-foreground">PNG, JPG, SVG</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                {logoPreview && (
                  <div className="relative h-24 w-24 rounded-lg border border-border p-2 bg-background flex items-center justify-center overflow-hidden shadow-2xs">
                    <Image src={logoPreview} alt="Logo preview" width={80} height={80} className="object-contain" />
                    <button
                      type="button"
                      onClick={() => setLogoPreview(null)}
                      className="absolute top-1 right-1 h-5 w-5 bg-destructive text-white rounded-full flex items-center justify-center text-xs shadow-xs"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Note: You can discover and customize more invoice layouts under{' '}
              <Link href="/templates" className="text-primary font-semibold hover:underline">
                Templates
              </Link>.
            </p>

            <div>
              <Button
                onClick={handleSaveAndProceed}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 px-7 rounded-lg shadow-xs transition-all flex items-center gap-2"
              >
                <span>{isSaving ? 'Saving...' : 'Save & Proceed'}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Step 2 Checklist */}
          <div className="bg-card text-card-foreground rounded-xl border border-border/70 p-5 flex items-center justify-between shadow-2xs">
            <div>
              <h3 className="text-sm font-semibold text-foreground">2. Make the most of Zeneva Invoice</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Set up online payments, customer records, and item catalogs</p>
            </div>
            <Button variant="outline" size="sm" asChild className="font-semibold text-xs h-8 rounded-lg">
              <Link href="/settings">Set Up</Link>
            </Button>
          </div>
        </div>

        {/* Right Column: Interactive Real-Time Invoice Sheet Preview */}
        <div className="lg:col-span-6 sticky top-6">
          <div className="rounded-xl border border-border/50 bg-muted/20 dark:bg-muted/10 p-4 sm:p-5 backdrop-blur-xs space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Live Preview
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-border bg-background text-muted-foreground font-medium">
                {selectedTemplate}
              </span>
            </div>

            {/* The Document Sheet */}
            <div className={`rounded-lg bg-card text-card-foreground border border-border/80 shadow-md p-6 sm:p-7 space-y-6 transition-all ${
              selectedTemplate === 'continental'
                ? 'border-t-4 border-t-orange-500'
                : ''
            }`}>
              {/* Header: Logo & Title */}
              <div className="flex justify-between items-start border-b border-border pb-5">
                <div>
                  {logoPreview ? (
                    <div className="h-10 w-24 relative">
                      <Image src={logoPreview} alt="Logo" fill className="object-contain object-left" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center font-bold text-lg text-primary-foreground shadow-2xs">
                      Z
                    </div>
                  )}
                  <h3 className="font-bold text-sm text-foreground mt-2">{businessName}</h3>
                </div>

                <div className="text-right">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">INVOICE</h2>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">#INV-0291</p>
                  <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5 font-mono">
                    <div>Date: 12 Feb 2026</div>
                    <div>Due: 25 Feb 2026</div>
                  </div>
                </div>
              </div>

              {/* Invoice Table Mockup */}
              <div className="overflow-hidden rounded-md border border-border bg-background">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
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
                      <td className="py-3 px-3 text-right font-semibold font-mono text-foreground">1,540,000.00</td>
                    </tr>
                    <tr className="opacity-40">
                      <td className="py-2.5 px-3">
                        <div className="h-2 w-28 bg-muted-foreground/30 rounded" />
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">—</td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">—</td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="flex justify-end pt-1">
                <div className="w-52 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>1,540,000.00</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax (0%):</span>
                    <span>0.00</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-bold text-sm text-foreground">
                    <span>Total Due:</span>
                    <span className="text-primary font-bold">1,540,000.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

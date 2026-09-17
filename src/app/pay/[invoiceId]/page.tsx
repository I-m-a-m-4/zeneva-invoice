'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc } from '@/firebase/firestore/use-doc';
import { CurrencyAmount } from '@/components/shared/currency-amount';
import { format } from 'date-fns';
import { safeToDate } from '@/lib/utils';
import { CreditCard, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PublicInvoicePage() {
  const params = useParams();
  const invoiceId = params.invoiceId as string;
  const [isPaying, setIsPaying] = React.useState(false);

  // Fetch the invoice document publicly (ensure Firestore rules allow read for this doc)
  const { data: invoice, loading, error } = useDoc(`receipts/${invoiceId}`);

  const handlePay = async () => {
    if (!invoice) return;
    setIsPaying(true);
    
    try {
      const response = await fetch('/api/payments/flutterwave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.total,
          email: invoice.customer?.email || 'customer@example.com',
          name: invoice.customer?.name || 'Customer',
          phone: invoice.customer?.phone || '',
          currency: 'NGN' // Assuming NGN for Flutterwave, can be dynamic
        }),
      });

      const data = await response.json();
      
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        alert(data.error || 'Payment initialization failed');
        setIsPaying(false);
      }
    } catch (err) {
      alert('Network error initializing payment.');
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
             <Skeleton className="h-8 w-1/2 mb-2" />
             <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-lg text-center border-destructive">
          <CardContent className="pt-6 flex flex-col items-center">
             <AlertCircle className="h-12 w-12 text-destructive mb-4" />
             <h2 className="text-xl font-bold mb-2">Invoice Not Found</h2>
             <p className="text-muted-foreground">The invoice you are looking for does not exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';
  const rNumber = invoice.receiptNumber || `INV-${invoiceId.substring(0, 8)}`;
  const date = format(safeToDate(invoice.createdAt), 'MMMM d, yyyy');

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center pb-8 border-b">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <span className="text-primary font-bold text-xl">Z</span>
          </div>
          <CardTitle className="text-2xl">Invoice {rNumber}</CardTitle>
          <CardDescription>Billed to {invoice.customer?.name || 'Customer'}</CardDescription>
        </CardHeader>

        <CardContent className="pt-8 space-y-6">
          <div className="flex justify-between items-center">
             <span className="text-muted-foreground">Status</span>
             {isPaid ? (
               <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" /> Paid</Badge>
             ) : (
               <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">Awaiting Payment</Badge>
             )}
          </div>
          
          <div className="flex justify-between items-center">
             <span className="text-muted-foreground">Date Issued</span>
             <span className="font-medium">{date}</span>
          </div>

          <div className="flex justify-between items-center border-t border-b py-4 my-4">
             <span className="text-lg font-semibold">Total Due</span>
             <span className="text-2xl font-bold">
               <CurrencyAmount amount={invoice.total} currency={invoice.currency || 'NGN'} />
             </span>
          </div>

          {invoice.description && (
             <div>
                <span className="text-sm font-semibold text-muted-foreground">Description</span>
                <p className="text-sm mt-1">{invoice.description}</p>
             </div>
          )}

          {invoice.items && invoice.items.length > 0 && (
             <div className="space-y-2">
               <span className="text-sm font-semibold text-muted-foreground">Line Items</span>
               {invoice.items.map((item: any, i: number) => (
                 <div key={i} className="flex justify-between text-sm">
                   <span>{item.quantity}x {item.name || 'Item'}</span>
                   <CurrencyAmount amount={item.price * item.quantity} currency={invoice.currency || 'NGN'} />
                 </div>
               ))}
             </div>
          )}
        </CardContent>

        <CardFooter className="flex-col gap-3 bg-muted/50 rounded-b-xl">
           {isPaid ? (
             <Button className="w-full bg-green-600 hover:bg-green-700 text-white" disabled>
               <CheckCircle className="mr-2 h-4 w-4" />
               Invoice Paid
             </Button>
           ) : (
             <Button className="w-full" size="lg" onClick={handlePay} disabled={isPaying}>
               {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
               Pay with Flutterwave
             </Button>
           )}
           <p className="text-xs text-muted-foreground text-center">
             Secured by Flutterwave. Payments are encrypted and processed safely.
           </p>
        </CardFooter>
      </Card>
    </div>
  );
}

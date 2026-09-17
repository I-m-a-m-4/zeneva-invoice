import { NextResponse } from 'next/server';

// We'll use standard fetch to call OpenAI directly to avoid dependency issues
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const threadContent = payload.text || payload.content || JSON.stringify(payload);

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json({ error: 'OpenAI API key missing' }, { status: 500 });
    }

    const systemPrompt = `You are an AI assistant that parses unstructured conversation threads (e.g. from Slack/Email) and extracts invoice data.
Extract the following fields into JSON:
- customerName: string
- description: string
- totalAmount: number
- currency: string (e.g., USD, NGN)

If a value is not explicitly mentioned, use your best judgment or leave as null.`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please extract invoice details from this thread:\n\n${threadContent}` }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: 'OpenAI API error', details: errorText }, { status: response.status });
    }

    const aiData = await response.json();
    const invoiceData = JSON.parse(aiData.choices[0].message.content);

    // Save to Firestore (Assuming draft_invoices collection)
    // For now we will return it so the UI can preview it, or save via a client/admin SDK
    // Let's assume we have a REST way or the client saves it if this is just an extractor
    
    // We'll return it so Zapier can see it, and ideally we'd save to Firestore here if adminDb is set up.
    
    return NextResponse.json({
      success: true,
      draftInvoice: invoiceData
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

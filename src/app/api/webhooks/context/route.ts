import { NextResponse } from 'next/server';

// We'll use standard fetch to call Groq directly (OpenAI compatible endpoint)
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const threadContent = payload.text || payload.content || JSON.stringify(payload);

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'Groq API key missing' }, { status: 500 });
    }

    const systemPrompt = `You are an AI assistant that parses unstructured conversation threads (e.g. from Slack/Email) and extracts invoice data.
Extract the following fields into JSON:
- customerName: string
- description: string
- totalAmount: number
- currency: string (e.g., USD, NGN)

If a value is not explicitly mentioned, use your best judgment or leave as null.`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please extract invoice details from this thread:\n\n${threadContent}` }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: 'Groq API error', details: errorText }, { status: response.status });
    }

    const aiData = await response.json();
    const invoiceData = JSON.parse(aiData.choices[0].message.content);
    
    return NextResponse.json({
      success: true,
      draftInvoice: invoiceData
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

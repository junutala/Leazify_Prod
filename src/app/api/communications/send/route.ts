import { NextRequest, NextResponse } from 'next/server';

interface Recipient {
  email: string;
  name: string;
}

interface SendEmailRequest {
  recipients: Recipient[];
  subject: string;
  htmlContent: string;
  notificationType: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: SendEmailRequest = await req.json();
    const { recipients, subject, htmlContent } = body;

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
    }
    if (!subject || !htmlContent) {
      return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 });
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Brevo API key not configured' }, { status: 500 });
    }

    // Send in batches of 99 (Brevo limit per request)
    const batchSize = 99;
    const results: { messageId?: string; error?: string }[] = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'Leazify',
            email: 'noreply@leazify.com',
          },
          to: batch,
          subject,
          htmlContent,
          tags: ['bulk-notification', 'propflow'],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        results.push({ error: data.message || `Batch ${Math.floor(i / batchSize) + 1} failed` });
      } else {
        results.push({ messageId: data.messageId });
      }
    }

    const failed = results.filter((r) => r.error);
    const succeeded = results.filter((r) => r.messageId);

    return NextResponse.json({
      success: failed.length === 0,
      sent: succeeded.length * batchSize,
      totalRecipients: recipients.length,
      results,
      ...(failed.length > 0 && { errors: failed.map((f) => f.error) }),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

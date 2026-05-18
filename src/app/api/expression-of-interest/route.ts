import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, company, portfolio_size, message } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const emailPayload = {
      sender: { name: 'Leazify Platform', email: 'junutala@gmail.com' },
      to: [{ email: 'junutala@gmail.com', name: 'Leazify Admin' }],
      replyTo: { email, name },
      subject: `New Landlord Interest: ${name}`,
      htmlContent: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 32px 40px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 4px 0;">New Expression of Interest</h1>
            <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 0;">Submitted via Leazify Landing Page</p>
          </div>
          <div style="padding: 32px 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; width: 40%;">
                  <span style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">Full Name</span>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                  <span style="font-size: 14px; font-weight: 600; color: #111827;">${name}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                  <span style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">Email</span>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                  <a href="mailto:${email}" style="font-size: 14px; font-weight: 600; color: #2563eb;">${email}</a>
                </td>
              </tr>
              ${phone ? `<tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                  <span style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">Phone</span>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                  <span style="font-size: 14px; font-weight: 600; color: #111827;">${phone}</span>
                </td>
              </tr>` : ''}
              ${company ? `<tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                  <span style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">Company</span>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                  <span style="font-size: 14px; font-weight: 600; color: #111827;">${company}</span>
                </td>
              </tr>` : ''}
              ${portfolio_size ? `<tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                  <span style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">Portfolio Size</span>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                  <span style="font-size: 14px; font-weight: 600; color: #111827;">${portfolio_size}</span>
                </td>
              </tr>` : ''}
              ${message ? `<tr>
                <td style="padding: 10px 0;" colspan="2">
                  <span style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 8px;">Message</span>
                  <p style="font-size: 14px; color: #374151; background: #f9fafb; padding: 12px 16px; border-radius: 8px; margin: 0; line-height: 1.6;">${message}</p>
                </td>
              </tr>` : ''}
            </table>
            <div style="margin-top: 24px; padding: 16px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
              <p style="font-size: 12px; color: #166534; margin: 0;">
                <strong>Action Required:</strong> Follow up with this landlord to schedule a demo and onboarding call.
              </p>
            </div>
          </div>
          <p style="text-align: center; font-size: 11px; color: #9ca3af; margin-top: 16px;">
            Sent from Leazify Platform · ${new Date().toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      `,
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Brevo error:', errData);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Expression of interest error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

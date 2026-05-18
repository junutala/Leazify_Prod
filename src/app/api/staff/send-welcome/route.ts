import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, fullName, password, isServiceProvider } = await req.json();

    if (!email || !fullName || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
      return NextResponse.json({ error: 'Brevo API key not configured' }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://propflow2839.builtwithrocket.new';
    const loginUrl = isServiceProvider
      ? `${siteUrl}/service-provider-portal`
      : `${siteUrl}/sign-up-login-screen`;

    const subject = isServiceProvider
      ? 'Your PropFlow Service Provider Account Credentials' :'Your PropFlow Staff Account Credentials';

    const roleLabel = isServiceProvider ? 'Service Provider' : 'Staff Member';
    const portalNote = isServiceProvider
      ? '<p style="font-size: 13px; color: #555;">You can access the Service Provider Portal to view open service requests, submit quotes, and manage your work orders.</p>' :'<p style="font-size: 13px; color: #555;">Please log in and change your password as soon as possible.</p>';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: #0f766e; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Welcome to PropFlow</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">${roleLabel} Account</p>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; padding: 28px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 15px; margin-top: 0;">Hello <strong>${fullName}</strong>,</p>
          <p style="font-size: 14px; color: #555;">Your ${roleLabel.toLowerCase()} account has been created. Here are your login credentials:</p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-size: 13px;"><strong>Email / Username:</strong> ${email}</p>
            <p style="margin: 0; font-size: 13px;"><strong>Password:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px;">${password}</code></p>
          </div>
          ${portalNote}
          <div style="text-align: center; margin: 24px 0;">
            <a href="${loginUrl}" style="background: #0f766e; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">Login to PropFlow</a>
          </div>
          <p style="font-size: 12px; color: #9ca3af; margin-bottom: 0;">If you did not expect this email, please contact your administrator.</p>
        </div>
      </div>
    `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        sender: { name: 'PropFlow', email: 'noreply@propflow.app' },
        to: [{ email, name: fullName }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Brevo send error:', errBody);
      return NextResponse.json({ error: 'Failed to send email', detail: errBody }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('send-welcome error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

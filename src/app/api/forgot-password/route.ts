import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user exists with this email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
    }

    const matchedUser = users?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!matchedUser) {
      // Return success anyway to prevent email enumeration
      return NextResponse.json({ success: true });
    }

    // Generate password reset link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://propflow2839.builtwithrocket.new';
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: matchedUser.email!,
      options: {
        redirectTo: `${siteUrl}/sign-up-login-screen`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json({ error: 'Failed to generate reset link' }, { status: 500 });
    }

    const resetLink = linkData.properties.action_link;

    // Send email via Brevo
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e3a5f; font-size: 24px; margin: 0;">Leazify</h1>
          <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Property Management Platform</p>
        </div>
        <div style="background: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: #111827; font-size: 20px; margin-top: 0;">Reset Your Password</h2>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            We received a request to reset the password for your Leazify account associated with <strong>${email}</strong>.
          </p>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            Click the button below to set a new password. This link will expire in 1 hour.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="background: #1e3a5f; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
            If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
          </p>
          <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${resetLink}" style="color: #1e3a5f; word-break: break-all;">${resetLink}</a>
          </p>
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
          © ${new Date().getFullYear()} Leazify. All rights reserved.
        </p>
      </div>
    `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Leazify', email: 'noreply@leazify.com' },
        to: [{ email: matchedUser.email!, name: matchedUser.user_metadata?.full_name || email }],
        subject: 'Reset your Leazify password',
        htmlContent,
        tags: ['password-reset'],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('Brevo error:', errData);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

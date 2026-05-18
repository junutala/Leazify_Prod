import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email, newPassword, fullName, staffId } = await req.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey || serviceRoleKey === 'your-supabase-service-role-key-here') {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured. Please add it to your environment variables (Supabase Dashboard → Project Settings → API → service_role key).' },
        { status: 500 }
      );
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find the user by email
    const { data: listData, error: listErr } = await adminSupabase.auth.admin.listUsers();
    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 400 });

    const user = listData.users.find(u => u.email === email.toLowerCase());

    let userId: string;

    if (!user) {
      // No auth account exists — create one
      const resolvedName = fullName || email.split('@')[0];
      const { data: newUser, error: createErr } = await adminSupabase.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true,
        user_metadata: { full_name: resolvedName, role: 'staff' },
      });
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });
      userId = newUser.user!.id;

      // Upsert profile
      await adminSupabase.from('user_profiles').upsert(
        { id: userId, email: email.toLowerCase(), full_name: resolvedName, role: 'staff' },
        { onConflict: 'id' }
      );

      // Link staff record
      if (staffId) {
        await adminSupabase.from('staff').update({ user_id: userId }).eq('id', staffId);
      }
      return NextResponse.json({ success: true, created: true });
    }

    // User exists — update password and ensure email is confirmed
    const { error: updateErr } = await adminSupabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName || user.user_metadata?.full_name, role: 'staff' },
    });

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

    userId = user.id;

    // Ensure user_profiles row exists with correct role
    await adminSupabase.from('user_profiles').upsert(
      {
        id: userId,
        email: email.toLowerCase(),
        full_name: fullName || user.user_metadata?.full_name || email.split('@')[0],
        role: 'staff',
      },
      { onConflict: 'id' }
    );

    // Also link user_id to staff record if not already linked
    if (staffId) {
      await adminSupabase.from('staff').update({ user_id: userId }).eq('id', staffId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('reset-password error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

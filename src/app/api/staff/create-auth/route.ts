import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, staffId } = await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey || serviceRoleKey === 'your-supabase-service-role-key-here') {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured. Please add it to your environment variables (Settings → Environment Variables in your Supabase project → Project Settings → API → service_role key).' },
        { status: 500 }
      );
    }

    // Use admin client with service role key — creates user without email confirmation
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user already exists — if so, update their password
    const { data: listData } = await adminSupabase.auth.admin.listUsers();
    const existingUser = listData?.users?.find(u => u.email === email.toLowerCase());

    let userId: string;

    if (existingUser) {
      // User already exists — update password and ensure email is confirmed
      const { data: updData, error: updErr } = await adminSupabase.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: 'staff' },
      });
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
      userId = existingUser.id;
    } else {
      // Create new user
      const { data, error } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: 'staff' },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      userId = data.user!.id;
    }

    // Upsert user profile — role must be 'staff' so is_staff_user() recognises them
    const { error: profileErr } = await adminSupabase.from('user_profiles').upsert(
      {
        id: userId,
        email: email.toLowerCase(),
        full_name: fullName,
        role: 'staff',
      },
      { onConflict: 'id' }
    );
    if (profileErr) {
      console.warn('user_profiles upsert warning:', profileErr.message);
    }

    // Link auth user_id back to staff record
    if (staffId) {
      await adminSupabase.from('staff').update({ user_id: userId }).eq('id', staffId);
    }

    return NextResponse.json({ success: true, userId });
  } catch (err: any) {
    console.error('staff create-auth error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

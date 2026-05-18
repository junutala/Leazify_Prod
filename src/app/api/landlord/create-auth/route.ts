import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, personId } = await req.json();

    if (!email || !password || !fullName || !personId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      // Fallback: use anon key signUp
      const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role: 'landlord' },
        },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      if (data.user) {
        await supabase.from('user_profiles').upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          role: 'landlord',
        });
        // Link person_id back to persons table
        await supabase.from('persons').update({ user_id: data.user.id }).eq('id', personId);
      }
      return NextResponse.json({ success: true, userId: data.user?.id });
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user already exists
    const { data: listData } = await adminSupabase.auth.admin.listUsers();
    const existingUser = listData?.users.find(u => u.email === email.toLowerCase());

    if (existingUser) {
      return NextResponse.json({ error: 'A portal account already exists for this email address.' }, { status: 409 });
    }

    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: 'landlord' },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    if (data.user) {
      await adminSupabase.from('user_profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: 'landlord',
      });
      // Link auth user_id back to persons table
      await adminSupabase.from('persons').update({ user_id: data.user.id }).eq('id', personId);
    }

    return NextResponse.json({ success: true, userId: data.user?.id });
  } catch (err: any) {
    console.error('landlord create-auth error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

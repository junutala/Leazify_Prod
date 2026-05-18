import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, providerId } = await req.json();

    if (!email || !password || !fullName || !providerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use service role key for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      // Fallback: use anon key signUp (user will need email confirmation)
      const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role: 'viewer' },
        },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      // Link provider_id in user_profiles if user was created
      if (data.user) {
        await supabase.from('user_profiles').upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          role: 'viewer',
          provider_id: providerId,
        });
      }
      return NextResponse.json({ success: true, userId: data.user?.id });
    }

    // Use admin client with service role key
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: 'viewer' },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Link provider_id in user_profiles
    if (data.user) {
      await adminSupabase.from('user_profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: 'viewer',
        provider_id: providerId,
      });
    }

    return NextResponse.json({ success: true, userId: data.user?.id });
  } catch (err: any) {
    console.error('create-auth error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

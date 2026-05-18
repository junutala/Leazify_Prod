import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function buildSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function buildAuthedSupabaseClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return { user: null, accessToken: null, error: 'No authorization token provided' };
  }

  const supabase = buildSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null, accessToken: null, error: 'Invalid or expired token' };
  }

  return { user, accessToken: token, error: null };
}

export async function POST(request: NextRequest) {
  try {
    const { user, accessToken, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user || !accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = buildAuthedSupabaseClient(accessToken);
    const body = await request.json();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    const payload = {
      ...body,
      created_by: profile ? user.id : null,
    };

    const { data: unit, error } = await supabase
      .from('units')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ unit }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, accessToken, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user || !accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = buildAuthedSupabaseClient(accessToken);
    const { searchParams } = new URL(request.url);
    const floorId = searchParams.get('floor_id');

    let query = supabase.from('units').select('*').order('unit_number');
    if (floorId) query = query.eq('floor_id', floorId);

    const { data: units, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ units: units || [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

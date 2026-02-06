import { NextResponse } from 'next/server';
import { getServiceClient, getSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const supabase = getServiceClient() || getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const url = new URL(request.url);
    const fingerprint = url.searchParams.get('fingerprint');

    if (!fingerprint) {
      return NextResponse.json({ error: 'fingerprint query param required' }, { status: 400 });
    }

    const { data: votes, error } = await supabase
      .from('votes')
      .select('id, poem_id, voter_fingerprint, created_at')
      .eq('voter_fingerprint', fingerprint);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ fingerprint, count: votes?.length || 0, votes: votes || [] });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

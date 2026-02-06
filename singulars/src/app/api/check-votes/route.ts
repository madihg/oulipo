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
    const poemIdsParam = url.searchParams.get('poem_ids');

    if (!fingerprint) {
      return NextResponse.json({ error: 'fingerprint query param required' }, { status: 400 });
    }

    // If poem_ids provided, check for votes on specific poems and return vote counts
    if (poemIdsParam) {
      const poemIds = poemIdsParam.split(',').filter(Boolean);

      // Check existing votes for these poems
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('id, poem_id')
        .eq('voter_fingerprint', fingerprint)
        .in('poem_id', poemIds);

      if (votesError) {
        return NextResponse.json({ error: votesError.message }, { status: 500 });
      }

      // Get current vote counts for these poems
      const { data: poems, error: poemsError } = await supabase
        .from('poems')
        .select('id, vote_count')
        .in('id', poemIds);

      if (poemsError) {
        return NextResponse.json({ error: poemsError.message }, { status: 500 });
      }

      const voteCounts = (poems || []).reduce(
        (acc, p) => ({ ...acc, [p.id]: p.vote_count }),
        {} as Record<string, number>
      );

      const votedPoemId = votes && votes.length > 0 ? votes[0].poem_id : null;

      return NextResponse.json({
        fingerprint,
        voted_poem_id: votedPoemId,
        vote_counts: voteCounts,
        has_voted: !!votedPoemId,
      });
    }

    // Fallback: return all votes for this fingerprint
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

import { NextResponse } from 'next/server';
import { getServiceClient, getSupabase } from '@/lib/supabase';

// Simple in-memory rate limiter (per serverless invocation)
const rateLimitMap: Record<string, { count: number; resetTime: number }> = {};
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 votes per minute per fingerprint

function isRateLimited(fingerprint: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap[fingerprint];

  if (!entry || now > entry.resetTime) {
    rateLimitMap[fingerprint] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(request: Request) {
  try {
    const supabase = getServiceClient() || getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { poem_id, fingerprint } = body;

    if (!poem_id || !fingerprint) {
      return NextResponse.json(
        { error: 'Missing required fields: poem_id and fingerprint' },
        { status: 400 }
      );
    }

    // Rate limiting check
    if (isRateLimited(fingerprint)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before voting again.' },
        { status: 429 }
      );
    }

    // Get the poem and its performance from Supabase
    const { data: poem, error: poemError } = await supabase
      .from('poems')
      .select('id, performance_id, theme_slug, vote_count')
      .eq('id', poem_id)
      .single();

    if (poemError || !poem) {
      return NextResponse.json(
        { error: 'Poem not found' },
        { status: 404 }
      );
    }

    // Get the performance to check status
    const { data: performance, error: perfError } = await supabase
      .from('performances')
      .select('id, status')
      .eq('id', poem.performance_id)
      .single();

    if (perfError || !performance) {
      return NextResponse.json(
        { error: 'Performance not found' },
        { status: 404 }
      );
    }

    // Get both poems in the pair (same performance + same theme)
    const { data: poemPair, error: pairError } = await supabase
      .from('poems')
      .select('id, vote_count, author_type')
      .eq('performance_id', poem.performance_id)
      .eq('theme_slug', poem.theme_slug);

    if (pairError || !poemPair) {
      return NextResponse.json(
        { error: 'Failed to fetch poem pair' },
        { status: 500 }
      );
    }

    // Check if fingerprint already voted on either poem in this pair
    const poemIds = poemPair.map((p) => p.id);
    const { data: existingVotes, error: voteCheckError } = await supabase
      .from('votes')
      .select('id, poem_id')
      .eq('voter_fingerprint', fingerprint)
      .in('poem_id', poemIds);

    if (voteCheckError) {
      console.error('Error checking existing votes:', voteCheckError);
      return NextResponse.json(
        { error: 'Failed to check existing votes' },
        { status: 500 }
      );
    }

    // If already voted or performance is not training, return current counts
    if ((existingVotes && existingVotes.length > 0) || performance.status !== 'training') {
      const voteCounts = poemPair.reduce(
        (acc, p) => ({ ...acc, [p.id]: p.vote_count }),
        {} as Record<string, number>
      );

      return NextResponse.json({
        success: false,
        duplicate: existingVotes && existingVotes.length > 0,
        status: performance.status,
        message: existingVotes && existingVotes.length > 0
          ? 'Already voted on this poem pair'
          : `Training is ${performance.status}`,
        vote_counts: voteCounts,
        voted_poem_id: existingVotes?.[0]?.poem_id || null,
      });
    }

    // Cast the vote using Supabase RPC for atomic operation
    const { error: rpcError } = await supabase.rpc('cast_vote', {
      p_poem_id: poem_id,
      p_fingerprint: fingerprint,
    });

    if (rpcError) {
      // Handle unique constraint violation (race condition duplicate)
      if (rpcError.code === '23505') {
        const voteCounts = poemPair.reduce(
          (acc, p) => ({ ...acc, [p.id]: p.vote_count }),
          {} as Record<string, number>
        );
        return NextResponse.json({
          success: false,
          duplicate: true,
          message: 'Already voted on this poem pair',
          vote_counts: voteCounts,
        });
      }

      console.error('Error casting vote:', rpcError);
      return NextResponse.json(
        { error: 'Failed to cast vote' },
        { status: 500 }
      );
    }

    // Fetch updated vote counts after successful vote
    const { data: updatedPair, error: updatedError } = await supabase
      .from('poems')
      .select('id, vote_count, author_type')
      .eq('performance_id', poem.performance_id)
      .eq('theme_slug', poem.theme_slug);

    if (updatedError || !updatedPair) {
      return NextResponse.json(
        { error: 'Vote recorded but failed to fetch updated counts' },
        { status: 500 }
      );
    }

    const voteCounts = updatedPair.reduce(
      (acc, p) => ({ ...acc, [p.id]: p.vote_count }),
      {} as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      duplicate: false,
      status: 'training',
      message: 'Vote recorded successfully',
      vote_counts: voteCounts,
      voted_poem_id: poem_id,
    });
  } catch (err) {
    console.error('Unexpected error in vote API:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

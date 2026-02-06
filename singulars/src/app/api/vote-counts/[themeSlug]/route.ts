import { NextResponse } from 'next/server';
import { getServiceClient, getSupabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { themeSlug: string } }
) {
  try {
    const supabase = getServiceClient() || getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const { themeSlug } = params;

    // Get the performance slug from query params (optional, for disambiguation)
    const url = new URL(request.url);
    const performanceSlug = url.searchParams.get('performance');

    let query = supabase
      .from('poems')
      .select('id, vote_count, author_type, theme_slug, performance_id')
      .eq('theme_slug', themeSlug);

    // If performance slug is provided, filter by it
    if (performanceSlug) {
      const { data: performance, error: perfError } = await supabase
        .from('performances')
        .select('id')
        .eq('slug', performanceSlug)
        .single();

      if (perfError || !performance) {
        return NextResponse.json(
          { error: 'Performance not found' },
          { status: 404 }
        );
      }

      query = query.eq('performance_id', performance.id);
    }

    const { data: poems, error } = await query;

    if (error) {
      console.error('Error fetching vote counts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vote counts' },
        { status: 500 }
      );
    }

    if (!poems || poems.length === 0) {
      return NextResponse.json(
        { error: 'No poems found for this theme' },
        { status: 404 }
      );
    }

    const voteCounts = poems.reduce(
      (acc, p) => ({ ...acc, [p.id]: { vote_count: p.vote_count, author_type: p.author_type } }),
      {} as Record<string, { vote_count: number; author_type: string }>
    );

    return NextResponse.json({
      theme_slug: themeSlug,
      poems: voteCounts,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

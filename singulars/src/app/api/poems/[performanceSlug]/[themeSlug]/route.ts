import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { performanceSlug: string; themeSlug: string } }
) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const { performanceSlug, themeSlug } = params;

    // First, get the performance by slug from Supabase
    const { data: performance, error: perfError } = await supabase
      .from('performances')
      .select('id, name, slug, color, status')
      .eq('slug', performanceSlug)
      .single();

    if (perfError) {
      if (perfError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Performance not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching performance:', perfError);
      return NextResponse.json(
        { error: 'Failed to fetch performance' },
        { status: 500 }
      );
    }

    // Fetch the poem pair for this theme from Supabase
    const { data: poems, error: poemsError } = await supabase
      .from('poems')
      .select('*')
      .eq('performance_id', performance.id)
      .eq('theme_slug', themeSlug);

    if (poemsError) {
      console.error('Error fetching poems:', poemsError);
      return NextResponse.json(
        { error: 'Failed to fetch poems' },
        { status: 500 }
      );
    }

    if (!poems || poems.length === 0) {
      return NextResponse.json(
        { error: 'Poem pair not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      performance,
      poems,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

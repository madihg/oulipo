import { NextResponse } from 'next/server';
import { getServiceClient, getSupabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = getServiceClient() || getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const { slug } = params;

    // Fetch the performance by slug from Supabase
    const { data: performance, error: perfError } = await supabase
      .from('performances')
      .select('*')
      .eq('slug', slug)
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

    // Fetch poems for this performance from Supabase
    const { data: poems, error: poemsError } = await supabase
      .from('poems')
      .select('*')
      .eq('performance_id', performance.id)
      .order('theme_slug', { ascending: true });

    if (poemsError) {
      console.error('Error fetching poems:', poemsError);
      return NextResponse.json(
        { error: 'Failed to fetch poems' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...performance,
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

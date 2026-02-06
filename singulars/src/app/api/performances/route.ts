import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const { data: performances, error } = await supabase
      .from('performances')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching performances:', error);
      return NextResponse.json(
        { error: 'Failed to fetch performances' },
        { status: 500 }
      );
    }

    return NextResponse.json(performances);
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

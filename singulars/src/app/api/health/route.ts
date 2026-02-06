import { NextResponse } from 'next/server';
import { getServiceClient, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'not_configured',
        message: 'Supabase environment variables are not set. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  const serviceClient = getServiceClient();
  if (!serviceClient) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'not_configured',
        message: 'SUPABASE_SERVICE_ROLE_KEY is not set.',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  try {
    // Test database connectivity by querying a simple value
    const { error } = await serviceClient
      .from('performances')
      .select('id')
      .limit(1);

    if (error) {
      // If the table doesn't exist, still report as connected but schema not applied
      if (error.code === '42P01') {
        return NextResponse.json(
          {
            status: 'partial',
            database: 'connected',
            schema: 'not_applied',
            message: 'Database is connected but schema has not been applied yet.',
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          status: 'error',
          database: 'error',
          message: `Database query failed: ${error.message}`,
          code: error.code,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Check all required tables exist
    const tables = ['performances', 'poems', 'votes'];
    const tableStatus: Record<string, boolean> = {};

    for (const table of tables) {
      const { error: tableError } = await serviceClient
        .from(table)
        .select('id')
        .limit(1);
      tableStatus[table] = !tableError;
    }

    const allTablesExist = Object.values(tableStatus).every(Boolean);

    return NextResponse.json(
      {
        status: allTablesExist ? 'healthy' : 'partial',
        database: 'connected',
        schema: allTablesExist ? 'applied' : 'partial',
        tables: tableStatus,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'unreachable',
        message: err instanceof Error ? err.message : 'Unknown error connecting to database',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

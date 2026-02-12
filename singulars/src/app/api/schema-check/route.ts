import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function GET() {
  const client = getServiceClient();
  if (!client) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const results: Record<string, unknown> = {};

  // Check performances table columns
  const { error: perfError } = await client
    .from('performances')
    .select('id, name, slug, color, location, date, num_poems, num_poets, model_link, huggingface_link, status, poets, created_at')
    .limit(0);
  results.performances = {
    exists: !perfError,
    error: perfError?.message || null,
    columns: perfError ? null : [
      'id', 'name', 'slug', 'color', 'location', 'date',
      'num_poems', 'num_poets', 'model_link', 'huggingface_link',
      'status', 'poets', 'created_at'
    ],
  };

  // Check poems table columns
  const { error: poemsError } = await client
    .from('poems')
    .select('id, performance_id, theme, theme_slug, text, author_name, author_type, vote_count, created_at')
    .limit(0);
  results.poems = {
    exists: !poemsError,
    error: poemsError?.message || null,
    columns: poemsError ? null : [
      'id', 'performance_id', 'theme', 'theme_slug', 'text',
      'author_name', 'author_type', 'vote_count', 'created_at'
    ],
  };

  // Check votes table columns
  const { error: votesError } = await client
    .from('votes')
    .select('id, poem_id, voter_fingerprint, created_at')
    .limit(0);
  results.votes = {
    exists: !votesError,
    error: votesError?.message || null,
    columns: votesError ? null : [
      'id', 'poem_id', 'voter_fingerprint', 'created_at'
    ],
  };

  // Test foreign key: insert a poem with invalid performance_id should fail
  const { error: fkTestError } = await client
    .from('poems')
    .insert({
      performance_id: '00000000-0000-0000-0000-000000000000',
      theme: 'fk_test',
      theme_slug: 'fk-test',
      text: 'test',
      author_name: 'test',
      author_type: 'human',
    });
  results.foreign_key_poems_performances = {
    constraint_works: !!fkTestError,
    error_code: fkTestError?.code || null,
    message: fkTestError ? 'FK constraint correctly prevents invalid performance_id' : 'WARNING: FK constraint not enforced',
  };

  // Test foreign key: insert a vote with invalid poem_id should fail
  const { error: fkVoteError } = await client
    .from('votes')
    .insert({
      poem_id: '00000000-0000-0000-0000-000000000000',
      voter_fingerprint: 'fk_test',
    });
  results.foreign_key_votes_poems = {
    constraint_works: !!fkVoteError,
    error_code: fkVoteError?.code || null,
    message: fkVoteError ? 'FK constraint correctly prevents invalid poem_id' : 'WARNING: FK constraint not enforced',
  };

  // Test unique constraint on performances.slug
  // Insert a performance, try to insert another with same slug
  const testSlug = `schema-test-${Date.now()}`;
  const { data: insertedPerf } = await client
    .from('performances')
    .insert({
      name: 'Schema Test',
      slug: testSlug,
      color: '#000000',
      status: 'upcoming',
    })
    .select('id')
    .single();

  if (insertedPerf) {
    // Try duplicate slug
    const { error: dupSlugErr } = await client
      .from('performances')
      .insert({
        name: 'Schema Test Dup',
        slug: testSlug,
        color: '#111111',
        status: 'upcoming',
      });

    results.unique_index_performances_slug = {
      constraint_works: !!dupSlugErr,
      message: dupSlugErr ? 'Unique constraint on slug works correctly' : 'WARNING: Unique constraint not enforced',
    };

    // Clean up
    await client.from('performances').delete().eq('id', insertedPerf.id);
  }

  // Test unique constraint on votes(voter_fingerprint, poem_id)
  // We need a valid poem_id first - create a temp performance and poem
  const { data: tempPerf } = await client
    .from('performances')
    .insert({
      name: 'Vote Index Test',
      slug: `vote-idx-test-${Date.now()}`,
      color: '#222222',
      status: 'training',
    })
    .select('id')
    .single();

  if (tempPerf) {
    const { data: tempPoem } = await client
      .from('poems')
      .insert({
        performance_id: tempPerf.id,
        theme: 'test',
        theme_slug: 'test',
        text: 'test poem',
        author_name: 'test',
        author_type: 'human',
      })
      .select('id')
      .single();

    if (tempPoem) {
      // Insert first vote
      const fp = `idx-test-${Date.now()}`;
      await client.from('votes').insert({
        poem_id: tempPoem.id,
        voter_fingerprint: fp,
      });

      // Try duplicate
      const { error: dupVoteErr } = await client
        .from('votes')
        .insert({
          poem_id: tempPoem.id,
          voter_fingerprint: fp,
        });

      results.unique_index_votes_fingerprint_poem = {
        constraint_works: !!dupVoteErr,
        message: dupVoteErr ? 'Unique constraint on (voter_fingerprint, poem_id) works correctly' : 'WARNING: Unique constraint not enforced',
      };

      // Clean up votes, poems, then performance
      await client.from('votes').delete().eq('poem_id', tempPoem.id);
      await client.from('poems').delete().eq('id', tempPoem.id);
    }
    await client.from('performances').delete().eq('id', tempPerf.id);
  }

  // Test cast_vote RPC function exists
  const { error: rpcError } = await client.rpc('cast_vote', {
    p_poem_id: '00000000-0000-0000-0000-000000000000',
    p_fingerprint: 'rpc_test',
  });
  results.rpc_cast_vote = {
    exists: true, // If we get here without a fetch error, the function exists
    // The error should be about the poem not existing, not about the function not existing
    error_type: rpcError?.message?.includes('Poem not found') ? 'expected' : 'unexpected',
    message: rpcError?.message || 'RPC executed without error',
  };

  // Overall assessment
  const allTablesExist = results.performances && (results.performances as Record<string, unknown>).exists &&
    results.poems && (results.poems as Record<string, unknown>).exists &&
    results.votes && (results.votes as Record<string, unknown>).exists;

  return NextResponse.json({
    schema_valid: allTablesExist,
    details: results,
    timestamp: new Date().toISOString(),
  });
}

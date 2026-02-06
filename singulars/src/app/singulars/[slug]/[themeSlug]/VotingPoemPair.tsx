'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFingerprint } from '@/lib/fingerprint';

interface Poem {
  id: string;
  performance_id: string;
  theme: string;
  theme_slug: string;
  text: string;
  author_name: string;
  author_type: 'human' | 'machine';
  vote_count: number;
  created_at: string;
}

interface VoteResult {
  success: boolean;
  duplicate: boolean;
  status: string;
  message: string;
  vote_counts: Record<string, number>;
  voted_poem_id: string | null;
}

interface VotingPoemPairProps {
  poems: Poem[];
  performanceColor: string;
  performanceStatus: 'upcoming' | 'training' | 'trained';
}

export default function VotingPoemPair({
  poems,
  performanceColor,
  performanceStatus,
}: VotingPoemPairProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [votedPoemId, setVotedPoemId] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [isVoting, setIsVoting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize vote counts from props
  useEffect(() => {
    const counts: Record<string, number> = {};
    poems.forEach(p => { counts[p.id] = p.vote_count; });
    setVoteCounts(counts);
  }, [poems]);

  // Check for existing votes on mount
  useEffect(() => {
    async function checkExistingVotes() {
      try {
        const fp = await getFingerprint();
        const poemIds = poems.map(p => p.id).join(',');
        const res = await fetch(`/api/check-votes?fingerprint=${fp}&poem_ids=${poemIds}`);
        if (res.ok) {
          const data = await res.json();
          if (data.voted_poem_id) {
            setHasVoted(true);
            setVotedPoemId(data.voted_poem_id);
            if (data.vote_counts) {
              setVoteCounts(data.vote_counts);
            }
          }
        }
      } catch {
        // silently fail - user can still vote
      }
    }
    if (performanceStatus === 'training') {
      checkExistingVotes();
    }
  }, [poems, performanceStatus]);

  const handleVote = useCallback(async (poemId: string) => {
    if (hasVoted || isVoting || performanceStatus !== 'training') return;

    setIsVoting(true);
    setErrorMsg(null);

    try {
      const fp = await getFingerprint();
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poem_id: poemId, fingerprint: fp }),
      });

      const data: VoteResult = await res.json();

      if (data.vote_counts) {
        setVoteCounts(data.vote_counts);
      }

      if (data.success || data.duplicate) {
        setHasVoted(true);
        setVotedPoemId(data.voted_poem_id);
      } else if (!data.success && !data.duplicate) {
        setErrorMsg(data.message || 'Could not register vote');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setIsVoting(false);
    }
  }, [hasVoted, isVoting, performanceStatus]);

  const canVote = performanceStatus === 'training' && !hasVoted && !isVoting;
  const showResults = hasVoted || performanceStatus === 'trained';

  return (
    <div>
      {/* Poems grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
        }}
      >
        {poems.map((poem) => {
          const isVotedPoem = votedPoemId === poem.id;
          const count = voteCounts[poem.id] ?? poem.vote_count;

          return (
            <div
              key={poem.id}
              data-poem-id={poem.id}
              data-author-type={poem.author_type}
              data-voteable={canVote ? 'true' : undefined}
              onClick={() => canVote && handleVote(poem.id)}
              role={canVote ? 'button' : undefined}
              aria-label={canVote ? `Vote for poem by ${poem.author_name}` : `Poem by ${poem.author_name}`}
              tabIndex={canVote ? 0 : undefined}
              onKeyDown={(e) => {
                if (canVote && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleVote(poem.id);
                }
              }}
              style={{
                padding: '2rem',
                border: `2px solid ${
                  isVotedPoem
                    ? performanceColor
                    : poem.author_type === 'machine'
                    ? performanceColor
                    : '#e0e0e0'
                }`,
                borderRadius: '12px',
                backgroundColor: isVotedPoem
                  ? performanceColor + '10'
                  : poem.author_type === 'machine'
                  ? performanceColor + '05'
                  : '#fafafa',
                cursor: canVote
                  ? `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><circle cx='10' cy='10' r='8' fill='${encodeURIComponent(performanceColor)}'/></svg>") 10 10, pointer`
                  : 'default',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                position: 'relative',
                boxShadow: isVotedPoem
                  ? `0 0 0 2px ${performanceColor}40`
                  : 'none',
              }}
            >
              {/* Author info */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color:
                      poem.author_type === 'human' ? '#333' : performanceColor,
                  }}
                >
                  {poem.author_name}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    backgroundColor:
                      poem.author_type === 'human'
                        ? '#e8e8e8'
                        : performanceColor + '20',
                    color:
                      poem.author_type === 'human' ? '#555' : performanceColor,
                  }}
                >
                  {poem.author_type}
                </span>
              </div>

              {/* Poem text */}
              <div
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: '1.05rem',
                  lineHeight: '1.8',
                  whiteSpace: 'pre-line',
                  color: '#333',
                }}
              >
                {poem.text}
              </div>

              {/* Vote results shown after voting or for trained performances */}
              {showResults && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e0e0e0', paddingTop: '1rem' }}>
                  {/* Vote count */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}>
                    <span style={{ fontSize: '0.85rem', color: '#666' }}>
                      {count} {count === 1 ? 'vote' : 'votes'}
                    </span>
                    {isVotedPoem && (
                      <span style={{
                        fontSize: '0.75rem',
                        color: performanceColor,
                        fontWeight: 600,
                      }}>
                        Your vote
                      </span>
                    )}
                  </div>

                  {/* Vote dots */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    alignItems: 'center',
                  }}>
                    {Array.from({ length: Math.min(count, 50) }).map((_, i) => {
                      const isUserDot = isVotedPoem && i === count - 1;
                      return (
                        <div
                          key={i}
                          style={{
                            width: isUserDot ? '10px' : '7px',
                            height: isUserDot ? '10px' : '7px',
                            borderRadius: '50%',
                            backgroundColor: performanceColor,
                            opacity: isUserDot ? 1 : 0.6,
                            boxShadow: isUserDot
                              ? `0 0 0 2px ${performanceColor}40`
                              : 'none',
                          }}
                        />
                      );
                    })}
                    {count > 50 && (
                      <span style={{ fontSize: '0.7rem', color: '#999', marginLeft: '4px' }}>
                        +{count - 50} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Voting state messages */}
      {isVoting && (
        <p style={{
          textAlign: 'center',
          color: '#666',
          fontSize: '0.9rem',
          marginTop: '1.5rem',
        }}>
          Registering your vote...
        </p>
      )}

      {errorMsg && (
        <p style={{
          textAlign: 'center',
          color: '#dc2626',
          fontSize: '0.9rem',
          marginTop: '1.5rem',
        }}>
          {errorMsg}
        </p>
      )}

      {canVote && !isVoting && (
        <p style={{
          textAlign: 'center',
          color: '#999',
          fontSize: '0.85rem',
          marginTop: '1.5rem',
          fontStyle: 'italic',
        }}>
          Click or press Enter on a poem to cast your vote
        </p>
      )}

      {hasVoted && performanceStatus === 'training' && (
        <p style={{
          textAlign: 'center',
          color: performanceColor,
          fontSize: '0.9rem',
          marginTop: '1.5rem',
          fontWeight: 500,
        }}>
          Thank you for voting!
        </p>
      )}
    </div>
  );
}

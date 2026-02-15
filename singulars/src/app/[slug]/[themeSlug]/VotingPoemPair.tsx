'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getFingerprint } from '@/lib/fingerprint';
import { accessibleTextColor } from '@/lib/color-utils';

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

  const a11yColor = useMemo(
    () => accessibleTextColor(performanceColor),
    [performanceColor]
  );

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
        const res = await fetch(`/singulars/api/check-votes?fingerprint=${fp}&poem_ids=${poemIds}`);
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
      const res = await fetch('/singulars/api/vote', {
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
      {/* Instruction text — above poems */}
      {canVote && !isVoting && (
        <p style={{
          textAlign: 'center',
          color: 'rgba(0,0,0,0.5)',
          fontSize: '0.85rem',
          marginBottom: '1.5rem',
        }}>
          Click on the poem you prefer to cast your vote
        </p>
      )}

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
              data-voteable={canVote ? 'true' : undefined}
              onClick={() => canVote && handleVote(poem.id)}
              role={canVote ? 'button' : undefined}
              aria-label={canVote ? 'Vote for this poem' : 'Poem'}
              tabIndex={canVote ? 0 : undefined}
              onKeyDown={(e) => {
                if (canVote && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleVote(poem.id);
                }
              }}
              style={{
                padding: '2rem',
                borderTop: `2px solid ${isVotedPoem ? performanceColor : 'rgba(0,0,0,0.12)'}`,
                cursor: canVote
                  ? `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><circle cx='10' cy='10' r='8' fill='${encodeURIComponent(performanceColor)}'/></svg>") 10 10, pointer`
                  : 'default',
                transition: 'opacity 0.3s ease',
                position: 'relative',
              }}
            >
              {/* Poem text */}
              <div
                style={{
                  fontSize: '1rem',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-line',
                  color: 'rgba(0,0,0,0.85)',
                }}
              >
                {poem.text}
              </div>

              {/* Vote results — always show count; "Your vote" and dots when voted/trained */}
              <div
                aria-live="polite"
                aria-label={`Vote results: ${count} ${count === 1 ? 'vote' : 'votes'}${isVotedPoem ? ', your vote' : ''}`}
                style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.12)', paddingTop: '1rem' }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}>
                  <span style={{
                    fontFamily: '"Diatype Mono Variable", monospace',
                    fontSize: '0.85rem',
                    color: 'rgba(0,0,0,0.6)',
                  }}>
                    {count} {count === 1 ? 'vote' : 'votes'}
                  </span>
                  {showResults && isVotedPoem && (
                      <span style={{
                        fontFamily: '"Diatype Mono Variable", monospace',
                        fontSize: '0.75rem',
                        color: a11yColor,
                        fontWeight: 600,
                      }}>
                        Your vote
                      </span>
                    )}
                  </div>

                {/* Vote dots — show when voted or trained */}
                {showResults && (
                  <div
                    aria-hidden="true"
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px',
                      alignItems: 'center',
                    }}
                  >
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
                            opacity: isUserDot ? 1 : 0.85,
                          }}
                        />
                      );
                    })}
                    {count > 50 && (
                      <span style={{
                        fontFamily: '"Diatype Mono Variable", monospace',
                        fontSize: '0.7rem',
                        color: 'rgba(0,0,0,0.5)',
                        marginLeft: '4px',
                      }}>
                        +{count - 50} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Voting state messages */}
      {isVoting && (
        <p
          aria-live="assertive"
          role="status"
          style={{
            textAlign: 'center',
            color: 'rgba(0,0,0,0.6)',
            fontSize: '0.9rem',
            marginTop: '1.5rem',
          }}
        >
          Registering your vote...
        </p>
      )}

      {errorMsg && (
        <p
          aria-live="assertive"
          role="alert"
          style={{
            textAlign: 'center',
            color: '#dc2626',
            fontSize: '0.9rem',
            marginTop: '1.5rem',
          }}
        >
          {errorMsg}
        </p>
      )}

      {hasVoted && performanceStatus === 'training' && (
        <p
          aria-live="polite"
          role="status"
          style={{
            textAlign: 'center',
            color: a11yColor,
            fontSize: '0.9rem',
            marginTop: '1.5rem',
            fontWeight: 500,
          }}
        >
          Thank you for voting!
        </p>
      )}
    </div>
  );
}

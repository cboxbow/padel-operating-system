import type { MatchSet, ScheduledMatch } from './types';

export type LiveScoreDraft = {
  tournamentId: string;
  matchId: string;
  sets: MatchSet[];
  updatedAt: number;
};

const STORAGE_KEY = 'mpl_live_score_draft';

export function publishLiveScoreDraft(match: ScheduledMatch, sets: MatchSet[]) {
  if (typeof window === 'undefined') return;
  const draft: LiveScoreDraft = {
    tournamentId: match.tournamentId,
    matchId: match.id,
    sets,
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  window.dispatchEvent(new CustomEvent('mpl-live-score-draft', { detail: draft }));
}

export function clearLiveScoreDraft(matchId?: string) {
  if (typeof window === 'undefined') return;
  const current = readLiveScoreDraft();
  if (matchId && current?.matchId !== matchId) return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('mpl-live-score-draft', { detail: null }));
}

export function readLiveScoreDraft(): LiveScoreDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LiveScoreDraft;
  } catch {
    return null;
  }
}

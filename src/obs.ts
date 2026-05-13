import type { AppView } from './types';

export function isOBSView(view: AppView | string | null | undefined): view is 'obs_main_draw' | 'obs_pools' | 'obs_scores' {
  return view === 'obs_main_draw' || view === 'obs_pools' || view === 'obs_scores';
}

export function openOBSWindow(view: 'obs_main_draw' | 'obs_pools' | 'obs_scores', tournamentId?: string | null) {
  const url = new URL(window.location.href);
  url.searchParams.set('view', view);
  if (tournamentId) {
    url.searchParams.set('tournament', tournamentId);
  }
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
}

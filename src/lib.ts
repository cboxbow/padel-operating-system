import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TournamentStatus, RegistrationStatus, DrawSessionStatus } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-MU', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-MU', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function getTournamentStatusLabel(status: TournamentStatus): string {
  const map: Record<TournamentStatus, string> = {
    draft: 'Draft',
    registration_open: 'Reg. Open',
    registration_closed: 'Reg. Closed',
    draw_preparation: 'Draw Prep',
    pool_draw_ready: 'Pool Draw',
    pool_published: 'Pools Live',
    matches_ongoing: 'Ongoing',
    main_draw_ready: 'Main Draw',
    main_draw_published: 'Main Draw Live',
    locked: 'Locked',
    completed: 'Completed',
  };
  return map[status] ?? status;
}

export function getRegistrationStatusLabel(status: RegistrationStatus): string {
  const map: Record<RegistrationStatus, string> = {
    pending: 'Pending',
    validated: 'Validated',
    rejected: 'Rejected',
    waitlisted: 'Waitlisted',
  };
  return map[status] ?? status;
}

export function getDrawStatusLabel(status: DrawSessionStatus): string {
  const map: Record<DrawSessionStatus, string> = {
    draft: 'Draft',
    published: 'Published',
    locked: 'Locked',
  };
  return map[status] ?? status;
}

export function tournamentStatusClass(status: TournamentStatus): string {
  if (status === 'draft') return 'status-draft';
  if (status === 'registration_open' || status === 'registration_closed') return 'status-pending';
  if (status === 'draw_preparation' || status === 'pool_draw_ready' || status === 'main_draw_ready') return 'status-ready';
  if (status === 'pool_published' || status === 'main_draw_published' || status === 'matches_ongoing') return 'status-published';
  if (status === 'locked' || status === 'completed') return 'status-locked';
  return 'status-draft';
}

export function registrationStatusClass(status: RegistrationStatus): string {
  if (status === 'validated') return 'status-published';
  if (status === 'pending') return 'status-pending';
  if (status === 'rejected') return 'status-locked';
  if (status === 'waitlisted') return 'status-ready';
  return 'status-draft';
}

export function drawStatusClass(status: DrawSessionStatus): string {
  if (status === 'draft') return 'status-draft';
  if (status === 'published') return 'status-published';
  if (status === 'locked') return 'status-locked';
  return 'status-draft';
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

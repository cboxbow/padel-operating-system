import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { ToastMessage } from './types';
import { generateId } from './lib';

// ─── Toast Context ────────────────────────────────────────────────────────────
interface ToastContextValue {
  toasts: ToastMessage[];
  addToast: (t: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  addToast: () => undefined,
  removeToast: () => undefined,
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((t: Omit<ToastMessage, 'id'>) => {
    const id = generateId();
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(x => x.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// ─── App State Context ────────────────────────────────────────────────────────
import type { AppView, Tournament, Pool, Team } from './types';
import { createTournament, fetchTournaments, type CreateTournamentInput } from './data/tournaments';
import { fetchRegistrations, updateRegistrationStatus } from './data/registrations';
import { updateTeamSeed } from './data/teams';
import { fetchPools, updatePoolSlotAssignment, updatePoolSlotLock, updatePoolStatus } from './data/pools';
import { fetchMatches, saveMatchScore, updateMatchSchedule } from './data/matches';
import { supabase } from './supabaseClient';

interface AppState {
  currentView: AppView;
  selectedTournamentId: string | null;
  selectedTournament: Tournament | null;
  selectedPoolId: string | null;
  tournaments: Tournament[];
  isLoadingTournaments: boolean;
  tournamentsError: string | null;
}

interface AppStateContextValue extends AppState {
  navigate: (view: AppView, tournamentId?: string, poolId?: string) => void;
  setSelectedPool: (poolId: string | null) => void;
  refreshTournaments: () => Promise<void>;
  addTournament: (input: CreateTournamentInput) => Promise<void>;
}

const AppStateContext = createContext<AppStateContextValue>({
  currentView: 'dashboard',
  selectedTournamentId: null,
  selectedTournament: null,
  selectedPoolId: null,
  tournaments: [],
  isLoadingTournaments: false,
  tournamentsError: null,
  navigate: () => undefined,
  setSelectedPool: () => undefined,
  refreshTournaments: async () => undefined,
  addTournament: async () => undefined,
});

import { MOCK_TOURNAMENTS } from './mockData';

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentView: 'dashboard',
    selectedTournamentId: null,
    selectedTournament: null,
    selectedPoolId: null,
    tournaments: MOCK_TOURNAMENTS,
    isLoadingTournaments: true,
    tournamentsError: null,
  });

  const refreshTournaments = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingTournaments: true, tournamentsError: null }));
    try {
      const liveTournaments = await fetchTournaments();
      setState(prev => {
        const tournaments = liveTournaments.length > 0 ? liveTournaments : MOCK_TOURNAMENTS;
        const selectedTournament = prev.selectedTournamentId
          ? tournaments.find(t => t.id === prev.selectedTournamentId) ?? prev.selectedTournament
          : prev.selectedTournament;

        return {
          ...prev,
          tournaments,
          selectedTournament,
          isLoadingTournaments: false,
          tournamentsError: liveTournaments.length > 0 ? null : 'Supabase connected, no tournaments yet. Showing mock data.',
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load tournaments.';
      setState(prev => ({
        ...prev,
        tournaments: MOCK_TOURNAMENTS,
        isLoadingTournaments: false,
        tournamentsError: message,
      }));
    }
  }, []);

  useEffect(() => {
    void refreshTournaments();
  }, [refreshTournaments]);

  const navigate = useCallback((view: AppView, tournamentId?: string, poolId?: string) => {
    const tournament = tournamentId
      ? state.tournaments.find(t => t.id === tournamentId) ?? null
      : null;
    setState(prev => ({
      ...prev,
      currentView: view,
      selectedTournamentId: tournamentId ?? prev.selectedTournamentId,
      selectedTournament: tournament ?? prev.selectedTournament,
      selectedPoolId: poolId ?? prev.selectedPoolId,
    }));
  }, [state.tournaments]);

  const setSelectedPool = useCallback((poolId: string | null) => {
    setState(prev => ({ ...prev, selectedPoolId: poolId }));
  }, []);

  const addTournament = useCallback(async (input: CreateTournamentInput) => {
    const tournament = await createTournament(input);
    setState(prev => ({
      ...prev,
      tournaments: [tournament, ...prev.tournaments],
      tournamentsError: null,
    }));
  }, []);

  return (
    <AppStateContext.Provider value={{ ...state, navigate, setSelectedPool, refreshTournaments, addTournament }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppStateContext);
}

// ─── Tournament Data Context (with mutable state) ─────────────────────────────
import type { Registration, AuditLog, AdminOverride, ScheduledMatch, MatchSet } from './types';
import {
  MOCK_REGISTRATIONS, MOCK_POOLS, MOCK_AUDIT_LOGS, MOCK_OVERRIDES, MOCK_STANDINGS, MOCK_SCHEDULED_MATCHES
} from './mockData';
import type { PoolStanding } from './types';

interface TournamentDataContextValue {
  registrations: Registration[];
  pools: Pool[];
  standings: PoolStanding[];
  matches: ScheduledMatch[];
  auditLogs: AuditLog[];
  overrides: AdminOverride[];
  registrationsError: string | null;
  poolsError: string | null;
  matchesError: string | null;
  validateRegistration: (regId: string) => Promise<void>;
  rejectRegistration: (regId: string, reason: string) => Promise<void>;
  refreshRegistrations: () => Promise<void>;
  updatePoolSlot: (poolId: string, position: number, team: Team | undefined) => Promise<void>;
  toggleSlotLock: (poolId: string, position: number) => Promise<void>;
  redrawPool: (poolId: string, teams: Team[]) => void;
  publishPool: (poolId: string, adminNote: string) => Promise<void>;
  updateSeed: (teamId: string, newSeed: number | undefined, reason: string) => Promise<void>;
  completeMatchScore: (match: ScheduledMatch, sets: MatchSet[], reason?: string) => Promise<void>;
  scheduleMatch: (match: ScheduledMatch, scheduledAt: string, courtNumber: number | undefined) => Promise<void>;
  refreshMatches: () => Promise<void>;
  overrideStanding: (teamId: string, newPosition: number, reason: string) => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'createdAt'>) => void;
  addOverride: (ov: Omit<AdminOverride, 'id' | 'createdAt'>) => void;
}

const TournamentDataContext = createContext<TournamentDataContextValue>({
  registrations: [],
  pools: [],
  standings: [],
  matches: [],
  auditLogs: [],
  overrides: [],
  registrationsError: null,
  poolsError: null,
  matchesError: null,
  validateRegistration: async () => undefined,
  rejectRegistration: async () => undefined,
  refreshRegistrations: async () => undefined,
  updatePoolSlot: async () => undefined,
  toggleSlotLock: async () => undefined,
  redrawPool: () => undefined,
  publishPool: async () => undefined,
  updateSeed: async () => undefined,
  completeMatchScore: async () => undefined,
  scheduleMatch: async () => undefined,
  refreshMatches: async () => undefined,
  overrideStanding: () => undefined,
  addAuditLog: () => undefined,
  addOverride: () => undefined,
});

export function TournamentDataProvider({ children }: { children: ReactNode }) {
  const [registrations, setRegistrations] = useState<Registration[]>(MOCK_REGISTRATIONS);
  const [pools, setPools] = useState<Pool[]>(MOCK_POOLS);
  const [standings, setStandings] = useState<PoolStanding[]>(MOCK_STANDINGS);
  const [matches, setMatches] = useState<ScheduledMatch[]>(MOCK_SCHEDULED_MATCHES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);
  const [overrides, setOverrides] = useState<AdminOverride[]>(MOCK_OVERRIDES);
  const [registrationsError, setRegistrationsError] = useState<string | null>(null);
  const [poolsError, setPoolsError] = useState<string | null>(null);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const addAuditLog = useCallback((log: Omit<AuditLog, 'id' | 'createdAt'>) => {
    const newLog: AuditLog = { ...log, id: generateId(), createdAt: new Date().toISOString() };
    setAuditLogs(prev => [newLog, ...prev]);
  }, []);

  const addOverride = useCallback((ov: Omit<AdminOverride, 'id' | 'createdAt'>) => {
    const newOv: AdminOverride = { ...ov, id: generateId(), createdAt: new Date().toISOString() };
    setOverrides(prev => [newOv, ...prev]);
  }, []);

  const refreshRegistrations = useCallback(async () => {
    try {
      const liveRegistrations = await fetchRegistrations();
      setRegistrations(liveRegistrations.length > 0 ? liveRegistrations : MOCK_REGISTRATIONS);
      setRegistrationsError(liveRegistrations.length > 0 ? null : 'Supabase connected, no registrations yet. Showing mock data.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load registrations.';
      setRegistrations(MOCK_REGISTRATIONS);
      setRegistrationsError(message);
    }
  }, []);

  useEffect(() => {
    void refreshRegistrations();
  }, [refreshRegistrations]);

  const refreshPools = useCallback(async () => {
    try {
      const livePools = await fetchPools();
      setPools(livePools.length > 0 ? livePools : MOCK_POOLS);
      setPoolsError(livePools.length > 0 ? null : 'Supabase connected, no pools yet. Showing mock data.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load pools.';
      setPools(MOCK_POOLS);
      setPoolsError(message);
    }
  }, []);

  useEffect(() => {
    void refreshPools();
  }, [refreshPools]);

  const refreshMatches = useCallback(async () => {
    try {
      const liveMatches = await fetchMatches();
      setMatches(liveMatches.length > 0 ? liveMatches : MOCK_SCHEDULED_MATCHES);
      setMatchesError(liveMatches.length > 0 ? null : 'Supabase connected, no matches yet. Showing mock data.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load matches.';
      setMatches(MOCK_SCHEDULED_MATCHES);
      setMatchesError(message);
    }
  }, []);

  useEffect(() => {
    void refreshMatches();
  }, [refreshMatches]);

  useEffect(() => {
    const channel = supabase
      .channel('match-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        void refreshMatches();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_sets' }, () => {
        void refreshMatches();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshMatches]);

  const validateRegistration = useCallback(async (regId: string) => {
    const registration = registrations.find(r => r.id === regId);
    if (registration) {
      await updateRegistrationStatus(registration, 'validated');
    }
    const validatedAt = new Date().toISOString();
    setRegistrations(prev => prev.map(r =>
      r.id === regId ? { ...r, status: 'validated', validatedBy: 'Admin MPL', validatedAt } : r
    ));
    addAuditLog({
      action: 'REGISTRATION_VALIDATED', module: 'Registrations',
      entityType: 'registration', entityId: regId,
      description: `Registration ${regId} validated.`,
      adminId: 'adm1', adminName: 'Admin MPL', isOverride: false,
    });
  }, [addAuditLog, registrations]);

  const rejectRegistration = useCallback(async (regId: string, reason: string) => {
    const registration = registrations.find(r => r.id === regId);
    if (registration) {
      await updateRegistrationStatus(registration, 'rejected', reason);
    }
    setRegistrations(prev => prev.map(r =>
      r.id === regId ? { ...r, status: 'rejected', rejectionReason: reason } : r
    ));
    addAuditLog({
      action: 'REGISTRATION_REJECTED', module: 'Registrations',
      entityType: 'registration', entityId: regId,
      description: `Registration ${regId} rejected. Reason: ${reason}`,
      adminId: 'adm1', adminName: 'Admin MPL', isOverride: false, overrideReason: reason,
    });
  }, [addAuditLog, registrations]);

  const updatePoolSlot = useCallback(async (poolId: string, position: number, team: Team | undefined) => {
    const pool = pools.find(p => p.id === poolId);
    const slot = pool?.slots.find(s => s.position === position);
    if (slot) {
      await updatePoolSlotAssignment(slot.id, team);
    }
    setPools(prev => prev.map(p =>
      p.id !== poolId ? p : {
        ...p,
        slots: p.slots.map(s =>
          s.position === position ? { ...s, team, isEmpty: !team } : s
        ),
      }
    ));
  }, [pools]);

  const toggleSlotLock = useCallback(async (poolId: string, position: number) => {
    const pool = pools.find(p => p.id === poolId);
    const slot = pool?.slots.find(s => s.position === position);
    if (slot) {
      await updatePoolSlotLock(slot.id, !slot.isLocked);
    }
    setPools(prev => prev.map(p =>
      p.id !== poolId ? p : {
        ...p,
        slots: p.slots.map(s =>
          s.position === position ? { ...s, isLocked: !s.isLocked } : s
        ),
      }
    ));
  }, [pools]);

  const redrawPool = useCallback((poolId: string, teams: Team[]) => {
    setPools(prev => prev.map(p => {
      if (p.id !== poolId) return p;
      const lockedSlots = p.slots.filter(s => s.isLocked);
      const lockedTeamIds = new Set(lockedSlots.map(s => s.team?.id).filter(Boolean));
      const unlockedTeams = teams.filter(t => !lockedTeamIds.has(t.id));
      const shuffled = shuffleArray(unlockedTeams);
      let shuffleIdx = 0;
      const newSlots = p.slots.map(s => {
        if (s.isLocked) return s;
        const team = shuffled[shuffleIdx++];
        return { ...s, team, isEmpty: !team };
      });
      return { ...p, slots: newSlots };
    }));
    addAuditLog({
      action: 'DRAW_REDRAW', module: 'Pool Draw',
      entityType: 'pool', entityId: poolId,
      description: `Pool ${poolId} redrawn by Admin MPL.`,
      adminId: 'adm1', adminName: 'Admin MPL', isOverride: false,
    });
  }, [addAuditLog]);

  const publishPool = useCallback(async (poolId: string, adminNote: string) => {
    await updatePoolStatus(poolId, 'published');
    setPools(prev => prev.map(p =>
      p.id !== poolId ? p : { ...p, status: 'published' }
    ));
    addAuditLog({
      action: 'DRAW_PUBLISHED', module: 'Pool Draw',
      entityType: 'pool', entityId: poolId,
      description: `Pool ${poolId} officially published. Note: ${adminNote}`,
      adminId: 'adm1', adminName: 'Admin MPL', isOverride: false, overrideReason: adminNote || undefined,
    });
  }, [addAuditLog]);

  const updateSeed = useCallback(async (teamId: string, newSeed: number | undefined, reason: string) => {
    const registration = registrations.find(r => r.team.id === teamId);
    if (registration) {
      await updateTeamSeed(registration.team, newSeed, reason);
    }
    setRegistrations(prev => prev.map(reg => (
      reg.team.id === teamId
        ? {
            ...reg,
            team: {
              ...reg.team,
              seed: newSeed,
              isSeedLocked: newSeed !== undefined,
            },
          }
        : reg
    )));
    addAuditLog({
      action: 'SEED_OVERRIDE', module: 'Seed Editor',
      entityType: 'team', entityId: teamId,
      description: `Seed updated to ${newSeed ?? 'none'} for team ${teamId}. Reason: ${reason}`,
      adminId: 'adm1', adminName: 'Admin MPL', isOverride: true, overrideReason: reason,
    });
    addOverride({
      tournamentId: 'trn1', type: 'seed_change',
      entityType: 'team', entityId: teamId,
      previousValue: 'prev', newValue: String(newSeed ?? 'none'),
      reason, adminId: 'adm1', adminName: 'Admin MPL',
    });
  }, [addAuditLog, addOverride, registrations]);

  const completeMatchScore = useCallback(async (match: ScheduledMatch, sets: MatchSet[], reason?: string) => {
    await saveMatchScore(match, sets, reason);
    const winnerId = calculateWinnerId(match, sets);
    const updatedMatch: ScheduledMatch = {
      ...match,
      sets,
      winnerId,
      status: 'completed',
      completedAt: match.completedAt ?? new Date().toISOString(),
      adminOverride: match.status === 'completed',
      overrideReason: match.status === 'completed' ? reason : undefined,
    };

    setMatches(prev => prev.map(m => (m.id === match.id ? updatedMatch : m)));
    addAuditLog({
      action: match.status === 'completed' ? 'SCORE_OVERRIDE' : 'SCORE_ENTERED',
      module: 'Match Score',
      entityType: 'match',
      entityId: match.id,
      description: `Score saved for Match ${match.matchNumber}: ${sets.map(set => `${set.team1Score}-${set.team2Score}`).join(', ')}`,
      adminId: 'adm1',
      adminName: 'Admin MPL',
      isOverride: match.status === 'completed',
      overrideReason: reason,
    });
  }, [addAuditLog]);

  const scheduleMatch = useCallback(async (match: ScheduledMatch, scheduledAt: string, courtNumber: number | undefined) => {
    await updateMatchSchedule(match, scheduledAt, courtNumber);
    setMatches(prev => prev.map(m => (
      m.id === match.id
        ? {
            ...m,
            scheduledAt: scheduledAt || undefined,
            scheduledTime: scheduledAt || undefined,
            courtNumber,
            courtId: courtNumber ? `ct${courtNumber}` : undefined,
            courtName: courtNumber ? `Court ${courtNumber}` : undefined,
            isConfirmed: Boolean(scheduledAt),
          }
        : m
    )));
    addAuditLog({
      action: 'MATCH_SCHEDULED',
      module: 'Match Schedule',
      entityType: 'match',
      entityId: match.id,
      description: `Match ${match.matchNumber} scheduled on Court ${courtNumber ?? 'TBD'} at ${scheduledAt || 'TBD'}.`,
      adminId: 'adm1',
      adminName: 'Admin MPL',
      isOverride: false,
    });
  }, [addAuditLog]);

  const overrideStanding = useCallback((teamId: string, newPosition: number, reason: string) => {
    setStandings(prev => prev.map(s =>
      s.teamId === teamId ? { ...s, position: newPosition, adminOverride: true, overrideReason: reason } : s
    ));
    addAuditLog({
      action: 'STANDING_OVERRIDE', module: 'Pool Standings',
      entityType: 'standing', entityId: teamId,
      description: `Standing override — team ${teamId} placed at position ${newPosition}. Reason: ${reason}`,
      adminId: 'adm1', adminName: 'Admin MPL', isOverride: true, overrideReason: reason,
    });
  }, [addAuditLog]);

  return (
    <TournamentDataContext.Provider value={{
      registrations, pools, standings, matches, auditLogs, overrides, registrationsError, poolsError, matchesError,
      validateRegistration, rejectRegistration, refreshRegistrations, updatePoolSlot, toggleSlotLock,
      redrawPool, publishPool, updateSeed, completeMatchScore, scheduleMatch, refreshMatches,
      overrideStanding, addAuditLog, addOverride,
    }}>
      {children}
    </TournamentDataContext.Provider>
  );
}

export function useTournamentData() {
  return useContext(TournamentDataContext);
}

import { shuffleArray } from './lib';

function calculateWinnerId(match: ScheduledMatch, sets: MatchSet[]): string | undefined {
  const t1Sets = sets.filter(set => set.team1Score > set.team2Score).length;
  const t2Sets = sets.filter(set => set.team2Score > set.team1Score).length;

  if (t1Sets > t2Sets) return match.team1?.id;
  if (t2Sets > t1Sets) return match.team2?.id;
  return undefined;
}

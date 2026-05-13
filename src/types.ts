// ─── Core Entity Types ────────────────────────────────────────────────────────

export type TournamentStatus =
  | 'draft'
  | 'registration_open'
  | 'registration_closed'
  | 'draw_preparation'
  | 'pool_draw_ready'
  | 'pool_published'
  | 'matches_ongoing'
  | 'main_draw_ready'
  | 'main_draw_published'
  | 'locked'
  | 'completed';

export type RegistrationStatus = 'pending' | 'validated' | 'rejected' | 'waitlisted';
export type DrawSessionStatus = 'draft' | 'published' | 'locked';
export type MatchStatus = 'scheduled' | 'ongoing' | 'completed' | 'walkover';
export type OverrideType = 'seed_change' | 'slot_swap' | 'score_correction' | 'status_override' | 'manual_placement';
export type CompetitionMode = 'main_draw_direct' | 'qualification_phase';

export interface Club {
  id: string;
  name: string;
  shortCode: string;
  logoUrl?: string;
  location: string;
}

export interface Player {
  id: string;
  fullName: string;
  avatarUrl?: string;
  clubId: string;
  nationalRanking?: number;
  nationality: string;
}

export interface Team {
  id: string;
  name: string;
  player1: Player;
  player2: Player;
  clubId: string;
  clubName: string;
  seed?: number;
  isSeedLocked?: boolean;
  ranking?: number;
  registrationStatus: RegistrationStatus;
  registrationId: string;
}

export interface Tournament {
  id: string;
  name: string;
  eventType: 'singles' | 'doubles' | 'mixed_doubles';
  category: 'open' | 'pro' | 'amateur' | 'junior' | 'senior';
  status: TournamentStatus;
  competitionMode: CompetitionMode;
  qualifiersPerPool: number;
  poolCount: number;
  startDate: string;
  endDate: string;
  venue: string;
  maxTeams: number;
  registeredTeams: number;
  validatedTeams: number;
  pools?: Pool[];
  draws?: Draw[];
  createdAt: string;
  updatedAt: string;
}

export interface Registration {
  id: string;
  tournamentId: string;
  team: Team;
  submittedAt: string;
  status: RegistrationStatus;
  rejectionReason?: string;
  validatedBy?: string;
  validatedAt?: string;
  notes?: string;
}

export interface Pool {
  id: string;
  tournamentId: string;
  name: string; // e.g., "Pool A", "Pool B"
  letter: string; // A, B, C...
  slots: PoolSlot[];
  maxTeams: number;
  matchesGenerated: boolean;
  status: DrawSessionStatus;
}

export interface PoolSlot {
  id: string;
  poolId: string;
  position: number; // 1-based
  team?: Team;
  isLocked: boolean;
  isSeedProtected: boolean;
  isEmpty: boolean;
}

export interface DrawSession {
  id: string;
  tournamentId: string;
  drawType: 'pool_draw' | 'main_draw';
  status: DrawSessionStatus;
  createdBy: string;
  publishedBy?: string;
  publishedAt?: string;
  lockedBy?: string;
  lockedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface Draw {
  id: string;
  tournamentId: string;
  drawSessionId: string;
  drawType: 'pool_draw' | 'main_draw';
  slots: DrawSlot[];
  status: DrawSessionStatus;
}

export interface DrawSlot {
  id: string;
  drawId: string;
  round: number;
  position: number;
  team?: Team;
  isBye: boolean;
  isLocked: boolean;
  winnerId?: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  poolId?: string;
  drawId?: string;
  round: number;
  matchNumber: number;
  team1?: Team;
  team2?: Team;
  isBye: boolean;
  status: MatchStatus;
  sets: MatchSet[];
  winnerId?: string;
  scheduledAt?: string;
  completedAt?: string;
  courtNumber?: number;
  adminOverride?: boolean;
  overrideReason?: string;
}

export interface MatchSet {
  id: string;
  matchId: string;
  setNumber: number;
  team1Score: number;
  team2Score: number;
  isTiebreak: boolean;
}

export interface PoolStanding {
  teamId: string;
  team: Team;
  poolId: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
  position: number;
  qualified: boolean;
  adminOverride?: boolean;
  overrideReason?: string;
}

export interface AdminOverride {
  id: string;
  tournamentId: string;
  type: OverrideType;
  entityType: string;
  entityId: string;
  previousValue: string;
  newValue: string;
  reason: string;
  adminId: string;
  adminName: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tournamentId?: string;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  description: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  adminId: string;
  adminName: string;
  ipAddress?: string;
  createdAt: string;
  isOverride: boolean;
  overrideReason?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'tournament_admin' | 'referee';
  avatarUrl?: string;
}

// ─── UI State Types ───────────────────────────────────────────────────────────

// ─── Phase 2 Types ────────────────────────────────────────────────────────────

export type CourtStatus = 'available' | 'in_use' | 'maintenance';

export interface Court {
  id: string;
  name: string;
  number: number;
  status: CourtStatus;
}

export interface ScheduledMatch extends Match {
  courtId?: string;
  courtName?: string;
  scheduledTime?: string;
  estimatedDuration?: number; // minutes
  isConfirmed: boolean;
}

export interface QualifiedTeam {
  team: Team;
  poolId: string;
  poolName: string;
  poolPosition: number;
  isConfirmed: boolean;
  mainDrawSeed?: number;
  isOverride?: boolean;
  overrideReason?: string;
}

export type AppView =
  | 'dashboard'
  | 'tournaments'
  | 'tournament_detail'
  | 'registrations'
  | 'team_list'
  | 'seed_editor'
  | 'draw_room'
  | 'pool_draw'
  | 'main_draw'
  | 'audit_logs'
  | 'overrides'
  | 'match_score'
  | 'pool_standings'
  | 'qualified_teams'
  | 'match_schedule'
  | 'public_pools'
  | 'public_bracket'
  | 'obs_main_draw'
  | 'obs_pools'
  | 'obs_scores';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

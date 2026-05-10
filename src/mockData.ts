import type {
  Tournament, Team, Registration, Pool, PoolSlot, PoolStanding,
  Match, AuditLog, AdminOverride, DrawSession, DrawSlot, Player, Club
} from './types';

// ─── Clubs ────────────────────────────────────────────────────────────────────
export const MOCK_CLUBS: Club[] = [
  { id: 'c1', name: 'Padel Mauritius Club', shortCode: 'PMC', location: 'Ebène' },
  { id: 'c2', name: 'Grand Baie Padel', shortCode: 'GBP', location: 'Grand Baie' },
  { id: 'c3', name: 'Tamarin Padel Club', shortCode: 'TPC', location: 'Tamarin' },
  { id: 'c4', name: 'Floréal Padel', shortCode: 'FLP', location: 'Floréal' },
  { id: 'c5', name: 'Rivière Noire Padel', shortCode: 'RNP', location: 'Rivière Noire' },
];

// ─── Players ─────────────────────────────────────────────────────────────────
export const MOCK_PLAYERS: Player[] = [
  { id: 'p1', fullName: 'Ravi Boolell', clubId: 'c1', nationality: 'MU', nationalRanking: 1 },
  { id: 'p2', fullName: 'Aryan Gokhool', clubId: 'c1', nationality: 'MU', nationalRanking: 2 },
  { id: 'p3', fullName: 'Damien Lavoie', clubId: 'c2', nationality: 'MU', nationalRanking: 3 },
  { id: 'p4', fullName: 'Kevin Rousset', clubId: 'c2', nationality: 'MU', nationalRanking: 4 },
  { id: 'p5', fullName: 'Malik Sooknah', clubId: 'c3', nationality: 'MU', nationalRanking: 5 },
  { id: 'p6', fullName: 'Jean-Pierre Ah-Kion', clubId: 'c3', nationality: 'MU', nationalRanking: 6 },
  { id: 'p7', fullName: 'Nicolas Duval', clubId: 'c4', nationality: 'MU', nationalRanking: 7 },
  { id: 'p8', fullName: 'Sanjay Ramtohul', clubId: 'c4', nationality: 'MU', nationalRanking: 8 },
  { id: 'p9', fullName: 'Cédric Morel', clubId: 'c5', nationality: 'MU', nationalRanking: 9 },
  { id: 'p10', fullName: 'Bruno Fontaine', clubId: 'c5', nationality: 'MU', nationalRanking: 10 },
  { id: 'p11', fullName: 'Yannick Pellegrin', clubId: 'c1', nationality: 'MU', nationalRanking: 11 },
  { id: 'p12', fullName: 'David Ah-Lin', clubId: 'c2', nationality: 'MU', nationalRanking: 12 },
  { id: 'p13', fullName: 'Franck Léonard', clubId: 'c3', nationality: 'FR', nationalRanking: 13 },
  { id: 'p14', fullName: 'Olivier Motet', clubId: 'c4', nationality: 'MU', nationalRanking: 14 },
  { id: 'p15', fullName: 'Thierry Gosselin', clubId: 'c5', nationality: 'MU', nationalRanking: 15 },
  { id: 'p16', fullName: 'Antoine Bègue', clubId: 'c1', nationality: 'MU', nationalRanking: 16 },
];

// ─── Teams ────────────────────────────────────────────────────────────────────
export const MOCK_TEAMS: Team[] = [
  { id: 't1', name: 'Boolell / Gokhool', player1: MOCK_PLAYERS[0], player2: MOCK_PLAYERS[1], clubId: 'c1', clubName: 'PMC', seed: 1, isSeedLocked: true, registrationStatus: 'validated', registrationId: 'r1', ranking: 1 },
  { id: 't2', name: 'Lavoie / Rousset', player1: MOCK_PLAYERS[2], player2: MOCK_PLAYERS[3], clubId: 'c2', clubName: 'GBP', seed: 2, isSeedLocked: false, registrationStatus: 'validated', registrationId: 'r2', ranking: 2 },
  { id: 't3', name: 'Sooknah / Ah-Kion', player1: MOCK_PLAYERS[4], player2: MOCK_PLAYERS[5], clubId: 'c3', clubName: 'TPC', seed: 3, isSeedLocked: false, registrationStatus: 'validated', registrationId: 'r3', ranking: 3 },
  { id: 't4', name: 'Duval / Ramtohul', player1: MOCK_PLAYERS[6], player2: MOCK_PLAYERS[7], clubId: 'c4', clubName: 'FLP', seed: 4, isSeedLocked: false, registrationStatus: 'validated', registrationId: 'r4', ranking: 4 },
  { id: 't5', name: 'Morel / Fontaine', player1: MOCK_PLAYERS[8], player2: MOCK_PLAYERS[9], clubId: 'c5', clubName: 'RNP', seed: undefined, registrationStatus: 'validated', registrationId: 'r5', ranking: 5 },
  { id: 't6', name: 'Pellegrin / Ah-Lin', player1: MOCK_PLAYERS[10], player2: MOCK_PLAYERS[11], clubId: 'c1', clubName: 'PMC', seed: undefined, registrationStatus: 'validated', registrationId: 'r6', ranking: 6 },
  { id: 't7', name: 'Léonard / Motet', player1: MOCK_PLAYERS[12], player2: MOCK_PLAYERS[13], clubId: 'c3', clubName: 'TPC', seed: undefined, registrationStatus: 'validated', registrationId: 'r7', ranking: 7 },
  { id: 't8', name: 'Gosselin / Bègue', player1: MOCK_PLAYERS[14], player2: MOCK_PLAYERS[15], clubId: 'c5', clubName: 'RNP', seed: undefined, registrationStatus: 'validated', registrationId: 'r8', ranking: 8 },
  { id: 't9', name: 'Boolell / Fontaine', player1: MOCK_PLAYERS[0], player2: MOCK_PLAYERS[9], clubId: 'c1', clubName: 'PMC', seed: undefined, registrationStatus: 'pending', registrationId: 'r9', ranking: undefined },
  { id: 't10', name: 'Rousset / Léonard', player1: MOCK_PLAYERS[3], player2: MOCK_PLAYERS[12], clubId: 'c2', clubName: 'GBP', seed: undefined, registrationStatus: 'pending', registrationId: 'r10', ranking: undefined },
  { id: 't11', name: 'Ah-Kion / Ramtohul', player1: MOCK_PLAYERS[5], player2: MOCK_PLAYERS[7], clubId: 'c4', clubName: 'FLP', seed: undefined, registrationStatus: 'waitlisted', registrationId: 'r11', ranking: undefined },
  { id: 't12', name: 'Pellegrin / Morel', player1: MOCK_PLAYERS[10], player2: MOCK_PLAYERS[8], clubId: 'c1', clubName: 'PMC', seed: undefined, registrationStatus: 'rejected', registrationId: 'r12', ranking: undefined },
];

// ─── Tournaments ──────────────────────────────────────────────────────────────
export const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: 'trn1',
    name: 'MPL Open 2026 — Men\'s Doubles',
    eventType: 'doubles',
    category: 'open',
    status: 'pool_draw_ready',
    startDate: '2026-05-24',
    endDate: '2026-05-25',
    venue: 'Padel Mauritius Club, Ebène',
    maxTeams: 16,
    registeredTeams: 12,
    validatedTeams: 8,
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-05-09T14:30:00Z',
  },
  {
    id: 'trn2',
    name: 'MPL Pro Circuit — Mixed Doubles',
    eventType: 'mixed_doubles',
    category: 'pro',
    status: 'registration_open',
    startDate: '2026-06-07',
    endDate: '2026-06-08',
    venue: 'Grand Baie Padel, Grand Baie',
    maxTeams: 8,
    registeredTeams: 5,
    validatedTeams: 0,
    createdAt: '2026-04-15T10:00:00Z',
    updatedAt: '2026-05-08T09:00:00Z',
  },
  {
    id: 'trn3',
    name: 'MPL Amateur Cup 2026',
    eventType: 'doubles',
    category: 'amateur',
    status: 'pool_published',
    startDate: '2026-04-12',
    endDate: '2026-04-13',
    venue: 'Tamarin Padel Club',
    maxTeams: 8,
    registeredTeams: 8,
    validatedTeams: 8,
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-04-10T16:00:00Z',
  },
  {
    id: 'trn4',
    name: 'MPL Junior Series — Under 18',
    eventType: 'doubles',
    category: 'junior',
    status: 'draft',
    startDate: '2026-07-12',
    endDate: '2026-07-13',
    venue: 'Floréal Padel',
    maxTeams: 8,
    registeredTeams: 0,
    validatedTeams: 0,
    createdAt: '2026-05-05T12:00:00Z',
    updatedAt: '2026-05-05T12:00:00Z',
  },
  {
    id: 'trn5',
    name: 'MPL Senior Masters',
    eventType: 'doubles',
    category: 'senior',
    status: 'locked',
    startDate: '2026-03-08',
    endDate: '2026-03-09',
    venue: 'Rivière Noire Padel',
    maxTeams: 8,
    registeredTeams: 8,
    validatedTeams: 8,
    createdAt: '2026-01-20T08:00:00Z',
    updatedAt: '2026-03-10T18:00:00Z',
  },
];

// ─── Registrations ────────────────────────────────────────────────────────────
export const MOCK_REGISTRATIONS: Registration[] = [
  { id: 'r1', tournamentId: 'trn1', team: MOCK_TEAMS[0], submittedAt: '2026-04-15T10:00:00Z', status: 'validated', validatedBy: 'Admin MPL', validatedAt: '2026-04-16T09:00:00Z' },
  { id: 'r2', tournamentId: 'trn1', team: MOCK_TEAMS[1], submittedAt: '2026-04-15T11:00:00Z', status: 'validated', validatedBy: 'Admin MPL', validatedAt: '2026-04-16T09:00:00Z' },
  { id: 'r3', tournamentId: 'trn1', team: MOCK_TEAMS[2], submittedAt: '2026-04-16T08:00:00Z', status: 'validated', validatedBy: 'Admin MPL', validatedAt: '2026-04-17T09:00:00Z' },
  { id: 'r4', tournamentId: 'trn1', team: MOCK_TEAMS[3], submittedAt: '2026-04-16T09:00:00Z', status: 'validated', validatedBy: 'Admin MPL', validatedAt: '2026-04-17T09:00:00Z' },
  { id: 'r5', tournamentId: 'trn1', team: MOCK_TEAMS[4], submittedAt: '2026-04-17T14:00:00Z', status: 'validated', validatedBy: 'Admin MPL', validatedAt: '2026-04-18T10:00:00Z' },
  { id: 'r6', tournamentId: 'trn1', team: MOCK_TEAMS[5], submittedAt: '2026-04-18T10:00:00Z', status: 'validated', validatedBy: 'Admin MPL', validatedAt: '2026-04-19T09:00:00Z' },
  { id: 'r7', tournamentId: 'trn1', team: MOCK_TEAMS[6], submittedAt: '2026-04-20T08:00:00Z', status: 'validated', validatedBy: 'Admin MPL', validatedAt: '2026-04-21T10:00:00Z' },
  { id: 'r8', tournamentId: 'trn1', team: MOCK_TEAMS[7], submittedAt: '2026-04-21T15:00:00Z', status: 'validated', validatedBy: 'Admin MPL', validatedAt: '2026-04-22T09:00:00Z' },
  { id: 'r9', tournamentId: 'trn1', team: MOCK_TEAMS[8], submittedAt: '2026-04-28T10:00:00Z', status: 'pending' },
  { id: 'r10', tournamentId: 'trn1', team: MOCK_TEAMS[9], submittedAt: '2026-04-29T14:00:00Z', status: 'pending' },
  { id: 'r11', tournamentId: 'trn1', team: MOCK_TEAMS[10], submittedAt: '2026-04-30T09:00:00Z', status: 'waitlisted' },
  { id: 'r12', tournamentId: 'trn1', team: MOCK_TEAMS[11], submittedAt: '2026-04-22T16:00:00Z', status: 'rejected', rejectionReason: 'Player ineligible — club membership not confirmed.' },
];

// ─── Pools ────────────────────────────────────────────────────────────────────
function makeSlot(poolId: string, position: number, team?: Team, locked = false, seedProtected = false): PoolSlot {
  return {
    id: `${poolId}-slot${position}`,
    poolId,
    position,
    team,
    isLocked: locked,
    isSeedProtected: seedProtected,
    isEmpty: !team,
  };
}

export const MOCK_POOLS: Pool[] = [
  {
    id: 'pool_a',
    tournamentId: 'trn1',
    name: 'Pool A',
    letter: 'A',
    maxTeams: 4,
    matchesGenerated: false,
    status: 'draft',
    slots: [
      makeSlot('pool_a', 1, MOCK_TEAMS[0], true, true),  // Seed 1 — locked
      makeSlot('pool_a', 2, MOCK_TEAMS[4], false, false),
      makeSlot('pool_a', 3, MOCK_TEAMS[6], false, false),
      makeSlot('pool_a', 4, undefined, false, false),
    ],
  },
  {
    id: 'pool_b',
    tournamentId: 'trn1',
    name: 'Pool B',
    letter: 'B',
    maxTeams: 4,
    matchesGenerated: false,
    status: 'draft',
    slots: [
      makeSlot('pool_b', 1, MOCK_TEAMS[1], true, true),  // Seed 2 — locked
      makeSlot('pool_b', 2, MOCK_TEAMS[5], false, false),
      makeSlot('pool_b', 3, MOCK_TEAMS[7], false, false),
      makeSlot('pool_b', 4, undefined, false, false),
    ],
  },
];

// ─── Pool Standings ───────────────────────────────────────────────────────────
export const MOCK_STANDINGS: PoolStanding[] = [
  { teamId: 't1', team: MOCK_TEAMS[0], poolId: 'pool_a', matchesPlayed: 3, wins: 3, losses: 0, setsWon: 6, setsLost: 1, gamesWon: 36, gamesLost: 18, points: 9, position: 1, qualified: true },
  { teamId: 't5', team: MOCK_TEAMS[4], poolId: 'pool_a', matchesPlayed: 3, wins: 2, losses: 1, setsWon: 4, setsLost: 3, gamesWon: 29, gamesLost: 25, points: 6, position: 2, qualified: true },
  { teamId: 't7', team: MOCK_TEAMS[6], poolId: 'pool_a', matchesPlayed: 3, wins: 1, losses: 2, setsWon: 2, setsLost: 4, gamesWon: 21, gamesLost: 28, points: 3, position: 3, qualified: false },
  { teamId: 't2', team: MOCK_TEAMS[1], poolId: 'pool_b', matchesPlayed: 3, wins: 2, losses: 1, setsWon: 5, setsLost: 2, gamesWon: 31, gamesLost: 22, points: 6, position: 1, qualified: true },
  { teamId: 't6', team: MOCK_TEAMS[5], poolId: 'pool_b', matchesPlayed: 3, wins: 2, losses: 1, setsWon: 4, setsLost: 3, gamesWon: 27, gamesLost: 24, points: 6, position: 2, qualified: true },
  { teamId: 't8', team: MOCK_TEAMS[7], poolId: 'pool_b', matchesPlayed: 3, wins: 0, losses: 3, setsWon: 1, setsLost: 6, gamesWon: 15, gamesLost: 35, points: 0, position: 3, qualified: false },
];

// ─── Matches (Pool A example) ─────────────────────────────────────────────────
export const MOCK_MATCHES: Match[] = [
  {
    id: 'm1', tournamentId: 'trn3', poolId: 'pool_a', round: 1, matchNumber: 1,
    team1: MOCK_TEAMS[0], team2: MOCK_TEAMS[4], isBye: false, status: 'completed',
    sets: [
      { id: 's1', matchId: 'm1', setNumber: 1, team1Score: 6, team2Score: 3, isTiebreak: false },
      { id: 's2', matchId: 'm1', setNumber: 2, team1Score: 6, team2Score: 4, isTiebreak: false },
    ],
    winnerId: 't1', completedAt: '2026-04-12T14:30:00Z',
  },
  {
    id: 'm2', tournamentId: 'trn3', poolId: 'pool_a', round: 1, matchNumber: 2,
    team1: MOCK_TEAMS[6], team2: MOCK_TEAMS[4], isBye: false, status: 'completed',
    sets: [
      { id: 's3', matchId: 'm2', setNumber: 1, team1Score: 3, team2Score: 6, isTiebreak: false },
      { id: 's4', matchId: 'm2', setNumber: 2, team1Score: 4, team2Score: 6, isTiebreak: false },
    ],
    winnerId: 't5', completedAt: '2026-04-12T16:00:00Z',
  },
];

// ─── Draw Session ─────────────────────────────────────────────────────────────
export const MOCK_DRAW_SESSION: DrawSession = {
  id: 'ds1',
  tournamentId: 'trn1',
  drawType: 'pool_draw',
  status: 'draft',
  createdBy: 'Admin MPL',
  createdAt: '2026-05-09T10:00:00Z',
  notes: 'Pool draw session — pending admin review before publication.',
};

// ─── Main Draw Slots ──────────────────────────────────────────────────────────
export const MOCK_DRAW_SLOTS: DrawSlot[] = [
  { id: 'ds1', drawId: 'draw1', round: 1, position: 1, team: MOCK_TEAMS[0], isBye: false, isLocked: true },
  { id: 'ds2', drawId: 'draw1', round: 1, position: 2, team: MOCK_TEAMS[4], isBye: false, isLocked: false },
  { id: 'ds3', drawId: 'draw1', round: 1, position: 3, team: MOCK_TEAMS[1], isBye: false, isLocked: false },
  { id: 'ds4', drawId: 'draw1', round: 1, position: 4, isBye: true, isLocked: false },
  { id: 'ds5', drawId: 'draw1', round: 1, position: 5, team: MOCK_TEAMS[5], isBye: false, isLocked: false },
  { id: 'ds6', drawId: 'draw1', round: 1, position: 6, isBye: true, isLocked: false },
  { id: 'ds7', drawId: 'draw1', round: 1, position: 7, team: MOCK_TEAMS[2], isBye: false, isLocked: false },
  { id: 'ds8', drawId: 'draw1', round: 1, position: 8, team: MOCK_TEAMS[3], isBye: false, isLocked: false },
];

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'al1', tournamentId: 'trn1', action: 'DRAW_PUBLISHED', module: 'Pool Draw',
    entityType: 'pool', entityId: 'pool_a',
    description: 'Pool A draw published officially by Admin MPL.',
    adminId: 'adm1', adminName: 'Admin MPL', createdAt: '2026-05-09T14:00:00Z', isOverride: false,
  },
  {
    id: 'al2', tournamentId: 'trn1', action: 'SEED_OVERRIDE', module: 'Seed Editor',
    entityType: 'team', entityId: 't3',
    description: 'Seed changed from #4 to #3 for Sooknah / Ah-Kion.',
    adminId: 'adm1', adminName: 'Admin MPL', createdAt: '2026-05-08T11:30:00Z', isOverride: true,
    overrideReason: 'Player Sooknah won the national qualifier — ranking correction applied.',
    previousState: { seed: 4 }, newState: { seed: 3 },
  },
  {
    id: 'al3', tournamentId: 'trn1', action: 'REGISTRATION_VALIDATED', module: 'Registrations',
    entityType: 'registration', entityId: 'r1',
    description: 'Registration validated for Boolell / Gokhool.',
    adminId: 'adm1', adminName: 'Admin MPL', createdAt: '2026-04-16T09:00:00Z', isOverride: false,
  },
  {
    id: 'al4', tournamentId: 'trn1', action: 'REGISTRATION_REJECTED', module: 'Registrations',
    entityType: 'registration', entityId: 'r12',
    description: 'Registration rejected for Pellegrin / Morel.',
    adminId: 'adm1', adminName: 'Admin MPL', createdAt: '2026-04-22T16:15:00Z', isOverride: false,
    overrideReason: 'Player ineligible — club membership not confirmed.',
  },
  {
    id: 'al5', tournamentId: 'trn1', action: 'SLOT_SWAP', module: 'Pool Draw',
    entityType: 'pool_slot', entityId: 'pool_a-slot2',
    description: 'Manual slot swap: Gosselin / Bègue moved to Pool A, Slot 2.',
    adminId: 'adm1', adminName: 'Admin MPL', createdAt: '2026-05-09T13:45:00Z', isOverride: true,
    overrideReason: 'Geographic balance — both teams from same club moved apart.',
    previousState: { team: 'Morel / Fontaine' }, newState: { team: 'Gosselin / Bègue' },
  },
  {
    id: 'al6', tournamentId: 'trn3', action: 'SCORE_OVERRIDE', module: 'Matches',
    entityType: 'match', entityId: 'm2',
    description: 'Score corrected for Pool A Match 2 — referee error.',
    adminId: 'adm1', adminName: 'Admin MPL', createdAt: '2026-04-12T17:00:00Z', isOverride: true,
    overrideReason: 'Referee recorded wrong score in Set 1. Correction confirmed by both teams.',
    previousState: { set1: '4-6' }, newState: { set1: '3-6' },
  },
  {
    id: 'al7', tournamentId: 'trn1', action: 'DRAW_REDRAW', module: 'Pool Draw',
    entityType: 'draw_session', entityId: 'ds1',
    description: 'Pool draw reset and redrawn by Admin MPL.',
    adminId: 'adm1', adminName: 'Admin MPL', createdAt: '2026-05-09T11:00:00Z', isOverride: false,
  },
  {
    id: 'al8', tournamentId: 'trn5', action: 'DRAW_LOCKED', module: 'Main Draw',
    entityType: 'draw_session', entityId: 'ds_trn5',
    description: 'Main draw locked — tournament completed.',
    adminId: 'adm1', adminName: 'Admin MPL', createdAt: '2026-03-10T18:00:00Z', isOverride: false,
  },
];

// ─── Admin Overrides ──────────────────────────────────────────────────────────
export const MOCK_OVERRIDES: AdminOverride[] = [
  {
    id: 'ov1', tournamentId: 'trn1', type: 'seed_change',
    entityType: 'team', entityId: 't3',
    previousValue: '4', newValue: '3',
    reason: 'Player Sooknah won the national qualifier — ranking correction.',
    adminId: 'adm1', adminName: 'Admin MPL', createdAt: '2026-05-08T11:30:00Z',
  },
  {
    id: 'ov2', tournamentId: 'trn1', type: 'slot_swap',
    entityType: 'pool_slot', entityId: 'pool_a-slot2',
    previousValue: 'Morel / Fontaine', newValue: 'Gosselin / Bègue',
    reason: 'Geographic balance — both teams from same club moved apart.',
    adminId: 'adm1', adminName: 'Admin MPL', createdAt: '2026-05-09T13:45:00Z',
  },
  {
    id: 'ov3', tournamentId: 'trn3', type: 'score_correction',
    entityType: 'match', entityId: 'm2',
    previousValue: 'Set 1: 4-6', newValue: 'Set 1: 3-6',
    reason: 'Referee error confirmed by both teams and video review.',
    adminId: 'adm1', adminName: 'Admin MPL', createdAt: '2026-04-12T17:00:00Z',
  },
];

// ─── Phase 2: Courts ──────────────────────────────────────────────────────────
export const MOCK_COURTS = [
  { id: 'ct1', name: 'Court 1', number: 1, status: 'available' as const },
  { id: 'ct2', name: 'Court 2', number: 2, status: 'in_use' as const },
  { id: 'ct3', name: 'Court 3', number: 3, status: 'available' as const },
  { id: 'ct4', name: 'Court 4', number: 4, status: 'maintenance' as const },
];

// ─── Phase 2: Pool Matches (full Pool A + B schedule) ─────────────────────────
import type { ScheduledMatch } from './types';

export const MOCK_SCHEDULED_MATCHES: ScheduledMatch[] = [
  {
    id: 'sm1', tournamentId: 'trn1', poolId: 'pool_a', round: 1, matchNumber: 1,
    team1: MOCK_TEAMS[0], team2: MOCK_TEAMS[4], isBye: false, status: 'completed',
    sets: [
      { id: 'ss1', matchId: 'sm1', setNumber: 1, team1Score: 6, team2Score: 3, isTiebreak: false },
      { id: 'ss2', matchId: 'sm1', setNumber: 2, team1Score: 6, team2Score: 4, isTiebreak: false },
    ],
    winnerId: 't1', courtId: 'ct1', courtName: 'Court 1',
    scheduledTime: '2026-05-24T09:00:00', estimatedDuration: 60, isConfirmed: true,
    completedAt: '2026-05-24T10:05:00',
  },
  {
    id: 'sm2', tournamentId: 'trn1', poolId: 'pool_a', round: 1, matchNumber: 2,
    team1: MOCK_TEAMS[6], team2: MOCK_TEAMS[4], isBye: false, status: 'completed',
    sets: [
      { id: 'ss3', matchId: 'sm2', setNumber: 1, team1Score: 3, team2Score: 6, isTiebreak: false },
      { id: 'ss4', matchId: 'sm2', setNumber: 2, team1Score: 4, team2Score: 6, isTiebreak: false },
    ],
    winnerId: 't5', courtId: 'ct2', courtName: 'Court 2',
    scheduledTime: '2026-05-24T10:30:00', estimatedDuration: 60, isConfirmed: true,
    completedAt: '2026-05-24T11:30:00',
  },
  {
    id: 'sm3', tournamentId: 'trn1', poolId: 'pool_a', round: 1, matchNumber: 3,
    team1: MOCK_TEAMS[0], team2: MOCK_TEAMS[6], isBye: false, status: 'completed',
    sets: [
      { id: 'ss5', matchId: 'sm3', setNumber: 1, team1Score: 6, team2Score: 2, isTiebreak: false },
      { id: 'ss6', matchId: 'sm3', setNumber: 2, team1Score: 6, team2Score: 1, isTiebreak: false },
    ],
    winnerId: 't1', courtId: 'ct1', courtName: 'Court 1',
    scheduledTime: '2026-05-24T12:00:00', estimatedDuration: 60, isConfirmed: true,
    completedAt: '2026-05-24T13:00:00',
  },
  {
    id: 'sm4', tournamentId: 'trn1', poolId: 'pool_b', round: 1, matchNumber: 1,
    team1: MOCK_TEAMS[1], team2: MOCK_TEAMS[5], isBye: false, status: 'completed',
    sets: [
      { id: 'ss7', matchId: 'sm4', setNumber: 1, team1Score: 6, team2Score: 4, isTiebreak: false },
      { id: 'ss8', matchId: 'sm4', setNumber: 2, team1Score: 5, team2Score: 7, isTiebreak: false },
      { id: 'ss9', matchId: 'sm4', setNumber: 3, team1Score: 7, team2Score: 5, isTiebreak: true },
    ],
    winnerId: 't2', courtId: 'ct3', courtName: 'Court 3',
    scheduledTime: '2026-05-24T09:00:00', estimatedDuration: 75, isConfirmed: true,
    completedAt: '2026-05-24T10:20:00',
  },
  {
    id: 'sm5', tournamentId: 'trn1', poolId: 'pool_b', round: 1, matchNumber: 2,
    team1: MOCK_TEAMS[7], team2: MOCK_TEAMS[5], isBye: false, status: 'completed',
    sets: [
      { id: 'ss10', matchId: 'sm5', setNumber: 1, team1Score: 2, team2Score: 6, isTiebreak: false },
      { id: 'ss11', matchId: 'sm5', setNumber: 2, team1Score: 3, team2Score: 6, isTiebreak: false },
    ],
    winnerId: 't6', courtId: 'ct3', courtName: 'Court 3',
    scheduledTime: '2026-05-24T10:30:00', estimatedDuration: 55, isConfirmed: true,
    completedAt: '2026-05-24T11:30:00',
  },
  {
    id: 'sm6', tournamentId: 'trn1', poolId: 'pool_b', round: 1, matchNumber: 3,
    team1: MOCK_TEAMS[1], team2: MOCK_TEAMS[7], isBye: false, status: 'scheduled',
    sets: [], winnerId: undefined,
    courtId: 'ct1', courtName: 'Court 1',
    scheduledTime: '2026-05-24T14:00:00', estimatedDuration: 60, isConfirmed: true,
    completedAt: undefined,
  },
  {
    id: 'sm7', tournamentId: 'trn1', poolId: undefined, round: 2, matchNumber: 1,
    team1: MOCK_TEAMS[2], team2: MOCK_TEAMS[3], isBye: false, status: 'scheduled',
    sets: [], winnerId: undefined,
    courtId: undefined, courtName: undefined,
    scheduledTime: '2026-05-25T09:00:00', estimatedDuration: 60, isConfirmed: false,
    completedAt: undefined,
  },
];

// ─── Phase 2: Qualified Teams ─────────────────────────────────────────────────
import type { QualifiedTeam } from './types';

export const MOCK_QUALIFIED_TEAMS: QualifiedTeam[] = [
  { team: MOCK_TEAMS[0], poolId: 'pool_a', poolName: 'Pool A', poolPosition: 1, isConfirmed: true, mainDrawSeed: 1 },
  { team: MOCK_TEAMS[4], poolId: 'pool_a', poolName: 'Pool A', poolPosition: 2, isConfirmed: true, mainDrawSeed: 3 },
  { team: MOCK_TEAMS[1], poolId: 'pool_b', poolName: 'Pool B', poolPosition: 1, isConfirmed: true, mainDrawSeed: 2 },
  { team: MOCK_TEAMS[5], poolId: 'pool_b', poolName: 'Pool B', poolPosition: 2, isConfirmed: false, mainDrawSeed: 4 },
];

import { useState } from 'react';
import { CheckCircle, Plus, XCircle, Search, ChevronDown, ChevronUp, User } from 'lucide-react';
import { useAppState, useTournamentData, useToast } from '../context';
import { TopBar } from '../components/Navigation';
import { BackButton, Modal, EmptyState } from '../components/UI';
import { registrationStatusClass, getRegistrationStatusLabel, formatDate, formatDateTime } from '../lib';
import type { Registration, RegistrationStatus } from '../types';

type RegFilter = 'all' | RegistrationStatus;

export function RegistrationsPage() {
  const { selectedTournament, navigate } = useAppState();
  const { registrations, registrationsError, validateRegistration, rejectRegistration, addTeamRegistration } = useTournamentData();
  const { addToast } = useToast();
  const [filter, setFilter] = useState<RegFilter>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Registration | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({
    teamName: '',
    clubName: '',
    clubShortCode: '',
    clubLocation: 'Mauritius',
    player1Name: '',
    player1Nationality: 'MU',
    player1Ranking: '',
    player2Name: '',
    player2Nationality: 'MU',
    player2Ranking: '',
    status: 'pending' as RegistrationStatus,
    notes: '',
  });

  const tournamentRegs = selectedTournament
    ? registrations.filter(r => r.tournamentId === selectedTournament.id)
    : registrations;

  const filtered = tournamentRegs.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const matchesSearch = r.team.name.toLowerCase().includes(search.toLowerCase()) ||
      r.team.player1.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.team.player2.fullName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts: Record<RegFilter, number> = {
    all: tournamentRegs.length,
    pending: tournamentRegs.filter(r => r.status === 'pending').length,
    validated: tournamentRegs.filter(r => r.status === 'validated').length,
    rejected: tournamentRegs.filter(r => r.status === 'rejected').length,
    waitlisted: tournamentRegs.filter(r => r.status === 'waitlisted').length,
  };

  const tabs: { id: RegFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'validated', label: 'Validated' },
    { id: 'rejected', label: 'Rejected' },
  ];

  const handleValidate = async (reg: Registration) => {
    try {
      await validateRegistration(reg.id);
      addToast({ type: 'success', title: 'Registration Validated', message: `${reg.team.name} approved.` });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Validation Failed',
        message: error instanceof Error ? error.message : 'Unable to validate registration.',
      });
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    try {
      await rejectRegistration(rejectTarget.id, rejectReason.trim());
      addToast({ type: 'error', title: 'Registration Rejected', message: `${rejectTarget.team.name} rejected.` });
      setRejectTarget(null);
      setRejectReason('');
      setShowRejectDialog(false);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Rejection Failed',
        message: error instanceof Error ? error.message : 'Unable to reject registration.',
      });
    }
  };

  const handleCreateTeam = async () => {
    if (!selectedTournament) {
      addToast({ type: 'warning', title: 'Select Tournament', message: 'Open a tournament before adding a team.' });
      return;
    }

    if (!teamForm.teamName.trim() || !teamForm.clubName.trim() || !teamForm.clubShortCode.trim() || !teamForm.player1Name.trim() || !teamForm.player2Name.trim()) {
      addToast({ type: 'warning', title: 'Missing Fields', message: 'Team, club, and both player names are required.' });
      return;
    }

    setIsCreatingTeam(true);
    try {
      await addTeamRegistration({
        tournamentId: selectedTournament.id,
        teamName: teamForm.teamName,
        clubName: teamForm.clubName,
        clubShortCode: teamForm.clubShortCode,
        clubLocation: teamForm.clubLocation,
        player1Name: teamForm.player1Name,
        player1Nationality: teamForm.player1Nationality,
        player1Ranking: teamForm.player1Ranking ? parseInt(teamForm.player1Ranking, 10) : undefined,
        player2Name: teamForm.player2Name,
        player2Nationality: teamForm.player2Nationality,
        player2Ranking: teamForm.player2Ranking ? parseInt(teamForm.player2Ranking, 10) : undefined,
        status: teamForm.status,
        notes: teamForm.notes || undefined,
      });
      addToast({ type: 'success', title: 'Team Added', message: `${teamForm.teamName} registered.` });
      setShowCreateTeam(false);
      setTeamForm({
        teamName: '',
        clubName: '',
        clubShortCode: '',
        clubLocation: 'Mauritius',
        player1Name: '',
        player1Nationality: 'MU',
        player1Ranking: '',
        player2Name: '',
        player2Nationality: 'MU',
        player2Ranking: '',
        status: 'pending',
        notes: '',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Team Creation Failed',
        message: error instanceof Error ? error.message : 'Unable to add team.',
      });
    } finally {
      setIsCreatingTeam(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Registrations"
        subtitle={selectedTournament?.name ?? 'All Tournaments'}
        leftAction={selectedTournament ? <BackButton onClick={() => navigate('tournament_detail', selectedTournament.id)} /> : undefined}
        rightAction={
          selectedTournament ? (
            <button onClick={() => setShowCreateTeam(true)} className="btn-gold text-xs px-3 py-1.5 flex items-center gap-1.5">
              <Plus size={13} /> Add Team
            </button>
          ) : undefined
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3 pb-24">
          {registrationsError && (
            <div className="mb-3 rounded-lg border border-mpl-gold/30 bg-mpl-gold/10 px-3 py-2 text-xs text-mpl-gold">
              {registrationsError}
            </div>
          )}

          {/* Search */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mpl-gray" />
            <input className="input-field pl-9" placeholder="Search teams or players..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-mpl-border mb-4 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`${filter === tab.id ? 'tab-active' : 'tab-inactive'} px-3 py-2 text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0`}
              >
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filter === tab.id ? 'bg-mpl-gold text-mpl-black' : 'bg-mpl-border text-mpl-gray'}`}>
                  {counts[tab.id]}
                </span>
              </button>
            ))}
          </div>

          {/* Registration Cards */}
          {filtered.length === 0 ? (
            <EmptyState icon={<CheckCircle />} title="No registrations" description="No registrations match the current filter." />
          ) : (
            <div className="space-y-3">
              {filtered.map(reg => (
                <div key={reg.id} className="mpl-card overflow-hidden">
                  <button
                    className="w-full p-4 text-left"
                    onClick={() => setExpanded(expanded === reg.id ? null : reg.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-mpl-border flex items-center justify-center flex-shrink-0">
                        <User size={16} className="text-mpl-gray" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">{reg.team.name}</p>
                        </div>
                        <p className="text-xs text-mpl-gray">{reg.team.clubName} · {formatDate(reg.submittedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={registrationStatusClass(reg.status)}>{getRegistrationStatusLabel(reg.status)}</span>
                        {expanded === reg.id ? <ChevronUp size={14} className="text-mpl-gray" /> : <ChevronDown size={14} className="text-mpl-gray" />}
                      </div>
                    </div>
                  </button>

                  {expanded === reg.id && (
                    <div className="border-t border-mpl-border px-4 pb-4 pt-3 space-y-3 animate-fade-in">
                      {/* Players */}
                      <div className="space-y-1.5">
                        <p className="section-title">Players</p>
                        <div className="bg-mpl-dark rounded-xl p-3 space-y-2">
                          {[reg.team.player1, reg.team.player2].map((p, i) => (
                            <div key={p.id} className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-white">{p.fullName}</p>
                                <p className="text-xs text-mpl-gray">{p.nationality} · {i === 0 ? 'Player 1' : 'Player 2'}</p>
                              </div>
                              {p.nationalRanking && (
                                <span className="text-xs text-mpl-gold font-semibold">Rank #{p.nationalRanking}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="text-xs space-y-1 text-mpl-gray">
                        <div className="flex justify-between">
                          <span>Submitted</span>
                          <span className="text-white">{formatDateTime(reg.submittedAt)}</span>
                        </div>
                        {reg.validatedAt && (
                          <div className="flex justify-between">
                            <span>Validated</span>
                            <span className="text-green-400">{formatDateTime(reg.validatedAt)} by {reg.validatedBy}</span>
                          </div>
                        )}
                        {reg.rejectionReason && (
                          <div className="mt-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                            <p className="text-red-400 text-xs">Rejection: {reg.rejectionReason}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {reg.status === 'pending' && (
                        <div className="flex gap-2">
                          <button className="btn-gold flex-1 flex items-center justify-center gap-2" onClick={() => handleValidate(reg)}>
                            <CheckCircle size={14} /> Validate
                          </button>
                          <button
                            className="btn-danger flex-1 flex items-center justify-center gap-2"
                            onClick={() => { setRejectTarget(reg); setShowRejectDialog(true); }}
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      <Modal
        isOpen={showRejectDialog}
        onClose={() => { setShowRejectDialog(false); setRejectReason(''); }}
        title={`Reject: ${rejectTarget?.team.name}`}
        size="sm"
        footer={
          <>
            <button className="btn-ghost" onClick={() => { setShowRejectDialog(false); setRejectReason(''); }}>Cancel</button>
            <button className="btn-danger" onClick={handleReject} disabled={!rejectReason.trim()}>Reject Registration</button>
          </>
        }
      >
        <p className="text-sm text-mpl-gray mb-3">Provide a reason for rejection (required):</p>
        <textarea
          className="input-field resize-none"
          rows={3}
          placeholder="e.g. Player eligibility not confirmed..."
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
        />
        <p className="text-xs text-mpl-gray mt-2">⚠️ Team will be notified and event logged.</p>
      </Modal>

      <Modal
        isOpen={showCreateTeam}
        onClose={() => setShowCreateTeam(false)}
        title="Add Team / Players"
        size="lg"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowCreateTeam(false)}>Cancel</button>
            <button className="btn-gold" onClick={() => void handleCreateTeam()} disabled={isCreatingTeam}>
              {isCreatingTeam ? 'Adding...' : 'Add Team'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="section-title">Team Name</label>
            <input
              className="input-field"
              placeholder="Boolell / Gokhool"
              value={teamForm.teamName}
              onChange={e => setTeamForm(prev => ({ ...prev, teamName: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="section-title">Club</label>
              <input
                className="input-field"
                placeholder="Padel Mauritius Club"
                value={teamForm.clubName}
                onChange={e => setTeamForm(prev => ({ ...prev, clubName: e.target.value }))}
              />
            </div>
            <div>
              <label className="section-title">Code</label>
              <input
                className="input-field uppercase"
                placeholder="PMC"
                value={teamForm.clubShortCode}
                onChange={e => setTeamForm(prev => ({ ...prev, clubShortCode: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>

          <div>
            <label className="section-title">Club Location</label>
            <input
              className="input-field"
              value={teamForm.clubLocation}
              onChange={e => setTeamForm(prev => ({ ...prev, clubLocation: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <PlayerFields
              label="Player 1"
              name={teamForm.player1Name}
              nationality={teamForm.player1Nationality}
              ranking={teamForm.player1Ranking}
              onName={value => setTeamForm(prev => ({ ...prev, player1Name: value }))}
              onNationality={value => setTeamForm(prev => ({ ...prev, player1Nationality: value }))}
              onRanking={value => setTeamForm(prev => ({ ...prev, player1Ranking: value }))}
            />
            <PlayerFields
              label="Player 2"
              name={teamForm.player2Name}
              nationality={teamForm.player2Nationality}
              ranking={teamForm.player2Ranking}
              onName={value => setTeamForm(prev => ({ ...prev, player2Name: value }))}
              onNationality={value => setTeamForm(prev => ({ ...prev, player2Nationality: value }))}
              onRanking={value => setTeamForm(prev => ({ ...prev, player2Ranking: value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="section-title">Status</label>
              <select
                className="input-field"
                value={teamForm.status}
                onChange={e => setTeamForm(prev => ({ ...prev, status: e.target.value as RegistrationStatus }))}
              >
                <option value="pending">Pending</option>
                <option value="validated">Validated</option>
                <option value="waitlisted">Waitlisted</option>
              </select>
            </div>
            <div>
              <label className="section-title">Notes</label>
              <input
                className="input-field"
                value={teamForm.notes}
                onChange={e => setTeamForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PlayerFields({
  label,
  name,
  nationality,
  ranking,
  onName,
  onNationality,
  onRanking,
}: {
  label: string;
  name: string;
  nationality: string;
  ranking: string;
  onName: (value: string) => void;
  onNationality: (value: string) => void;
  onRanking: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-mpl-border bg-mpl-dark p-3">
      <p className="section-title">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <input
            className="input-field"
            placeholder="Full name"
            value={name}
            onChange={e => onName(e.target.value)}
          />
        </div>
        <input
          className="input-field uppercase"
          placeholder="MU"
          value={nationality}
          onChange={e => onNationality(e.target.value.toUpperCase())}
        />
        <input
          type="number"
          min={1}
          className="input-field"
          placeholder="Ranking"
          value={ranking}
          onChange={e => onRanking(e.target.value)}
        />
      </div>
    </div>
  );
}

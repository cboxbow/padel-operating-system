import { useState } from 'react';
import { Search, AlertTriangle, Shield } from 'lucide-react';
import { useAppState, useTournamentData } from '../context';
import { TopBar } from '../components/Navigation';
import { BackButton } from '../components/UI';
import { formatDateTime, timeAgo } from '../lib';
import { cn } from '../lib';
import type { AuditLog } from '../types';

// ─── Audit Logs Page ──────────────────────────────────────────────────────────
export function AuditLogsPage() {
  const { navigate, selectedTournament } = useAppState();
  const { auditLogs } = useTournamentData();
  const [search, setSearch] = useState('');
  const [filterOverrides, setFilterOverrides] = useState(false);

  const filtered = auditLogs.filter(log => {
    const matchSearch = search === '' ||
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.module.toLowerCase().includes(search.toLowerCase()) ||
      log.adminName.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());
    const matchOverride = !filterOverrides || log.isOverride;
    return matchSearch && matchOverride;
  });

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Audit Logs"
        subtitle={`${filtered.length} events`}
        leftAction={selectedTournament ? <BackButton onClick={() => navigate('tournament_detail', selectedTournament.id)} /> : undefined}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3 pb-24 space-y-3">
          {/* Search & Filter */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mpl-gray" />
            <input
              className="input-field pl-9"
              placeholder="Search by action, module, admin..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setFilterOverrides(!filterOverrides)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
              filterOverrides
                ? 'bg-red-500/15 border-red-500/40 text-red-400'
                : 'bg-mpl-card border-mpl-border text-mpl-gray hover:border-red-500/30'
            )}
          >
            <AlertTriangle size={12} />
            {filterOverrides ? 'Showing Overrides Only' : 'Filter: Overrides Only'}
          </button>

          {/* Log Items */}
          <div className="space-y-2">
            {filtered.map(log => (
              <AuditLogItem key={log.id} log={log} />
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-mpl-gray text-sm py-12">No audit events found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditLogItem({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      className="w-full mpl-card p-3 text-left hover:border-mpl-gold/20 transition-all"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
          log.isOverride ? 'bg-red-400' : 'bg-mpl-gold'
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-mono font-bold text-mpl-gold">{log.action}</p>
              <p className="text-xs text-mpl-off-white mt-0.5 leading-snug">{log.description}</p>
            </div>
            {log.isOverride && (
              <span className="status-locked flex-shrink-0 text-[9px]">Override</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-mpl-gray border border-mpl-border rounded px-1.5 py-0.5">{log.module}</span>
            <span className="text-[10px] text-mpl-gray">{log.adminName}</span>
            <span className="text-[10px] text-mpl-gray ml-auto">{timeAgo(log.createdAt)}</span>
          </div>
          {expanded && (
            <div className="mt-3 pt-3 border-t border-mpl-border space-y-1.5 animate-fade-in">
              <div className="flex justify-between text-[10px]">
                <span className="text-mpl-gray">Timestamp</span>
                <span className="text-white font-mono">{formatDateTime(log.createdAt)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-mpl-gray">Entity</span>
                <span className="text-white">{log.entityType} / {log.entityId}</span>
              </div>
              {log.overrideReason && (
                <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20 mt-2">
                  <p className="text-[10px] text-red-400 font-semibold mb-0.5">Override Reason:</p>
                  <p className="text-[10px] text-mpl-off-white">{log.overrideReason}</p>
                </div>
              )}
              {log.previousState && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-mpl-gray">Previous</span>
                  <span className="text-orange-400 font-mono">{JSON.stringify(log.previousState)}</span>
                </div>
              )}
              {log.newState && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-mpl-gray">New State</span>
                  <span className="text-green-400 font-mono">{JSON.stringify(log.newState)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Admin Overrides Page ─────────────────────────────────────────────────────
export function OverridesPage() {
  useAppState(); // page state available if needed
  const { overrides } = useTournamentData();

  const typeColors: Record<string, string> = {
    seed_change: 'text-mpl-gold border-mpl-gold/40',
    slot_swap: 'text-purple-400 border-purple-400/40',
    score_correction: 'text-blue-400 border-blue-400/40',
    status_override: 'text-orange-400 border-orange-400/40',
    manual_placement: 'text-green-400 border-green-400/40',
  };

  const typeLabels: Record<string, string> = {
    seed_change: 'Seed Change',
    slot_swap: 'Slot Swap',
    score_correction: 'Score Correction',
    status_override: 'Status Override',
    manual_placement: 'Manual Placement',
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Admin Overrides"
        subtitle={`${overrides.length} recorded overrides`}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-24">
          {/* Banner */}
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 mb-4">
            <Shield size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 leading-relaxed">
              All overrides are recorded with a mandatory reason and cannot be deleted. This log is the official audit trail for tournament integrity.
            </p>
          </div>

          {/* Override Cards */}
          <div className="space-y-3">
            {overrides.map(ov => (
              <div key={ov.id} className="mpl-card p-4 border-l-2 border-l-red-500/50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={cn(
                    'text-[10px] font-bold uppercase tracking-widest border rounded px-1.5 py-0.5',
                    typeColors[ov.type] ?? 'text-mpl-gray border-mpl-border'
                  )}>
                    {typeLabels[ov.type] ?? ov.type}
                  </span>
                  <span className="text-[10px] text-mpl-gray">{timeAgo(ov.createdAt)}</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-mpl-gray flex-shrink-0">Entity</span>
                    <span className="text-white text-right">{ov.entityType} / {ov.entityId}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-mpl-gray flex-shrink-0">Changed</span>
                    <div className="text-right">
                      <span className="text-orange-400 line-through">{ov.previousValue}</span>
                      <span className="text-mpl-gray mx-1.5">→</span>
                      <span className="text-green-400">{ov.newValue}</span>
                    </div>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-mpl-gray flex-shrink-0">By</span>
                    <span className="text-white">{ov.adminName}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-mpl-gray flex-shrink-0">Time</span>
                    <span className="text-white font-mono text-[10px]">{formatDateTime(ov.createdAt)}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-mpl-border">
                  <p className="text-[10px] text-mpl-gray mb-1 font-semibold uppercase tracking-wider">Reason</p>
                  <p className="text-xs text-mpl-off-white leading-relaxed">{ov.reason}</p>
                </div>
              </div>
            ))}
            {overrides.length === 0 && (
              <p className="text-center text-mpl-gray text-sm py-12">No overrides recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

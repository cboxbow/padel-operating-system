
import {
  Trophy, ClipboardList, Users, Shield,
  ChevronRight, AlertTriangle
} from 'lucide-react';
import { useAppState, useTournamentData } from '../context';
import { StatCard, GoldDivider } from '../components/UI';
import { MPLHeader } from '../components/Navigation';
import { tournamentStatusClass, getTournamentStatusLabel, formatDate } from '../lib';
import { cn } from '../lib';

export function DashboardPage() {
  const { navigate, tournaments, tournamentsError } = useAppState();
  const { registrations, auditLogs, overrides } = useTournamentData();

  const pendingRegs = registrations.filter(r => r.status === 'pending').length;
  const activeTournaments = tournaments.filter(t =>
    !['draft', 'locked', 'completed'].includes(t.status)
  ).length;
  const draftTournaments = tournaments.filter(t => t.status === 'draft').length;
  const totalOverrides = overrides.length;
  const recentLogs = auditLogs.slice(0, 5);

  const urgentTournaments = tournaments.filter(t =>
    ['pool_draw_ready', 'main_draw_ready', 'registration_closed'].includes(t.status)
  );

  return (
    <div className="flex flex-col h-full">
      <MPLHeader />
      <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-4 pb-24 space-y-5">
          {tournamentsError && (
            <div className="rounded-lg border border-mpl-gold/30 bg-mpl-gold/10 px-3 py-2 text-xs text-mpl-gold">
              {tournamentsError}
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Active Tournaments" value={activeTournaments} sub={`${draftTournaments} in draft`} />
            <StatCard
              label="Pending Registrations"
              value={pendingRegs}
              sub="Awaiting validation"
              color={pendingRegs > 0 ? 'text-orange-400' : 'text-green-400'}
            />
            <StatCard label="Admin Overrides" value={totalOverrides} sub="This season" color="text-red-400" />
            <StatCard label="Audit Events" value={auditLogs.length} sub="All time" color="text-blue-400" />
          </div>

          {/* Action Required */}
          {urgentTournaments.length > 0 && (
            <div className="mpl-card-gold p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-mpl-gold" />
                <p className="text-xs font-bold text-mpl-gold uppercase tracking-widest">Action Required</p>
              </div>
              <div className="space-y-2">
                {urgentTournaments.map(t => (
                  <button
                    key={t.id}
                    onClick={() => navigate('tournament_detail', t.id)}
                    className="w-full flex items-center gap-3 py-2.5 px-3 bg-mpl-black/50 rounded-xl hover:bg-mpl-black transition-colors"
                  >
                    <span className={tournamentStatusClass(t.status)}>{getTournamentStatusLabel(t.status)}</span>
                    <span className="text-sm text-white flex-1 text-left font-medium truncate">{t.name}</span>
                    <ChevronRight size={14} className="text-mpl-gold flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <p className="section-title">Quick Actions</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Trophy size={18} />, label: 'Tournaments', view: 'tournaments' as const, color: 'text-mpl-gold' },
                { icon: <ClipboardList size={18} />, label: 'Registrations', view: 'registrations' as const, color: 'text-orange-400', badge: pendingRegs },
                { icon: <Users size={18} />, label: 'Team List', view: 'team_list' as const, color: 'text-blue-400' },
                { icon: <Shield size={18} />, label: 'Overrides', view: 'overrides' as const, color: 'text-red-400' },
              ].map(item => (
                <button
                  key={item.view}
                  onClick={() => navigate(item.view)}
                  className="mpl-card p-4 flex flex-col items-start gap-2 hover:border-mpl-gold/30 transition-all active:scale-[0.98] text-left"
                >
                  <div className="relative">
                    <div className={cn('p-2 rounded-xl bg-mpl-border', item.color)}>{item.icon}</div>
                    {item.badge ? (
                      <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-sm font-semibold text-white">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <GoldDivider />

          {/* Recent Tournaments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="section-title mb-0">Recent Tournaments</p>
              <button onClick={() => navigate('tournaments')} className="text-xs text-mpl-gold font-semibold">View All</button>
            </div>
            <div className="space-y-2">
              {tournaments.slice(0, 3).map(t => (
                <button
                  key={t.id}
                  onClick={() => navigate('tournament_detail', t.id)}
                  className="w-full mpl-card p-3 flex items-center gap-3 text-left hover:border-mpl-gold/30 transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-mpl-gold/10 border border-mpl-gold/20 flex items-center justify-center flex-shrink-0">
                    <Trophy size={14} className="text-mpl-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                    <p className="text-xs text-mpl-gray">{formatDate(t.startDate)}</p>
                  </div>
                  <span className={tournamentStatusClass(t.status)}>{getTournamentStatusLabel(t.status)}</span>
                </button>
              ))}
            </div>
          </div>

          <GoldDivider />

          {/* Recent Audit */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="section-title mb-0">Recent Activity</p>
              <button onClick={() => navigate('audit_logs')} className="text-xs text-mpl-gold font-semibold">All Logs</button>
            </div>
            <div className="space-y-2">
              {recentLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 py-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                    log.isOverride ? 'bg-red-400' : 'bg-mpl-gold'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium">{log.description}</p>
                    <p className="text-[10px] text-mpl-gray mt-0.5">{log.module} · {log.adminName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

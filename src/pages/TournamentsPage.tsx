import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useAppState, useToast } from '../context';
import { TournamentCard, TopBar } from '../components/Navigation';
import { Modal, Spinner } from '../components/UI';
import type { Tournament } from '../types';

type FilterTab = 'all' | 'active' | 'draft' | 'completed';

export function TournamentsPage() {
  const { navigate, tournaments, isLoadingTournaments, tournamentsError, addTournament } = useAppState();
  const { addToast } = useToast();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    venue: '',
    startDate: '',
    endDate: '',
    maxTeams: '16',
    eventType: 'doubles' as Tournament['eventType'],
    category: 'open' as Tournament['category'],
    status: 'draft' as Tournament['status'],
    competitionMode: 'main_draw_direct' as Tournament['competitionMode'],
    qualifiersPerPool: '2',
    poolCount: '4',
  });

  const filtered = tournaments.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'draft') return t.status === 'draft';
    if (filter === 'active') return !['draft', 'locked', 'completed'].includes(t.status);
    if (filter === 'completed') return t.status === 'locked' || t.status === 'completed';
    return true;
  });

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: tournaments.length },
    { id: 'active', label: 'Active', count: tournaments.filter(t => !['draft', 'locked', 'completed'].includes(t.status)).length },
    { id: 'draft', label: 'Draft', count: tournaments.filter(t => t.status === 'draft').length },
    { id: 'completed', label: 'Completed', count: tournaments.filter(t => ['locked', 'completed'].includes(t.status)).length },
  ];

  const handleCreate = async () => {
    if (!form.name.trim() || !form.venue.trim() || !form.startDate || !form.endDate) return;
    setIsSubmitting(true);
    try {
      await addTournament({
        name: form.name.trim(),
        venue: form.venue.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        maxTeams: parseInt(form.maxTeams, 10) || 16,
        eventType: form.eventType,
        category: form.category,
        status: form.status,
        competitionMode: form.competitionMode,
        qualifiersPerPool: parseInt(form.qualifiersPerPool, 10) || 2,
        poolCount: parseInt(form.poolCount, 10) || 4,
      });
      addToast({ type: 'success', title: 'Tournament Created', message: form.name.trim() });
      setShowCreate(false);
      setForm({
        name: '',
        venue: '',
        startDate: '',
        endDate: '',
        maxTeams: '16',
        eventType: 'doubles',
        category: 'open',
        status: 'draft',
        competitionMode: 'main_draw_direct',
        qualifiersPerPool: '2',
        poolCount: '4',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Create Failed',
        message: error instanceof Error ? error.message : 'Unable to create tournament.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Tournaments"
        subtitle={`${tournaments.length} total`}
        rightAction={
          <button onClick={() => setShowCreate(true)} className="btn-gold text-xs px-3 py-1.5 flex items-center gap-1.5">
            <Plus size={13} /> New
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3 pb-24">
          {tournamentsError && (
            <div className="mb-3 rounded-lg border border-mpl-gold/30 bg-mpl-gold/10 px-3 py-2 text-xs text-mpl-gold">
              {tournamentsError}
            </div>
          )}

          {isLoadingTournaments && <Spinner />}

          {/* Search */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mpl-gray" />
            <input
              className="input-field pl-9"
              placeholder="Search tournaments..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 border-b border-mpl-border mb-4">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`${filter === t.id ? 'tab-active' : 'tab-inactive'} px-3 py-2 text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap`}
              >
                {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filter === t.id ? 'bg-mpl-gold text-mpl-black' : 'bg-mpl-border text-mpl-gray'}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tournament list */}
          <div className="space-y-3">
            {filtered.map(t => (
              <TournamentCard
                key={t.id}
                tournament={t}
                onClick={() => navigate('tournament_detail', t.id)}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-mpl-gray text-sm py-12">No tournaments found.</p>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Tournament"
        size="sm"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-gold" onClick={() => void handleCreate()} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="section-title">Name</label>
            <input className="input-field" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div>
            <label className="section-title">Venue</label>
            <input className="input-field" value={form.venue} onChange={e => setForm(prev => ({ ...prev, venue: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="section-title">Start</label>
              <input type="date" className="input-field" value={form.startDate} onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="section-title">End</label>
              <input type="date" className="input-field" value={form.endDate} onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="section-title">Competition Flow</label>
            <select
              className="input-field"
              value={form.competitionMode}
              onChange={e => setForm(prev => ({ ...prev, competitionMode: e.target.value as Tournament['competitionMode'] }))}
            >
              <option value="main_draw_direct">Main Draw Direct</option>
              <option value="qualification_phase">Phase Qualifs</option>
            </select>
          </div>
          {form.competitionMode === 'qualification_phase' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="section-title">Pools</label>
                <input
                  type="number"
                  min={1}
                  max={16}
                  className="input-field"
                  value={form.poolCount}
                  onChange={e => setForm(prev => ({ ...prev, poolCount: e.target.value }))}
                />
              </div>
              <div>
                <label className="section-title">Qualifiers</label>
                <select
                  className="input-field"
                  value={form.qualifiersPerPool}
                  onChange={e => setForm(prev => ({ ...prev, qualifiersPerPool: e.target.value }))}
                >
                  <option value="1">Top 1</option>
                  <option value="2">Top 2</option>
                  <option value="3">Top 3</option>
                  <option value="4">Top 4</option>
                </select>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="section-title">Event</label>
              <select className="input-field" value={form.eventType} onChange={e => setForm(prev => ({ ...prev, eventType: e.target.value as Tournament['eventType'] }))}>
                <option value="singles">Singles</option>
                <option value="doubles">Doubles</option>
                <option value="mixed_doubles">Mixed Doubles</option>
              </select>
            </div>
            <div>
              <label className="section-title">Category</label>
              <select className="input-field" value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value as Tournament['category'] }))}>
                <option value="open">Open</option>
                <option value="pro">Pro</option>
                <option value="amateur">Amateur</option>
                <option value="junior">Junior</option>
                <option value="senior">Senior</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="section-title">Max Teams</label>
              <input type="number" min={2} className="input-field" value={form.maxTeams} onChange={e => setForm(prev => ({ ...prev, maxTeams: e.target.value }))} />
            </div>
            <div>
              <label className="section-title">Status</label>
              <select className="input-field" value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as Tournament['status'] }))}>
                <option value="draft">Draft</option>
                <option value="registration_open">Registration Open</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

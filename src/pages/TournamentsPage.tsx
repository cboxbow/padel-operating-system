import { useState } from 'react';
import { Search } from 'lucide-react';
import { useAppState } from '../context';
import { TournamentCard, TopBar } from '../components/Navigation';
import { Spinner } from '../components/UI';

type FilterTab = 'all' | 'active' | 'draft' | 'completed';

export function TournamentsPage() {
  const { navigate, tournaments, isLoadingTournaments, tournamentsError } = useAppState();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

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

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Tournaments" subtitle={`${tournaments.length} total`} />
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
    </div>
  );
}

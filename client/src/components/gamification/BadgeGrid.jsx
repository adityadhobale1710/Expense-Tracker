import { useState, useMemo } from 'react';
import { useGamification } from '../../context/GamificationContext';
import BadgeCard from './BadgeCard';


const CATEGORY_ICONS = {
  Savings: '💰', Budget: '🧱', Investment: '📈', Consistency: '🔥',
  AI: '🤖', Security: '🔐', Profile: '👤', Special: '✨',
  Loans: '🏛️', Wallets: '👛', Subscriptions: '📺', Family: '👨‍👩‍👧',
  All: '🎯', Unlocked: '🔓', Locked: '🔒',
  Common: '⚪', Rare: '🔵', Epic: '🟣', Legendary: '🟡', Mythic: '🔴',
};

export default function BadgeGrid() {
  const { achievements, pinnedBadges, updatePinnedBadges } = useGamification();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [page, setPage] = useState(1);
  const PER_PAGE = 12;

  const categories = useMemo(() => {
    const cats = [...new Set(achievements.map(a => a.category).filter(Boolean))];
    return cats.sort();
  }, [achievements]);

  const filtered = useMemo(() => {
    return achievements.filter(a => {
      const matchSearch = !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase());

      const matchState =
        filter === 'All' ? true :
        filter === 'Unlocked' ? a.unlocked :
        filter === 'Locked' ? !a.unlocked : true;

      const matchRarity =
        ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'].includes(filter)
          ? a.tier === filter : true;

      const matchCategory =
        categoryFilter === 'All' ? true : a.category === categoryFilter;

      return matchSearch && matchState && matchRarity && matchCategory;
    });
  }, [achievements, search, filter, categoryFilter]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const handlePin = (id) => {
    let newPins;
    if (pinnedBadges.includes(id)) {
      newPins = pinnedBadges.filter(p => p !== id);
    } else if (pinnedBadges.length < 3) {
      newPins = [...pinnedBadges, id];
    } else {
      return; // Max 3
    }
    updatePinnedBadges(newPins);
  };

  const stateFilters = ['All', 'Unlocked', 'Locked', 'Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
  const counts = useMemo(() => {
    const c = {};
    stateFilters.forEach(f => {
      c[f] = f === 'All' ? achievements.length :
              f === 'Unlocked' ? achievements.filter(a => a.unlocked).length :
              f === 'Locked' ? achievements.filter(a => !a.unlocked).length :
              achievements.filter(a => a.tier === f).length;
    });
    return c;
  }, [achievements]);

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Search badges..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
        />
      </div>

      {/* State / Rarity filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {stateFilters.map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`flex-shrink-0 text-xs px-3.5 py-1.5 rounded-full font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === f
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span>{CATEGORY_ICONS[f] || '•'}</span>
            <span>{f}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${filter === f ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>
              {counts[f] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {['All', ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => { setCategoryFilter(cat); setPage(1); }}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              categoryFilter === cat
                ? 'bg-violet-600/80 border-violet-500 text-white'
                : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{CATEGORY_ICONS[cat] || '📌'}</span>
            <span>{cat}</span>
          </button>
        ))}
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
        {paginated.length > 0 ? (
          paginated.map(ach => (
            <BadgeCard
              key={ach.id}
              ach={ach}
              onPin={handlePin}
              isPinned={pinnedBadges.includes(ach.id)}
            />
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-slate-500 text-sm font-semibold">
            No badges match your filters. Try another search or category.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            className="bg-slate-900/40 border border-slate-800 text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-75 disabled:pointer-events-none transition-all cursor-pointer"
          >
            ← Prev
          </button>
          <span className="text-xs text-slate-400 font-semibold">Page {page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            className="bg-slate-900/40 border border-slate-800 text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-75 disabled:pointer-events-none transition-all cursor-pointer"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

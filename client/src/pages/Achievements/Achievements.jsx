import { useState } from 'react';
import { useGamification } from '../../context/GamificationContext';
import { XP_ACTIONS, PROGRESSION_LEVELS } from './achievementsData';
import { REWARD_ACTIONS } from '../../constants/rewardConstants';

// ── Components ──────────────────────────────────────────────────────────────
import LevelCard from '../../components/gamification/LevelCard';
import SeasonCard from '../../components/gamification/SeasonCard';
import MultiplierBanner from '../../components/gamification/MultiplierBanner';
import DailyChallenges from '../../components/gamification/DailyChallenges';
import StreakCard from '../../components/gamification/StreakCard';
import AchievementShowcase from '../../components/gamification/AchievementShowcase';
import BadgeGrid from '../../components/gamification/BadgeGrid';
import XPAnalytics from '../../components/gamification/XPAnalytics';
import StatsPanel from '../../components/gamification/StatsPanel';
import RankBadge from '../../components/gamification/RankBadge';
import { calculateLevel } from '../../services/rewardService';

// ── Tabs ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',    label: 'Overview',    icon: '🏠' },
  { id: 'badges',      label: 'Badges',      icon: '🏆' },
  { id: 'analytics',   label: 'Analytics',   icon: '📊' },
  { id: 'progression', label: 'Progression', icon: '🌌' },
];

// ── Progression Roadmap Tab ──────────────────────────────────────────────────
function ProgressionTab({ xp, simulatedActions, applyReward }) {
  const { currentLvl } = calculateLevel(xp);

  return (
    <div className="space-y-8">
      {/* Progression Roadmap */}
      <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-black text-slate-100 pb-3 border-b border-slate-700/50 flex items-center gap-2">
          🌌 Progression Roadmap
        </h3>

        <div className="relative overflow-x-auto pb-6 pt-8 scrollbar-thin mt-4">
          {/* Connecting line */}
          <div className="absolute top-[52px] left-8 right-8 h-0.5 bg-slate-800 border-t border-slate-700/50 rounded-full z-0" />

          <div className="flex gap-10 px-4 min-w-max relative z-10">
            {PROGRESSION_LEVELS.map(lvl => {
              const isCurrent = currentLvl.level === lvl.level;
              const isUnlocked = xp >= lvl.xpRequired;

              return (
                <div key={lvl.level} className="flex flex-col items-center text-center w-28 relative group">
                  {/* Node */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base border-2 transition-all duration-300 ${
                    isCurrent
                      ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-110 font-bold'
                      : isUnlocked
                      ? 'bg-slate-900 border-emerald-500 text-slate-200'
                      : 'bg-dark-900 border-slate-800 text-slate-600 opacity-60'
                  }`}>
                    {isCurrent ? '⚡' : lvl.icon}
                  </div>

                  <p className={`text-xs mt-3 font-extrabold ${isCurrent ? 'text-indigo-400' : isUnlocked ? 'text-slate-200' : 'text-slate-600'}`}>
                    Level {lvl.level}
                  </p>
                  <p className={`text-[10px] font-bold mt-0.5 truncate max-w-[90px] ${isCurrent ? 'text-amber-400' : isUnlocked ? 'text-slate-400' : 'text-slate-700'}`}>
                    {lvl.name}
                  </p>
                  <p className="text-[8px] text-slate-600 font-mono mt-1">
                    {lvl.xpRequired.toLocaleString('en-IN')} XP
                  </p>
                  {/* Every 5 levels = chest */}
                  {lvl.level % 5 === 0 && (
                    <span className="text-[9px] mt-1 text-amber-400">🎁</span>
                  )}

                  {/* Reward tooltip */}
                  <div className="absolute top-[calc(100%+8px)] scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 w-36 bg-slate-900 border border-slate-700/80 rounded-xl p-2 z-20 pointer-events-none shadow-xl">
                    <p className="text-[8px] text-slate-500 border-b border-slate-800 pb-1 mb-1 uppercase font-black text-center">Reward</p>
                    <p className="text-[9px] text-slate-300 text-center font-bold">{lvl.reward}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rank tiers */}
      <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-black text-slate-100 pb-3 border-b border-slate-700/50 flex items-center gap-2 mb-4">
          👑 Rank Tiers
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {[
            { name: 'Bronze',   minXP: 0,       icon: '🥉', color: '#cd7f32' },
            { name: 'Silver',   minXP: 5000,    icon: '🥈', color: '#c0c0c0' },
            { name: 'Gold',     minXP: 15000,   icon: '🥇', color: '#ffd700' },
            { name: 'Platinum', minXP: 35000,   icon: '💠', color: '#e5e4e2' },
            { name: 'Diamond',  minXP: 70000,   icon: '💎', color: '#b9f2ff' },
            { name: 'Master',   minXP: 130000,  icon: '🔮', color: '#8b5cf6' },
            { name: 'Legend',   minXP: 250000,  icon: '👑', color: '#f59e0b' },
          ].map(tier => {
            const isReached = xp >= tier.minXP;
            return (
              <div key={tier.name}
                className={`rounded-2xl border p-3 text-center transition-all ${isReached ? 'border-opacity-40' : 'opacity-40 border-slate-800'}`}
                style={isReached ? { borderColor: `${tier.color}40`, background: `${tier.color}10` } : {}}
              >
                <div className="text-2xl mb-1">{tier.icon}</div>
                <p className="text-[10px] font-extrabold" style={{ color: isReached ? tier.color : '#475569' }}>{tier.name}</p>
                <p className="text-[8px] text-slate-600 font-mono mt-0.5">{tier.minXP.toLocaleString('en-IN')}+ XP</p>
                {isReached && <p className="text-[9px] text-emerald-400 font-bold mt-1">✓ Earned</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats + XP Simulator */}
      <div className="space-y-4">
        <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
          📈 Your Stats
        </h3>
        <StatsPanel />
      </div>

      {/* XP Simulator */}
      <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl">
        <div className="pb-3 border-b border-slate-700/50 flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-black text-slate-100">⚙️ XP Action Simulator</h3>
            <p className="text-xs text-slate-400 mt-0.5">Simulate financial actions to earn XP and unlock badges</p>
          </div>
          <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded-lg font-bold">
            Interactive
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {XP_ACTIONS.map(action => {
            const isCompleted = simulatedActions.includes(action.id);
            const actionKey = action.id.toUpperCase();
            return (
              <button
                key={action.id}
                disabled={isCompleted}
                onClick={() => applyReward(actionKey)}
                className={`p-2.5 rounded-xl text-left text-xs font-semibold transition-all flex flex-col justify-between h-[85px] group cursor-pointer ${
                  isCompleted
                    ? 'bg-slate-900/10 border border-slate-900/30 opacity-40 cursor-not-allowed'
                    : 'bg-slate-900/40 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 hover:scale-105 active:scale-95'
                }`}
              >
                <span className={`line-clamp-2 leading-tight ${isCompleted ? 'text-slate-500' : 'text-slate-300 group-hover:text-indigo-300'}`}>
                  {action.label} {isCompleted && '✓'}
                </span>
                <div className="flex justify-between items-center w-full mt-2 pt-1 border-t border-slate-800/60">
                  <span className={`text-[10px] font-bold ${isCompleted ? 'text-slate-600' : 'text-indigo-400'}`}>+{action.xp} XP</span>
                  <span className={`text-[10px] font-bold ${isCompleted ? 'text-slate-600' : 'text-yellow-500'}`}>+{action.coins}🪙</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function Achievements() {
  const [activeTab, setActiveTab] = useState('overview');
  const {
    xp, coins, level, streak, longestStreak, achievements,
    simulatedActions, isLoaded, applyReward,
  } = useGamification();

  return (
    <div className="space-y-6 pb-10">
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">
          🏆 Achievements & Progress
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Your financial journey, gamified. Earn XP, unlock badges, and level up.
        </p>
      </div>

      {/* Multiplier event banner (only shows when active) */}
      <MultiplierBanner />

      {/* Profile hero */}
      <LevelCard />

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Season + Showcase row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SeasonCard />
            <AchievementShowcase />
          </div>

          {/* Challenges + Streak row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DailyChallenges />
            <StreakCard />
          </div>
        </div>
      )}

      {/* Tab: Badges */}
      {activeTab === 'badges' && (
        <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          <div className="pb-4 border-b border-slate-700/40 mb-5">
            <h3 className="text-base font-black text-slate-100">All Badges</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {achievements.filter(a => a.unlocked).length} / {achievements.length} unlocked •{' '}
              Pin up to 3 badges to your showcase
            </p>
          </div>
          <BadgeGrid />
        </div>
      )}



      {/* Tab: Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <div className="pb-4 border-b border-slate-700/40 mb-6">
              <h3 className="text-base font-black text-slate-100">XP Analytics</h3>
              <p className="text-xs text-slate-400 mt-0.5">Track your financial XP earnings over time</p>
            </div>
            <XPAnalytics />
          </div>
        </div>
      )}

      {/* Tab: Progression */}
      {activeTab === 'progression' && (
        <ProgressionTab
          xp={xp}
          simulatedActions={simulatedActions}
          applyReward={applyReward}
        />
      )}
    </div>
  );
}

// ─── REWARD ACTIONS ─────────────────────────────────────────────────────────
// Single source of truth for all XP/Coin rewards.
// Keys map to action IDs used in rewardService.computeReward(actionId, state)
export const REWARD_ACTIONS = {
  // Core financial actions
  ADD_EXPENSE:            { xp: 50,   coins: 5   },
  ADD_INCOME:             { xp: 50,   coins: 5   },
  UPLOAD_RECEIPT:         { xp: 150,  coins: 15  },
  CATEGORIZE_EXPENSE:     { xp: 40,   coins: 4   },

  // Budget
  CREATE_BUDGET:          { xp: 200,  coins: 20  },
  STAY_DAILY_BUDGET:      { xp: 100,  coins: 10  },
  STAY_WEEKLY_BUDGET:     { xp: 300,  coins: 30  },
  STAY_MONTHLY_BUDGET:    { xp: 1000, coins: 100 },

  // Goals
  ADD_GOAL:               { xp: 150,  coins: 15  },
  REACH_GOAL:             { xp: 1000, coins: 100 },
  GOAL_COMPLETED:         { xp: 500,  coins: 50  },
  GOAL_CONTRIBUTION:      { xp: 75,   coins: 8   },

  // Investments
  ADD_INVESTMENT:         { xp: 300,  coins: 30  },

  // Loans
  ADD_LOAN:               { xp: 150,  coins: 15  },
  MAKE_LOAN_PAYMENT:      { xp: 200,  coins: 20  },
  PAY_EMI:                { xp: 250,  coins: 25  },
  PAYOFF_LOAN:            { xp: 1000, coins: 100 },
  PAY_LOAN_ON_TIME:       { xp: 250,  coins: 25  },

  // Wallets
  ADD_WALLET:             { xp: 150,  coins: 15  },
  WALLET_TRANSFER:        { xp: 200,  coins: 20  },
  TRANSFER:               { xp: 200,  coins: 20  },
  DIVERSE_WALLETS:        { xp: 300,  coins: 30  },
  WALLET_MILESTONE:       { xp: 1500, coins: 150 },
  WALLET_BALANCE_30D:     { xp: 1000, coins: 100 },

  // Subscriptions
  ADD_SUBSCRIPTION:       { xp: 150,  coins: 15  },
  VIEW_SUBSCRIPTIONS:     { xp: 75,   coins: 7   },
  CANCEL_SUBSCRIPTION:    { xp: 250,  coins: 25  },
  REVIEW_SUB_BUDGET:      { xp: 300,  coins: 30  },
  SWITCH_ANNUAL_PLAN:     { xp: 400,  coins: 40  },
  SUBSCRIPTION_RENEWED:   { xp: 75,   coins: 7   },

  // Reporting & Analytics
  EXPORT_REPORTS:         { xp: 200,  coins: 20  },
  VIEW_ANALYTICS:         { xp: 75,   coins: 7   },
  COMPLETE_REVIEW:        { xp: 500,  coins: 50  },
  TRACK_BILLS:            { xp: 100,  coins: 10  },
  PAY_BILLS_ON_TIME:      { xp: 250,  coins: 25  },

  // Social / Family
  CREATE_FAMILY:          { xp: 150,  coins: 15  },
  INVITE_FAMILY_MEMBER:   { xp: 200,  coins: 20  },
  LOG_FAMILY_EXPENSE:     { xp: 200,  coins: 20  },
  SET_FAMILY_BUDGET:      { xp: 300,  coins: 30  },
  FAMILY_ACTIVE_30D:      { xp: 1000, coins: 100 },
  CREATE_SPLIT_BILL:      { xp: 300,  coins: 30  },
  SETTLE_SPLIT_BILL:      { xp: 500,  coins: 50  },
  INVITE_FRIENDS:         { xp: 500,  coins: 50  },

  // Engagement
  DAILY_LOGIN:            { xp: 100,  coins: 10  },
  MAINTAIN_STREAK:        { xp: 150,  coins: 15  },
  BACKUP_DATA:            { xp: 100,  coins: 10  },
  COMPLETE_CHALLENGE:     { xp: 60,   coins: 12  },

  // Financial Health (behaviour-based rewards)
  SAVED_15_PERCENT:       { xp: 120,  coins: 20  },
  NO_IMPULSE_WEEK:        { xp: 90,   coins: 15  },
  EMERGENCY_FUND_BUILT:   { xp: 300,  coins: 50  },
  NET_POSITIVE_MONTH:     { xp: 200,  coins: 30  },
};

// ─── XP MULTIPLIER EVENTS ───────────────────────────────────────────────────
export const XP_MULTIPLIERS = {
  WEEKEND:       { value: 2.0,  label: '2× Weekend Boost',    icon: '🎉', color: 'from-amber-500 to-yellow-400' },
  HOLIDAY:       { value: 1.5,  label: '1.5× Holiday Event',  icon: '🎄', color: 'from-emerald-500 to-teal-400' },
  STREAK_BONUS:  { value: 1.1,  label: '+10% Streak Bonus',   icon: '🔥', color: 'from-orange-500 to-red-400' },
  SEASON_FINALE: { value: 3.0,  label: '3× Season Finale',    icon: '🏆', color: 'from-purple-500 to-fuchsia-400' },
};

// ─── RANK TIERS ─────────────────────────────────────────────────────────────
// Based on lifetimeXP (never resets between seasons)
export const RANK_TIERS = [
  { name: 'Bronze',   minXP: 0,       color: '#cd7f32', textColor: 'text-amber-700',   bgColor: 'bg-amber-700/10',   borderColor: 'border-amber-700/30',   icon: '🥉', gradient: 'from-amber-700 to-amber-500' },
  { name: 'Silver',   minXP: 5000,    color: '#c0c0c0', textColor: 'text-slate-300',   bgColor: 'bg-slate-400/10',   borderColor: 'border-slate-400/30',   icon: '🥈', gradient: 'from-slate-400 to-slate-300' },
  { name: 'Gold',     minXP: 15000,   color: '#ffd700', textColor: 'text-yellow-400',  bgColor: 'bg-yellow-400/10',  borderColor: 'border-yellow-400/30',  icon: '🥇', gradient: 'from-yellow-400 to-amber-300' },
  { name: 'Platinum', minXP: 35000,   color: '#e5e4e2', textColor: 'text-cyan-300',    bgColor: 'bg-cyan-400/10',    borderColor: 'border-cyan-400/30',    icon: '💠', gradient: 'from-cyan-400 to-blue-300' },
  { name: 'Diamond',  minXP: 70000,   color: '#b9f2ff', textColor: 'text-sky-300',     bgColor: 'bg-sky-400/10',     borderColor: 'border-sky-400/30',     icon: '💎', gradient: 'from-sky-400 to-indigo-400' },
  { name: 'Master',   minXP: 130000,  color: '#8b5cf6', textColor: 'text-purple-400',  bgColor: 'bg-purple-500/10',  borderColor: 'border-purple-500/30',  icon: '🔮', gradient: 'from-purple-500 to-fuchsia-500' },
  { name: 'Legend',   minXP: 250000,  color: '#f59e0b', textColor: 'text-amber-400',   bgColor: 'bg-amber-400/10',   borderColor: 'border-amber-400/30',   icon: '👑', gradient: 'from-amber-400 to-yellow-300' },
];

// Compute rank from lifetime XP
export function getRankFromXP(lifetimeXP = 0) {
  let rank = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (lifetimeXP >= tier.minXP) rank = tier;
    else break;
  }
  return rank;
}

// ─── REWARD CHESTS ──────────────────────────────────────────────────────────
// Unlocked at every 5th level
export const CHEST_REWARDS = {
  5:  { coins: 200,  title: 'Budget Rookie',    badge: null,              color: 'from-amber-600 to-yellow-500',  label: 'Apprentice Chest' },
  10: { coins: 500,  title: 'Wealth Seeker',    badge: 'chest_10',        color: 'from-slate-400 to-slate-300',   label: 'Silver Chest' },
  15: { coins: 1000, title: 'Finance Master',   badge: 'chest_15',        color: 'from-yellow-400 to-amber-300',  label: 'Gold Chest' },
  20: { coins: 2000, title: 'Platinum Saver',   badge: 'chest_20',        color: 'from-cyan-400 to-blue-300',     label: 'Platinum Chest' },
  25: { coins: 3500, title: 'Diamond Investor', badge: 'chest_25',        color: 'from-sky-400 to-indigo-400',    label: 'Diamond Chest' },
  30: { coins: 5000, title: 'Finance Grandmaster', badge: 'chest_30',     color: 'from-purple-500 to-fuchsia-500', label: 'Master Chest' },
};

// ─── BADGE RARITY CONFIGS ───────────────────────────────────────────────────
export const RARITY_CONFIG = {
  Common:    { color: 'text-slate-300',   border: 'border-slate-600/50',   glow: '',                                    gradient: 'from-slate-800/40 to-slate-900/40',   ribbon: 'bg-slate-800 border-slate-700 text-slate-400' },
  Rare:      { color: 'text-cyan-400',    border: 'border-cyan-500/40',    glow: '0 0 20px rgba(34,211,238,0.2)',       gradient: 'from-cyan-950/40 to-blue-950/40',     ribbon: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' },
  Epic:      { color: 'text-purple-400',  border: 'border-purple-500/40',  glow: '0 0 25px rgba(168,85,247,0.25)',      gradient: 'from-purple-950/40 to-fuchsia-950/40', ribbon: 'bg-purple-500/20 border-purple-500/30 text-purple-400' },
  Legendary: { color: 'text-yellow-400',  border: 'border-yellow-500/40',  glow: '0 0 30px rgba(234,179,8,0.3)',        gradient: 'from-yellow-950/40 to-amber-950/40',  ribbon: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' },
  Mythic:    { color: 'text-rose-400',    border: 'border-rose-500/40',    glow: '0 0 35px rgba(244,63,94,0.35)',       gradient: 'from-rose-950/40 to-pink-950/40',     ribbon: 'bg-rose-500/20 border-rose-500/30 text-rose-400' },
};

// ─── ACTIVE MULTIPLIER HELPER ────────────────────────────────────────────────
// NOTE (Issue 7): This client implementation returns an OBJECT:
//   { value: number, label: string|null, icon: string|null, color: string|null }
// The server-side mirror in server/utils/rewardUtils.js returns a plain NUMBER.
//
// Client callers use: multiplierInfo.value   (e.g. rewardService.js L143)
// Server callers use: getActiveMultiplier() directly as a number
//
// Do NOT import the server version on the client or vice versa.
// If a shared constant layer is ever introduced, unify the return type to the object form.
export function getActiveMultiplier(date = new Date()) {
  const day = date.getDay(); // 0=Sun, 6=Sat

  // Weekend boost
  if (day === 0 || day === 6) return XP_MULTIPLIERS.WEEKEND;

  // Indian festival dates (month is 0-indexed)
  const month = date.getMonth();
  const dayOfMonth = date.getDate();

  // Diwali approximate window (Oct-Nov), Holi (Mar), New Year (Jan 1)
  const isFestival =
    (month === 0 && dayOfMonth === 1) ||  // New Year
    (month === 2 && dayOfMonth >= 25 && dayOfMonth <= 27) || // Holi
    (month === 9 && dayOfMonth >= 28 && dayOfMonth <= 31) || // Diwali window
    (month === 10 && dayOfMonth >= 1 && dayOfMonth <= 5);   // Diwali extended

  if (isFestival) return XP_MULTIPLIERS.HOLIDAY;

  return { value: 1.0, label: null, icon: null, color: null };
}

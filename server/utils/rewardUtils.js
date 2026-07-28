// Single source of truth for XP/Coin rewards, mirrored from client
export const REWARD_ACTIONS = {
  ADD_EXPENSE:            { xp: 50,   coins: 5   },
  ADD_INCOME:             { xp: 50,   coins: 5   },
  UPLOAD_RECEIPT:         { xp: 150,  coins: 15  },
  CATEGORIZE_EXPENSE:     { xp: 40,   coins: 4   },
  CREATE_BUDGET:          { xp: 200,  coins: 20  },
  STAY_DAILY_BUDGET:      { xp: 100,  coins: 10  },
  STAY_WEEKLY_BUDGET:     { xp: 300,  coins: 30  },
  STAY_MONTHLY_BUDGET:    { xp: 1000, coins: 100 },
  ADD_GOAL:               { xp: 150,  coins: 15  },
  REACH_GOAL:             { xp: 1000, coins: 100 },
  GOAL_COMPLETED:         { xp: 500,  coins: 50  },
  GOAL_CONTRIBUTION:      { xp: 75,   coins: 8   },
  ADD_INVESTMENT:         { xp: 300,  coins: 30  },
  ADD_LOAN:               { xp: 150,  coins: 15  },
  MAKE_LOAN_PAYMENT:      { xp: 200,  coins: 20  },
  PAY_EMI:                { xp: 250,  coins: 25  },
  PAYOFF_LOAN:            { xp: 1000, coins: 100 },
  PAY_LOAN_ON_TIME:       { xp: 250,  coins: 25  },
  ADD_WALLET:             { xp: 150,  coins: 15  },
  WALLET_TRANSFER:        { xp: 200,  coins: 20  },
  TRANSFER:               { xp: 200,  coins: 20  },
  DIVERSE_WALLETS:        { xp: 300,  coins: 30  },
  WALLET_MILESTONE:       { xp: 1500, coins: 150 },
  WALLET_BALANCE_30D:     { xp: 1000, coins: 100 },
  ADD_SUBSCRIPTION:       { xp: 150,  coins: 15  },
  VIEW_SUBSCRIPTIONS:     { xp: 75,   coins: 7   },
  CANCEL_SUBSCRIPTION:    { xp: 250,  coins: 25  },
  REVIEW_SUB_BUDGET:      { xp: 300,  coins: 30  },
  SWITCH_ANNUAL_PLAN:     { xp: 400,  coins: 40  },
  SUBSCRIPTION_RENEWED:   { xp: 75,   coins: 7   },
  EXPORT_REPORTS:         { xp: 200,  coins: 20  },
  VIEW_ANALYTICS:         { xp: 75,   coins: 7   },
  COMPLETE_REVIEW:        { xp: 500,  coins: 50  },
  TRACK_BILLS:            { xp: 100,  coins: 10  },
  PAY_BILLS_ON_TIME:      { xp: 250,  coins: 25  },
  CREATE_FAMILY:          { xp: 150,  coins: 15  },
  INVITE_FAMILY_MEMBER:   { xp: 200,  coins: 20  },
  LOG_FAMILY_EXPENSE:     { xp: 200,  coins: 20  },
  SET_FAMILY_BUDGET:      { xp: 300,  coins: 30  },
  FAMILY_ACTIVE_30D:      { xp: 1000, coins: 100 },
  CREATE_SPLIT_BILL:      { xp: 300,  coins: 30  },
  SETTLE_SPLIT_BILL:      { xp: 500,  coins: 50  },
  INVITE_FRIENDS:         { xp: 500,  coins: 50  },
  DAILY_LOGIN:            { xp: 100,  coins: 10  },
  MAINTAIN_STREAK:        { xp: 150,  coins: 15  },
  BACKUP_DATA:            { xp: 100,  coins: 10  },
  COMPLETE_CHALLENGE:     { xp: 60,   coins: 12  },
  SAVED_15_PERCENT:       { xp: 120,  coins: 20  },
  NO_IMPULSE_WEEK:        { xp: 90,   coins: 15  },
  EMERGENCY_FUND_BUILT:   { xp: 300,  coins: 50  },
  NET_POSITIVE_MONTH:     { xp: 200,  coins: 30  },
};

// Map actionId -> unlocked achievements (Option A)
export const actionToAchievementMap = {
  ADD_INCOME:          ['c1'],
  ADD_EXPENSE:         [],
  CREATE_BUDGET:       ['b1'],
  ADD_GOAL:            ['s2'],
  GOAL_COMPLETED:      ['s4'],
  ADD_WALLET:          ['wal1'],
  WALLET_TRANSFER:     ['wal3'],
  ADD_INVESTMENT:      ['i1'],
  ADD_LOAN:            ['loan1'],
  MAKE_LOAN_PAYMENT:   ['loan2'],
  PAYOFF_LOAN:         ['loan5'],
  ADD_SUBSCRIPTION:    ['sub1'],
  CREATE_FAMILY:       ['fam1'],
  INVITE_FAMILY_MEMBER:['fam2'],
  LOG_FAMILY_EXPENSE:  ['fam4'],
  SET_FAMILY_BUDGET:   ['fam5'],
  CREATE_SPLIT_BILL:   ['p10'],
  SETTLE_SPLIT_BILL:   ['fam6', 'p11'],
  EXPORT_REPORTS:      ['p1'],
  DAILY_LOGIN:         ['c1'],
};

// Invert actionToAchievementMap to get a mapping from achievementId -> actionIds
export const achievementToActionsMap = {};
for (const [actionId, achIds] of Object.entries(actionToAchievementMap)) {
  for (const achId of achIds) {
    if (!achievementToActionsMap[achId]) {
      achievementToActionsMap[achId] = [];
    }
    if (!achievementToActionsMap[achId].includes(actionId)) {
      achievementToActionsMap[achId].push(actionId);
    }
  }
}

// XP active multipliers logic using server's clock
export function getActiveMultiplier(date = new Date()) {
  const day = date.getDay(); // 0=Sun, 6=Sat

  // Weekend boost
  if (day === 0 || day === 6) return 2.0;

  // Indian festival dates (month is 0-indexed)
  const month = date.getMonth();
  const dayOfMonth = date.getDate();

  const isFestival =
    (month === 0 && dayOfMonth === 1) ||  // New Year
    (month === 2 && dayOfMonth >= 25 && dayOfMonth <= 27) || // Holi
    (month === 9 && dayOfMonth >= 28 && dayOfMonth <= 31) || // Diwali window
    (month === 10 && dayOfMonth >= 1 && dayOfMonth <= 5);   // Diwali extended

  if (isFestival) return 1.5;

  return 1.0;
}

// Option A: verify eligibility strictly based on server-side records of logged actions
export function verifyAchievementEligibility(user, achievementId) {
  const allowedActions = achievementToActionsMap[achievementId] || [];
  if (allowedActions.length === 0) {
    // Under Option A, threshold achievements not mapped to discrete actions cannot be synced
    return false;
  }
  
  const hasSimulated = (user.simulatedActions || []).some(a => allowedActions.includes(a));
  const hasHistory = (user.xpHistory || []).some(h => allowedActions.includes(h.action));
  
  return hasSimulated || hasHistory;
}

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

// Map actionId -> unlocked achievements
//
// Issue 8 fix: Expanded to cover all action-based achievements from all 14 categories.
//
// Achievement classification:
//   ACTION-BASED   — triggered by a discrete action in the app (listed below)
//   THRESHOLD-BASED — triggered by accumulating a numeric value (e.g. streak > 20,
//                     net worth > ₹5L, 10+ payments). These require server-side
//                     calculation in the relevant domain controller and cannot be
//                     verified through actionToAchievementMap alone.
//   SYSTEM         — automatically evaluated by the server (e.g. level checks, date checks)
//
export const actionToAchievementMap = {
  // ── Core financial ────────────────────────────────────────────────────────
  ADD_INCOME:             ['c1'],           // c1: Hello World (first login/add)
  ADD_EXPENSE:            [],
  UPLOAD_RECEIPT:         ['p4'],           // p4: OCR Tech
  CATEGORIZE_EXPENSE:     [],
  EXPORT_REPORTS:         ['p1', 'p2', 'p3'],  // p1: Documenter, p2: Spreadsheet Geek, p3: PDF Printer

  // ── Budget ────────────────────────────────────────────────────────────────
  CREATE_BUDGET:          ['b1'],           // b1: Budget Architect

  // ── Goals ─────────────────────────────────────────────────────────────────
  ADD_GOAL:               ['s2'],           // s2: Goal Setter
  GOAL_COMPLETED:         ['s4'],           // s4: Milestone Achiever
  REACH_GOAL:             ['s4'],
  GOAL_CONTRIBUTION:      [],

  // ── Investments ───────────────────────────────────────────────────────────
  ADD_INVESTMENT:         ['i1'],           // i1: First Asset

  // ── Loans ─────────────────────────────────────────────────────────────────
  ADD_LOAN:               ['loan1'],        // loan1: Borrower Debut
  MAKE_LOAN_PAYMENT:      ['loan2'],        // loan2: First Installment
  PAY_EMI:                ['loan2'],
  PAYOFF_LOAN:            ['loan5'],        // loan5: Debt Free Starter
  PAY_LOAN_ON_TIME:       [],

  // ── Wallets ───────────────────────────────────────────────────────────────
  ADD_WALLET:             ['wal1'],         // wal1: Vault Creator
  WALLET_TRANSFER:        ['wal3', 'p8'],   // wal3: Bridge Builder, p8: Wallet Transfer
  TRANSFER:               ['wal3', 'p8'],
  DIVERSE_WALLETS:        ['wal6'],         // wal6: Hybrid Pockets
  WALLET_MILESTONE:       [],
  WALLET_BALANCE_30D:     [],

  // ── Subscriptions ─────────────────────────────────────────────────────────
  ADD_SUBSCRIPTION:       ['sub1', 'p9'],   // sub1: Streaming Age, p9: Subscription Track
  VIEW_SUBSCRIPTIONS:     ['sub3'],         // sub3: Horizon Watcher
  CANCEL_SUBSCRIPTION:    ['sub4'],         // sub4: Leak Plugger
  SWITCH_ANNUAL_PLAN:     ['sub6'],         // sub6: Smart Saver Option
  SUBSCRIPTION_RENEWED:   [],
  REVIEW_SUB_BUDGET:      [],

  // ── Reporting & Analytics ─────────────────────────────────────────────────
  VIEW_ANALYTICS:         [],
  COMPLETE_REVIEW:        [],
  TRACK_BILLS:            [],
  PAY_BILLS_ON_TIME:      [],

  // ── Family ────────────────────────────────────────────────────────────────
  CREATE_FAMILY:          ['fam1'],         // fam1: First Steps: Group
  INVITE_FAMILY_MEMBER:   ['fam2'],         // fam2: Growing Together
  LOG_FAMILY_EXPENSE:     ['fam4'],         // fam4: Shared Ledger
  SET_FAMILY_BUDGET:      ['fam5'],         // fam5: Family Budgeting
  FAMILY_ACTIVE_30D:      [],

  // ── Split ─────────────────────────────────────────────────────────────────
  CREATE_SPLIT_BILL:      ['p10'],          // p10: Split Bill Ledger
  SETTLE_SPLIT_BILL:      ['fam6', 'p11'], // fam6: Settle & Smile, p11: Settle Up Master

  // ── Engagement ────────────────────────────────────────────────────────────
  DAILY_LOGIN:            ['c1'],           // c1: Hello World
  MAINTAIN_STREAK:        [],
  BACKUP_DATA:            [],
  COMPLETE_CHALLENGE:     [],
  INVITE_FRIENDS:         [],

  // ── Financial health ──────────────────────────────────────────────────────
  SAVED_15_PERCENT:       [],
  NO_IMPULSE_WEEK:        [],
  EMERGENCY_FUND_BUILT:   [],
  NET_POSITIVE_MONTH:     [],
};

// NOTE — Threshold-based achievements that cannot be triggered via actionToAchievementMap
// because they depend on accumulated counters or domain-specific server logic:
//
//   Savings:    s1, s3, s5, s6, s7, s8, s9, s10, s11
//   Budget:     b2–b11
//   Investment: i2–i11
//   Consistency:c2–c11 (streak counts)
//   AI:         a1–a11 (chat usage)
//   Security:   sec1–sec11 (account events)
//   Special:    sp1–sp11 (UI events / coin accumulation)
//   Legendary:  l1–l11  (level / net worth / mass unlock)
//   Seasonal:   se1–se11 (date-based)
//   Family:     fam3, fam7, fam8
//   Loans:      loan3, loan4, loan6, loan7, loan8
//   Subscriptions: sub2, sub5, sub7
//   Wallets:    wal2, wal4, wal5, wal7
//   Productivity: p6, p7
//
// These must be evaluated server-side in the relevant domain controller
// (goalController, loanController, etc.) when the relevant threshold is crossed.


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

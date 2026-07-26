// challengePool.js — 30+ daily finance missions
// getDailyChallenges(dateStr) picks 3 deterministically by date (same across devices)

export const CHALLENGE_POOL = [
  // Tracking
  { id: 'ch_track_expense',    title: 'Record one expense today',           description: 'Log any expense to keep your tracker up to date.',   xp: 40,  coins: 8,  icon: '📝', category: 'Tracking',  actionId: 'ADD_EXPENSE'         },
  { id: 'ch_track_income',     title: 'Log an income entry',                description: 'Record any income source in your tracker.',          xp: 40,  coins: 8,  icon: '💵', category: 'Tracking',  actionId: 'ADD_INCOME'          },
  { id: 'ch_track_3',          title: 'Log 3 transactions in one day',      description: 'Record at least 3 financial events today.',          xp: 70,  coins: 14, icon: '✍️', category: 'Tracking',  actionId: null                  },
  { id: 'ch_categorize',       title: 'Categorize all expenses',            description: 'Make sure every expense has a proper category.',     xp: 30,  coins: 6,  icon: '🏷️', category: 'Tracking',  actionId: 'CATEGORIZE_EXPENSE'  },

  // Budget
  { id: 'ch_check_budget',     title: 'Review your budget status',          description: 'Open the Budget page and check your spending limits.', xp: 30, coins: 6,  icon: '📊', category: 'Budget',   actionId: null                  },
  { id: 'ch_stay_budget',      title: 'Stay within today\'s budget',        description: 'End the day without exceeding any budget category.', xp: 80,  coins: 16, icon: '🛡️', category: 'Budget',   actionId: 'STAY_DAILY_BUDGET'   },
  { id: 'ch_create_budget',    title: 'Set a new budget category',          description: 'Add a budget limit for a category you haven\'t tracked.', xp: 60, coins: 12, icon: '🧱', category: 'Budget', actionId: 'CREATE_BUDGET'      },

  // Savings & Goals
  { id: 'ch_save_500',         title: 'Save ₹500 today',                   description: 'Contribute ₹500 or more to any savings goal.',       xp: 80,  coins: 16, icon: '🏦', category: 'Savings',  actionId: 'GOAL_CONTRIBUTION'   },
  { id: 'ch_check_goals',      title: 'Check your savings goals',           description: 'Review progress on all your active goals.',          xp: 25,  coins: 5,  icon: '🎯', category: 'Savings',  actionId: null                  },
  { id: 'ch_contribute_goal',  title: 'Make a goal contribution',           description: 'Add any amount to a savings goal.',                  xp: 60,  coins: 12, icon: '💰', category: 'Savings',  actionId: 'GOAL_CONTRIBUTION'   },

  // Wallets
  { id: 'ch_check_wallet',     title: 'Review your wallet balances',        description: 'Open the Wallets page and check all balances.',      xp: 20,  coins: 4,  icon: '👛', category: 'Wallets',  actionId: null                  },
  { id: 'ch_transfer',         title: 'Do a wallet transfer',               description: 'Transfer funds between any two wallets.',            xp: 60,  coins: 12, icon: '↔️', category: 'Wallets',  actionId: 'WALLET_TRANSFER'     },

  // Analytics
  { id: 'ch_analytics',        title: 'Check your analytics',               description: 'Spend 2 minutes reviewing your spending trends.',    xp: 35,  coins: 7,  icon: '📈', category: 'Analytics', actionId: 'VIEW_ANALYTICS'     },
  { id: 'ch_monthly_review',   title: 'Do a monthly expense review',        description: 'Review your top spending categories this month.',    xp: 80,  coins: 16, icon: '🗓️', category: 'Analytics', actionId: 'COMPLETE_REVIEW'    },

  // Subscriptions
  { id: 'ch_check_subs',       title: 'Review your subscriptions',          description: 'Check renewal dates for all active subscriptions.',  xp: 30,  coins: 6,  icon: '📺', category: 'Subscriptions', actionId: 'VIEW_SUBSCRIPTIONS' },
  { id: 'ch_upcoming_bills',   title: 'Track an upcoming bill',             description: 'Log or check an upcoming payment or bill.',          xp: 40,  coins: 8,  icon: '🧾', category: 'Subscriptions', actionId: 'TRACK_BILLS'        },

  // Loans
  { id: 'ch_loan_status',      title: 'Check your loan progress',           description: 'Open the Loans page and review your EMI schedule.',  xp: 25,  coins: 5,  icon: '🏛️', category: 'Loans',   actionId: null                  },

  // Health behaviours
  { id: 'ch_no_impulse',       title: 'No impulse buys today',              description: 'Avoid any unplanned discretionary expenses.',        xp: 90,  coins: 18, icon: '🧘', category: 'Health',   actionId: 'NO_IMPULSE_WEEK'     },
  { id: 'ch_net_positive',     title: 'Keep today\'s net balance positive', description: 'Make sure income ≥ expenses logged today.',          xp: 70,  coins: 14, icon: '✅', category: 'Health',   actionId: 'NET_POSITIVE_MONTH'  },
  { id: 'ch_emergency_check',  title: 'Check your emergency fund',          description: 'Verify your emergency fund goal is on track.',       xp: 50,  coins: 10, icon: '🛡️', category: 'Health',   actionId: null                  },

  // AI & Insights
  { id: 'ch_ai_tip',           title: 'Read today\'s AI insight',           description: 'Open AI Insights and read one financial tip.',       xp: 30,  coins: 6,  icon: '🤖', category: 'AI',       actionId: null                  },
  { id: 'ch_ai_chat',          title: 'Ask the AI assistant a question',    description: 'Chat with your AI financial assistant.',             xp: 40,  coins: 8,  icon: '💬', category: 'AI',       actionId: null                  },

  // Streak & Engagement
  { id: 'ch_login_streak',     title: 'Maintain your login streak',         description: 'Log in to keep your daily streak alive.',            xp: 50,  coins: 10, icon: '🔥', category: 'Streak',   actionId: 'DAILY_LOGIN'         },
  { id: 'ch_7day_streak',      title: 'Hit a 7-day logging streak',         description: 'Log at least one transaction every day for 7 days.', xp: 150, coins: 30, icon: '⚡', category: 'Streak',   actionId: 'MAINTAIN_STREAK'     },

  // Reports
  { id: 'ch_export_report',    title: 'Export a financial report',          description: 'Download or share a report from the Reports page.',   xp: 60,  coins: 12, icon: '📄', category: 'Reports',  actionId: 'EXPORT_REPORTS'      },
  { id: 'ch_weekly_report',    title: 'Review your weekly spend',           description: 'Check how much you\'ve spent in the last 7 days.',   xp: 40,  coins: 8,  icon: '📋', category: 'Reports',  actionId: null                  },

  // Social
  { id: 'ch_family_expense',   title: 'Log a shared family expense',        description: 'Record an expense in your family group.',            xp: 60,  coins: 12, icon: '👨‍👩‍👧', category: 'Social', actionId: 'LOG_FAMILY_EXPENSE' },
  { id: 'ch_split_bill',       title: 'Create or settle a split bill',      description: 'Split an expense with a friend or family member.',   xp: 70,  coins: 14, icon: '🤝', category: 'Social',   actionId: 'CREATE_SPLIT_BILL'   },

  // Achievements
  { id: 'ch_check_achievements', title: 'Browse your achievements',         description: 'Visit the Achievements page and see your progress.',  xp: 20,  coins: 4,  icon: '🏆', category: 'Gamification', actionId: null                },
  { id: 'ch_pin_badge',          title: 'Pin a badge to your showcase',     description: 'Select a badge to display on your profile.',          xp: 30,  coins: 6,  icon: '📌', category: 'Gamification', actionId: null                },

  // Investment
  { id: 'ch_check_investments', title: 'Review your investment portfolio',  description: 'Check the current value of all your investments.',   xp: 35,  coins: 7,  icon: '💹', category: 'Investment', actionId: null                  },
  { id: 'ch_add_investment',    title: 'Log a new investment',              description: 'Add a new asset to your investment tracker.',        xp: 80,  coins: 16, icon: '📊', category: 'Investment', actionId: 'ADD_INVESTMENT'      },
];

/**
 * Seeded daily challenge picker.
 * Deterministic: same date → same 3 challenges on all devices.
 * @param {string} dateStr — 'YYYY-MM-DD'
 * @returns {Array} 3 challenge objects
 */
export function getDailyChallenges(dateStr = new Date().toISOString().slice(0, 10)) {
  // Simple seeded shuffle using date as seed
  const seed = dateStr
    .split('-')
    .reduce((acc, part, i) => acc + parseInt(part) * (i + 1) * 13, 0);

  // Seeded pseudo-random number generator (Mulberry32)
  function mulberry32(s) {
    return function () {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rand = mulberry32(seed);

  // Fisher-Yates shuffle with seeded RNG
  const pool = [...CHALLENGE_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, 3);
}

/**
 * Get today's date string 'YYYY-MM-DD' in local time
 */
export function getTodayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const PROGRESSION_LEVELS = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 500 },
  { level: 3, xpRequired: 1200 },
  { level: 4, xpRequired: 2200 },
  { level: 5, xpRequired: 3500 },
  { level: 6, xpRequired: 5000 },
  { level: 7, xpRequired: 7000 },
  { level: 8, xpRequired: 9500 },
  { level: 9, xpRequired: 12500 },
  { level: 10, xpRequired: 16000 },
  { level: 11, xpRequired: 20000 },
  { level: 12, xpRequired: 25000 },
  { level: 13, xpRequired: 31000 },
  { level: 14, xpRequired: 38000 },
  { level: 15, xpRequired: 46000 }
];

export function calculateLevel(xp = 0) {
  let currentLvl = PROGRESSION_LEVELS[0];

  for (let i = 0; i < PROGRESSION_LEVELS.length; i++) {
    if (xp >= PROGRESSION_LEVELS[i].xpRequired) {
      currentLvl = PROGRESSION_LEVELS[i];
    } else {
      break;
    }
  }
  return currentLvl.level;
}

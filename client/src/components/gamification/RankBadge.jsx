import { getRankFromXP, RANK_TIERS } from '../../constants/rewardConstants';
import { useGamification } from '../../context/GamificationContext';

export default function RankBadge({ size = 'sm', lifetimeXPOverride = null }) {
  const { lifetimeXP } = useGamification();
  const xpToUse = lifetimeXPOverride ?? lifetimeXP;
  const rank = getRankFromXP(xpToUse);
  const tier = RANK_TIERS.find(r => r.name === rank.name) || RANK_TIERS[0];

  // Find next tier
  const tierIdx = RANK_TIERS.findIndex(r => r.name === rank.name);
  const nextTier = RANK_TIERS[tierIdx + 1] || null;
  const progressToNext = nextTier
    ? Math.min(Math.round(((xpToUse - tier.minXP) / (nextTier.minXP - tier.minXP)) * 100), 100)
    : 100;

  const sizeClasses = {
    xs:  'text-[10px] px-2 py-0.5 gap-1',
    sm:  'text-xs px-2.5 py-1 gap-1.5',
    md:  'text-xs px-3 py-1.5 gap-2',
    lg:  'text-sm px-4 py-2 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-extrabold rounded-full border ${sizeClasses[size] || sizeClasses.sm}`}
      style={{
        color: tier.color,
        borderColor: `${tier.color}50`,
        background: `${tier.color}18`,
        boxShadow: `0 0 10px ${tier.color}20`,
      }}
    >
      <span>{tier.icon}</span>
      <span style={{ color: tier.color }}>{tier.name}</span>
    </span>
  );
}

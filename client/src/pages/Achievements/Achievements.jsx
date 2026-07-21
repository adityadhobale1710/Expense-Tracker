import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PROGRESSION_LEVELS, XP_ACTIONS, INITIAL_ACHIEVEMENTS } from './achievementsData';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Achievements() {
  const { user, updateUser } = useAuth();
  
  // Game states checking user context first, then localStorage, then default mock values
  const [xp, setXp] = useState(() => {
    if (user?.xp !== undefined) return user.xp;
    const saved = localStorage.getItem('game_xp');
    return saved ? parseInt(saved, 10) : 3450;
  });
  
  const [coins, setCoins] = useState(() => {
    if (user?.coins !== undefined) return user.coins;
    const saved = localStorage.getItem('game_coins');
    return saved ? parseInt(saved, 10) : 640;
  });
  
  const [streak, setStreak] = useState(() => {
    if (user?.streak !== undefined) return user.streak;
    const saved = localStorage.getItem('game_streak');
    return saved ? parseInt(saved, 10) : 18;
  });

  const [longestStreak, setLongestStreak] = useState(() => {
    if (user?.longestStreak !== undefined) return user.longestStreak;
    const saved = localStorage.getItem('game_longest_streak');
    return saved ? parseInt(saved, 10) : 24;
  });

  const [achievements, setAchievements] = useState(() => {
    if (user?.achievements && user.achievements.length > 0) {
      // Map user achievements to local static achievements templates
      const userMap = {};
      user.achievements.forEach(a => { userMap[a.id] = a; });
      return INITIAL_ACHIEVEMENTS.map(ach => ({
        ...ach,
        currentProgress: userMap[ach.id]?.currentProgress !== undefined ? userMap[ach.id].currentProgress : ach.currentProgress,
        unlocked: userMap[ach.id]?.unlocked !== undefined ? userMap[ach.id].unlocked : ach.unlocked,
      }));
    }
    const saved = localStorage.getItem('game_achievements');
    return saved ? JSON.parse(saved) : INITIAL_ACHIEVEMENTS;
  });

  const [recentUnlock, setRecentUnlock] = useState(() => {
    const saved = localStorage.getItem('game_recent_unlock');
    return saved ? JSON.parse(saved) : null;
  });

  const [simulatedActions, setSimulatedActions] = useState(() => {
    if (user?.simulatedActions !== undefined) return user.simulatedActions;
    const saved = localStorage.getItem('game_simulated_actions');
    return saved ? JSON.parse(saved) : [];
  });

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [hoveredRewardId, setHoveredRewardId] = useState(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [floatyTexts, setFloatyTexts] = useState([]); // Array of { id, text, x, y }
  const [currentPage, setCurrentPage] = useState(1);

  // Dynamic filter options generated from active achievements to remove empty categories
  const filterOptions = useMemo(() => {
    const baseFilters = ['All', 'Unlocked', 'Locked', 'Common', 'Rare', 'Epic', 'Legendary'];
    const categoryFilters = Array.from(new Set(achievements.map(ach => ach.category)))
      .filter(cat => cat && !baseFilters.includes(cat));
    return [...baseFilters, ...categoryFilters];
  }, [achievements]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter]);
  
  const canvasRef = useRef(null);

  // Audio synthesiser
  const playSound = (type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      if (type === 'xp') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12); // G5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'unlock') {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.25);
          osc.start(ctx.currentTime + i * 0.08);
          osc.stop(ctx.currentTime + i * 0.08 + 0.25);
        });
      } else if (type === 'levelUp') {
        const notes = [329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51]; // E4, G4, C5, E5, G5, C6, E6
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);
          gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.35);
          osc.start(ctx.currentTime + i * 0.07);
          osc.stop(ctx.currentTime + i * 0.07 + 0.35);
        });
      }
    } catch (e) {
      console.warn("Audio Context blocked or not supported: ", e);
    }
  };

  // Canvas Confetti effect
  useEffect(() => {
    if (!confettiActive || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6'];
    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 5 + 3,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.05 + 0.02,
      tiltAngle: 0
    }));
    
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;
      particles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3.5 + p.r / 2) / 2.2;
        p.x += Math.sin(p.tiltAngle) * 0.8;
        p.tilt = Math.sin(p.tiltAngle - idx/3) * 12;
        
        if (p.y < canvas.height) active = true;
        
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });
      
      if (active) {
        animationId = requestAnimationFrame(draw);
      } else {
        setConfettiActive(false);
      }
    }
    
    animationId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationId);
  }, [confettiActive]);

  // Keep localStorage updated
  useEffect(() => {
    localStorage.setItem('game_xp', xp.toString());
    localStorage.setItem('game_coins', coins.toString());
    localStorage.setItem('game_streak', streak.toString());
    localStorage.setItem('game_longest_streak', longestStreak.toString());
    localStorage.setItem('game_achievements', JSON.stringify(achievements));
    localStorage.setItem('game_simulated_actions', JSON.stringify(simulatedActions));
    if (recentUnlock) {
      localStorage.setItem('game_recent_unlock', JSON.stringify(recentUnlock));
    }
  }, [xp, coins, streak, longestStreak, achievements, recentUnlock, simulatedActions]);

  // Sync gamification parameters to backend database with 2s debounce
  useEffect(() => {
    if (!user) return;
    const delayDebounce = setTimeout(async () => {
      try {
        const { data } = await api.put('/users/me', {
          xp,
          coins,
          level: getCurrentLevelInfo(xp).currentLvl.level,
          streak,
          longestStreak,
          achievements: achievements.map(a => ({
            id: a.id,
            currentProgress: a.currentProgress,
            unlocked: a.unlocked,
          })),
          simulatedActions
        });
        if (data.success && data.data) {
          updateUser(data.data);
        }
      } catch (e) {
        console.warn("MERN Database gamification sync failed: ", e);
      }
    }, 2000);
    return () => clearTimeout(delayDebounce);
  }, [xp, coins, streak, longestStreak, achievements, simulatedActions]);

  // Calculate level based on XP
  const getCurrentLevelInfo = (xpVal) => {
    let currentLvl = PROGRESSION_LEVELS[0];
    let nextLvl = PROGRESSION_LEVELS[1];
    
    for (let i = 0; i < PROGRESSION_LEVELS.length; i++) {
      if (xpVal >= PROGRESSION_LEVELS[i].xpRequired) {
        currentLvl = PROGRESSION_LEVELS[i];
        nextLvl = PROGRESSION_LEVELS[i + 1] || PROGRESSION_LEVELS[i];
      } else {
        break;
      }
    }
    return { currentLvl, nextLvl };
  };

  const { currentLvl, nextLvl } = getCurrentLevelInfo(xp);
  
  // XP progress ratio
  const getLevelProgressPercentage = () => {
    if (currentLvl.level === 15) return 100;
    const base = currentLvl.xpRequired;
    const target = nextLvl.xpRequired;
    const earned = xp - base;
    const totalNeeded = target - base;
    return Math.min(Math.round((earned / totalNeeded) * 100), 100);
  };

  const levelProgress = getLevelProgressPercentage();

  // Floaty Text spawning function
  const spawnFloatyText = (text, e) => {
    let x = 300;
    let y = 150;
    if (e && e.clientX && e.clientY) {
      x = e.clientX;
      y = e.clientY - 40;
    }
    const id = Date.now() + Math.random().toString();
    setFloatyTexts((prev) => [...prev, { id, text, x, y }]);
    setTimeout(() => {
      setFloatyTexts((prev) => prev.filter((item) => item.id !== id));
    }, 1200);
  };

  // Perform a sandbox action
  const handleAction = (actionId, label, actionXp, actionCoins, e) => {
    if (simulatedActions.includes(actionId)) {
      toast.error(`Action "${label}" has already been simulated!`);
      return;
    }
    setSimulatedActions(prev => [...prev, actionId]);

    // Add XP & Coins
    const oldLevel = getCurrentLevelInfo(xp).currentLvl.level;
    const newXp = xp + actionXp;
    const newCoins = coins + actionCoins;
    
    setXp(newXp);
    setCoins(newCoins);
    playSound('xp');
    spawnFloatyText(`+${actionXp} XP  +${actionCoins}🪙`, e);

    // Level up check
    const newLevel = getCurrentLevelInfo(newXp).currentLvl.level;
    if (newLevel > oldLevel) {
      setTimeout(() => {
        playSound('levelUp');
        setConfettiActive(true);
        toast.success(`🎉 LEVEL UP! You reached Level ${newLevel}: ${PROGRESSION_LEVELS[newLevel - 1]?.name}!`, {
          duration: 5000,
          icon: '🚀',
          style: {
            background: '#1e1b4b',
            color: '#c084fc',
            border: '2px solid #818cf8',
          }
        });
      }, 300);
    }

    // Interactive Achievements updates
    let updatedStreak = streak;
    let updatedLongest = longestStreak;
    if (actionId === 'maintain_streak') {
      updatedStreak += 1;
      setStreak(updatedStreak);
      if (updatedStreak > longestStreak) {
        updatedLongest = updatedStreak;
        setLongestStreak(updatedLongest);
      }
    }

    // Process progress changes on specific achievements
    const newAchievements = achievements.map(ach => {
      if (ach.unlocked) return ach;

      let currentVal = ach.currentProgress;
      
      if (ach.id === 'ach_thirty_day' && actionId === 'maintain_streak') {
        currentVal = updatedStreak;
      } else if (ach.id === 'ach_hundred_day' && actionId === 'maintain_streak') {
        currentVal = updatedStreak;
      } else if (ach.id === 'ach_first_expense' && actionId === 'add_expense') {
        currentVal = 1;
      } else if (ach.id === 'ach_first_income' && actionId === 'add_income') {
        currentVal = 1;
      } else if (ach.id === 'ach_first_budget' && actionId === 'create_budget') {
        currentVal = 1;
      } else if (ach.id === 'ach_budget_guardian' && actionId === 'stay_monthly_budget') {
        currentVal = 1;
      } else if (ach.id === 'ach_budget_master' && actionId === 'stay_monthly_budget') {
        currentVal = Math.min(currentVal + 1, ach.progressNeeded);
      } else if (ach.id === 'ach_savings_champ' && actionId === 'stay_monthly_budget') {
        currentVal = 1;
      } else if (ach.id === 'ach_fifty_k_saved' && actionId === 'reach_goal') {
        currentVal = Math.min(currentVal + 10000, ach.progressNeeded);
      } else if (ach.id === 'ach_no_spend_week' && actionId === 'stay_weekly_budget') {
        currentVal = 1;
      } else if (ach.id === 'ach_category_expert' && actionId === 'categorize_expense') {
        currentVal = Math.min(currentVal + 1, ach.progressNeeded);
      } else if (ach.id === 'ach_receipt_collector' && actionId === 'upload_receipt') {
        currentVal = Math.min(currentVal + 1, ach.progressNeeded);
      } else if (ach.id === 'ach_emergency_fund' && actionId === 'add_goal') {
        currentVal = Math.min(currentVal + 5000, ach.progressNeeded);
      } else if (ach.id === 'ach_debt_destroyer' && actionId === 'pay_bills_on_time') {
        currentVal = 1;
      } else if (ach.id === 'ach_smart_shopper' && actionId === 'stay_daily_budget') {
        currentVal = Math.min(currentVal + 100, ach.progressNeeded);
      } else if (ach.id === 'ach_tax_planner' && actionId === 'add_investment') {
        currentVal = 1;
      }

      // Check for unlock
      const isNowUnlocked = currentVal >= ach.progressNeeded;
      if (isNowUnlocked) {
        playSound('unlock');
        setConfettiActive(true);
        setRecentUnlock(ach);
        
        // Reward user
        setXp(x => x + ach.xpReward);
        setCoins(c => c + ach.coinsReward);
        
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-bounce' : 'opacity-0'} max-w-md w-full bg-dark-800 border border-yellow-500/50 shadow-2xl rounded-2xl pointer-events-auto flex p-4 ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5 text-3xl">
                  {ach.icon}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-yellow-400">🏆 Achievement Unlocked!</p>
                  <p className="text-xs font-semibold text-slate-100 mt-0.5">{ach.title}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{ach.description}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] bg-primary-600/20 text-primary-400 px-2 py-0.5 rounded-full font-bold">+{ach.xpReward} XP</span>
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold">+{ach.coinsReward}🪙</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="rounded-lg p-1.5 flex items-center justify-center text-slate-500 hover:text-slate-400"
              >
                ✕
              </button>
            </div>
          </div>
        ), { duration: 6000 });
      }

      return {
        ...ach,
        currentProgress: currentVal,
        unlocked: ach.unlocked || isNowUnlocked
      };
    });

    setAchievements(newAchievements);
  };



  // Filter & search achievements logic
  const filteredAchievements = achievements.filter(ach => {
    // Search filter
    const matchesSearch = ach.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ach.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // Category / State filter
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Unlocked') return ach.unlocked;
    if (activeFilter === 'Locked') return !ach.unlocked;
    if (activeFilter === 'Common') return ach.tier === 'Common';
    if (activeFilter === 'Rare') return ach.tier === 'Rare';
    if (activeFilter === 'Epic') return ach.tier === 'Epic';
    if (activeFilter === 'Legendary') return ach.tier === 'Legendary' || ach.category === 'Legendary';
    
    // Dynamically filter categories that are not handled by the state/tier checks
    return ach.category === activeFilter;
  });
  
  // Pagination calculations
  const achievementsPerPage = 10;
  const totalPages = Math.ceil(filteredAchievements.length / achievementsPerPage);
  const paginatedAchievements = filteredAchievements.slice(
    (currentPage - 1) * achievementsPerPage,
    currentPage * achievementsPerPage
  );

  // Calculate statistics
  const totalBadgesCount = achievements.length;
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const lockedCount = totalBadgesCount - unlockedCount;
  const completionPercentage = Math.round((unlockedCount / totalBadgesCount) * 100);
  const rareCount = achievements.filter(a => a.unlocked && a.tier === 'Rare').length;
  const legendaryCount = achievements.filter(a => a.unlocked && a.tier === 'Legendary').length;

  const featuredAchievement = achievements.find(a => !a.unlocked && a.tier === 'Epic') || achievements.find(a => !a.unlocked);

  return (
    <div className="space-y-6 relative min-h-screen pb-16">
      
      {/* Floaty Texts for XP gain */}
      {floatyTexts.map(f => (
        <span
          key={f.id}
          className="fixed pointer-events-none text-sm font-bold text-yellow-400 select-none z-50 animate-float-up shadow-glow-yellow"
          style={{ left: f.x, top: f.y }}
        >
          {f.text}
        </span>
      ))}

      {/* Confetti Overlay Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-40 w-full h-full"
      />

      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-80px) scale(1.15); opacity: 0; }
        }
        .animate-float-up {
          animation: float-up 1.2s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
        }
        .shadow-glow-yellow {
          text-shadow: 0 0 10px rgba(234, 179, 8, 0.8), 0 0 20px rgba(234, 179, 8, 0.4);
        }
        .badge-shine {
          position: relative;
          overflow: hidden;
        }
        .badge-shine::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -60%;
          width: 30%;
          height: 200%;
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(30deg);
          transition: all 0.5s;
          animation: shine 4s infinite ease-in-out;
        }
        @keyframes shine {
          0% { left: -70%; }
          15% { left: 150%; }
          100% { left: 150%; }
        }
        .glow-card-green {
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.15);
        }
        .glow-card-yellow {
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.25);
        }
        .glow-card-purple {
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.25);
        }
      `}</style>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            🏆 Achievements & Levels
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Complete milestones, earn XP & coins, and build financial legends!
          </p>
        </div>
      </div>

      {/* Grid of Main Dashboard Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Current Level Card */}
        <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[180px]">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-8xl pointer-events-none select-none">
            {currentLvl.icon}
          </div>
          <div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold text-primary-400 uppercase tracking-widest">Active Progression</span>
                <h3 className="text-2xl font-extrabold text-slate-100 mt-1 flex items-center gap-2">
                  Level {currentLvl.level}
                </h3>
                <p className="text-sm font-bold text-amber-400 mt-0.5">{currentLvl.name}</p>
              </div>
              <span className="text-3xl p-2 bg-slate-900/40 border border-slate-800 rounded-2xl">
                {currentLvl.icon}
              </span>
            </div>
            
            {/* XP progress bar */}
            <div className="mt-6 space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">XP Progress</span>
                <span className="text-slate-200">
                  {xp.toLocaleString()} / {currentLvl.level === 15 ? 'Max' : nextLvl.xpRequired.toLocaleString()} XP
                </span>
              </div>
              <div className="w-full bg-slate-900 h-3.5 border border-slate-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-primary-500 to-emerald-500 h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 text-right italic font-medium">
                {currentLvl.level === 15 ? 'Max progression reached!' : `${(nextLvl.xpRequired - xp).toLocaleString()} XP needed for level ${nextLvl.level}`}
              </p>
            </div>
          </div>
        </div>

        {/* Currency & Streaks Card */}
        <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[180px]">
          <div>
            <span className="text-xs font-semibold text-primary-400 uppercase tracking-widest">Currency & Streak Tracker</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              
              {/* Coins Widget */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <span className="text-3xl">🪙</span>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Coins Earned</p>
                  <p className="text-xl font-extrabold text-yellow-400">{coins}</p>
                </div>
              </div>

              {/* Daily Streak Widget */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <span className="text-3xl">🔥</span>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Daily Streak</p>
                  <p className="text-xl font-extrabold text-orange-400">{streak} Days</p>
                </div>
              </div>

            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400 pt-3 border-t border-slate-700/30">
            <span>Longest login streak:</span>
            <span className="font-bold text-orange-400">{longestStreak} consecutive days ⚡</span>
          </div>
        </div>

        {/* Unlocks and completion Statistics */}
        <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[180px]">
          <div>
            <span className="text-xs font-semibold text-primary-400 uppercase tracking-widest">Milestone Progression</span>
            <div className="flex items-center gap-4 mt-3">
              
              {/* Radial Completion Percentage */}
              <div className="w-16 h-16 rounded-full border-4 border-slate-800 flex items-center justify-center relative flex-shrink-0 bg-slate-900/40 shadow-inner">
                <span className="text-sm font-extrabold text-slate-100">{completionPercentage}%</span>
                {/* SVG Overlay border rings */}
                <svg className="absolute -inset-1 transform -rotate-90 w-16 h-16 pointer-events-none">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="url(#radialGradient)"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray="176"
                    strokeDashoffset={176 - (176 * completionPercentage) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                  <defs>
                    <linearGradient id="radialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-300">
                  Unlocked: <span className="font-bold text-emerald-400">{unlockedCount}</span> / {totalBadgesCount} Badges
                </p>
                <div className="flex gap-2">
                  <span className="text-[10px] bg-slate-900/60 border border-slate-800 rounded-full px-2 py-0.5 text-slate-400 font-bold">
                    Rare: {rareCount} ⭐
                  </span>
                  <span className="text-[10px] bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2 py-0.5 text-yellow-400 font-bold">
                    Legendary: {legendaryCount} 👑
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400 pt-3 border-t border-slate-700/30">
            <span>Next Level Reward:</span>
            <span className="font-bold text-indigo-400">{currentLvl.level === 15 ? 'Max Level!' : nextLvl.reward}</span>
          </div>
        </div>

      </div>

      {/* Featured & Recent unlock row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Recently Unlocked */}
        <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="text-4xl p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex-shrink-0 animate-pulse">
            {recentUnlock ? recentUnlock.icon : '🔓'}
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Recently Unlocked Milestone</span>
            <h4 className="text-sm font-bold text-slate-200 mt-0.5">
              {recentUnlock ? recentUnlock.title : 'Unlock your first badge!'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {recentUnlock ? recentUnlock.description : 'Earn XP and coins by performing actions on your tracker.'}
            </p>
          </div>
        </div>

        {/* Featured Goal */}
        <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="text-4xl p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex-shrink-0">
            {featuredAchievement ? featuredAchievement.icon : '👑'}
          </div>
          <div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Recommended Next Goal</span>
            <h4 className="text-sm font-bold text-slate-200 mt-0.5">
              {featuredAchievement ? featuredAchievement.title : 'All Milestones Completed!'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {featuredAchievement ? featuredAchievement.description : 'Congratulations, you are a complete Financial Legend!'}
            </p>
          </div>
        </div>

      </div>

      {/* Sandbox XP Simulator Panel */}
      <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl">
        <div className="pb-3 border-b border-slate-700/50 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
              ⚙️ Sandbox XP & Badge Simulator
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate actions in real-time to watch XP increase, unlock badges, and trigger confetti explosions!
            </p>
          </div>
          <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg px-2.5 py-1 font-bold">
            Interactive Testbed
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
          {XP_ACTIONS.map(action => {
            const isCompleted = simulatedActions.includes(action.id);
            return (
              <button
                key={action.id}
                disabled={isCompleted}
                onClick={(e) => handleAction(action.id, action.label, action.xp, action.coins, e)}
                className={`p-2.5 rounded-xl text-left text-xs font-semibold transition-all flex flex-col justify-between h-[85px] group text-slate-300 hover:text-slate-100 ${
                  isCompleted
                    ? 'bg-slate-900/10 border-slate-900/30 opacity-40 cursor-not-allowed'
                    : 'bg-slate-900/40 border-slate-800 hover:border-primary-500/30 hover:bg-slate-800/40 hover:scale-105 active:scale-95 cursor-pointer'
                }`}
              >
                <span className={`line-clamp-2 leading-tight ${isCompleted ? 'text-slate-500' : 'group-hover:text-primary-400'}`}>
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

      {/* Main achievements Filter, Search, Grid */}
      <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl">
        
        {/* Search & Filter Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-slate-700/50">
          <div className="relative w-full lg:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search achievements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Categories/State filters scroll area */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-thin">
            {filterOptions.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all flex-shrink-0 cursor-pointer ${
                  activeFilter === filter
                    ? 'bg-primary-600 border-primary-500 text-white shadow-lg'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
          {paginatedAchievements.length > 0 ? (
            paginatedAchievements.map(ach => (
              <div
                key={ach.id}
                className={`relative border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 min-h-[190px] select-none hover:scale-[1.03] group ${
                  ach.unlocked
                    ? `bg-gradient-to-br ${ach.theme} shadow-md`
                    : 'bg-slate-900/20 border-slate-800/80 opacity-40 blur-[0.3px]'
                }`}
              >
                {/* Badge/Icon Container */}
                <div>
                  <div className="flex justify-between items-start">
                    <div
                      className={`text-3xl w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${
                        ach.unlocked
                          ? 'bg-slate-950/40 border-white/10 badge-shine scale-105'
                          : 'bg-slate-950/20 border-slate-900 grayscale'
                      }`}
                    >
                      {ach.icon}
                    </div>
                    <span className={`text-[9px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-full border ${
                      ach.tier === 'Legendary'
                        ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400 animate-pulse'
                        : ach.tier === 'Epic'
                        ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                        : ach.tier === 'Rare'
                        ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                      {ach.tier}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-100 mt-4 leading-tight group-hover:text-primary-300 transition-colors">
                    {ach.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    {ach.description}
                  </p>
                </div>

                {/* Progress bar inside card */}
                <div className="mt-4 pt-3 border-t border-slate-700/20">
                  {ach.unlocked ? (
                    <div className="flex justify-between items-center text-[10px] font-bold text-emerald-400">
                      <span>✓ Completed</span>
                      <span>+{ach.xpReward} XP</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500 font-semibold truncate max-w-[120px]">{ach.requirement}</span>
                        <span className="text-slate-400 font-bold">
                          {ach.currentProgress.toLocaleString()} / {ach.progressNeeded.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-primary-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((ach.currentProgress / ach.progressNeeded) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Tooltip on Hover */}
                <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-64 bg-dark-900 border border-slate-700/80 rounded-xl p-3 shadow-2xl z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-dark-900" />
                  <p className="text-xs font-extrabold text-slate-100 flex items-center gap-1">
                    {ach.icon} {ach.title}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {ach.unlocked ? `Unlocked! ${ach.description}` : `Target: ${ach.requirement}`}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Rewards:</span>
                      <span className="font-bold text-indigo-400">+{ach.xpReward} XP, +{ach.coinsReward}🪙</span>
                    </div>
                    {ach.rewardsText && (
                      <div className="text-slate-500 italic">
                        {ach.rewardsText}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-slate-500 text-sm font-semibold">
              No achievements match your filters. 🔍 Try another search or category.
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8 pt-6 border-t border-slate-700/30">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="bg-slate-900/40 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 px-4 py-2 rounded-lg text-xs font-semibold active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            >
              ← Previous
            </button>
            <span className="text-xs text-slate-400 font-semibold px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="bg-slate-900/40 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 px-4 py-2 rounded-lg text-xs font-semibold active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Progression details */}
      <div className="mt-6">
        
        {/* Progression Levels Reference */}
        <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl w-full">
          <h3 className="text-base font-bold text-slate-100 pb-3 border-b border-slate-700/50">
            🌌 Progression Tiers & Rewards
          </h3>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PROGRESSION_LEVELS.map(lvl => {
              const isCurrent = currentLvl.level === lvl.level;
              const isUnlocked = xp >= lvl.xpRequired;
              
              return (
                <div
                  key={lvl.level}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                    isCurrent
                      ? 'bg-primary-600/10 border-primary-500/40 glow-card-green font-bold'
                      : isUnlocked
                      ? 'bg-slate-900/30 border-slate-800/80 text-slate-300'
                      : 'bg-slate-950/40 border-slate-900/50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{lvl.icon}</span>
                    <div>
                      <p className={`font-semibold ${isCurrent ? 'text-primary-400' : isUnlocked ? 'text-slate-200' : 'text-slate-600'}`}>
                        Lvl {lvl.level} — {lvl.name}
                      </p>
                      <p className="text-[10px] text-slate-500">Requires: {lvl.xpRequired.toLocaleString()} XP</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      isCurrent
                        ? 'bg-primary-600 text-white'
                        : isUnlocked
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-900/20 text-slate-700'
                    }`}>
                      {isCurrent ? 'Current' : isUnlocked ? 'Unlocked' : 'Locked'}
                    </span>
                    <p className="text-[9px] text-slate-500 mt-1 line-clamp-1 max-w-[120px]">{lvl.reward}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}

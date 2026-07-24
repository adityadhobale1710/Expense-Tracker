import { Target, Award, Wallet, Calendar, AlertTriangle, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GoalStats({ stats = {} }) {
  const {
    activeGoals = 0,
    completedGoals = 0,
    totalSaved = 0,
    totalRemaining = 0,
    averageProgress = 0,
    monthlySaving = 0
  } = stats;

  const totalGoals = activeGoals + completedGoals;
  const totalTarget = totalSaved + totalRemaining;

  const cardItems = [
    {
      title: 'Active Goals',
      value: activeGoals,
      icon: <Target className="text-primary-400" size={20} />,
      sub: `${completedGoals} Completed`,
      color: 'border-primary-500/20'
    },
    {
      title: 'Total Target',
      value: `₹${totalTarget.toLocaleString('en-IN')}`,
      icon: <Shield className="text-indigo-400" size={20} />,
      sub: `Across ${totalGoals} Goals`,
      color: 'border-indigo-500/20'
    },
    {
      title: 'Total Saved',
      value: `₹${totalSaved.toLocaleString('en-IN')}`,
      icon: <Wallet className="text-emerald-400" size={20} />,
      sub: `${averageProgress}% Average Progress`,
      color: 'border-emerald-500/20'
    },
    {
      title: 'Remaining Amount',
      value: `₹${totalRemaining.toLocaleString('en-IN')}`,
      icon: <Calendar className="text-rose-400" size={20} />,
      sub: `Suggested saving: ₹${monthlySaving.toLocaleString('en-IN')}/mo`,
      color: 'border-rose-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cardItems.map((item, index) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
          className={`flex items-center justify-between p-5 bg-dark-800/80 border ${item.color} rounded-3xl shadow-xl backdrop-blur-md`}
        >
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.title}</p>
            <h3 className="text-lg font-black text-slate-100">{item.value}</h3>
            <p className="text-[10px] text-slate-400 font-semibold">{item.sub}</p>
          </div>
          <div className="p-3 bg-dark-900/60 border border-slate-700/30 rounded-2xl">
            {item.icon}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

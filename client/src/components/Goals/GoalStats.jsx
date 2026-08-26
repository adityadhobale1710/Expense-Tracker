import { Target, Wallet, Calendar, Shield } from 'lucide-react';
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
    },
    {
      title: 'Total Target',
      value: `₹${totalTarget.toLocaleString('en-IN')}`,
      icon: <Shield className="text-indigo-400" size={20} />,
      sub: `Across ${totalGoals} Goals`,
    },
    {
      title: 'Total Saved',
      value: `₹${totalSaved.toLocaleString('en-IN')}`,
      icon: <Wallet className="text-emerald-400" size={20} />,
      sub: `${averageProgress}% Average Progress`,
    },
    {
      title: 'Remaining Amount',
      value: `₹${totalRemaining.toLocaleString('en-IN')}`,
      icon: <Calendar className="text-rose-400" size={20} />,
      sub: `Suggested: ₹${monthlySaving.toLocaleString('en-IN')}/mo`,
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
          className="card flex items-center justify-between p-5 hover:border-primary-500/20 transition-all duration-200"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.title}</p>
            <h3 className="text-lg font-bold text-slate-100">{item.value}</h3>
            <p className="text-xs text-slate-400 font-semibold">{item.sub}</p>
          </div>
          <div className="p-3 bg-dark-900 border border-slate-700/30 rounded-xl">
            {item.icon}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { Bot, LineChart, Wallet, PiggyBank, Receipt, TrendingUp } from 'lucide-react';

const SUGGESTED_CARDS = [
  {
    title: 'Analyze my spending',
    desc: 'Get insights on your recent expenses',
    icon: LineChart,
    colorClass: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400'
  },
  {
    title: 'Create a monthly budget',
    desc: 'Plan your upcoming month',
    icon: Wallet,
    colorClass: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'
  },
  {
    title: 'Help me save money',
    desc: 'Discover cutting strategies',
    icon: PiggyBank,
    colorClass: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400'
  },
  {
    title: 'Explain this transaction',
    desc: 'Understand vague charges',
    icon: Receipt,
    colorClass: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400'
  },
  {
    title: 'Investment advice',
    desc: 'Grow your wealth',
    icon: TrendingUp,
    colorClass: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400'
  }
];

export default function WelcomeScreen({ userName, onPromptClick }) {
  const firstName = userName ? userName.split(' ')[0] : 'there';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center h-full w-full py-12 md:py-20"
    >
      <div className="w-16 h-16 rounded-full bg-ai-light flex items-center justify-center mb-8 text-ai-primary">
        <Bot className="w-8 h-8" />
      </div>
      
      <h2 className="text-[36px] font-bold text-ai-text-primary mb-4 tracking-tight">
        Good afternoon, {firstName}
      </h2>
      
      <p className="text-ai-text-muted mb-12 text-[16px] max-w-md text-center">
        I'm your AI financial assistant. Ask me anything about your finances or choose a suggestion below.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto w-full px-4">
        {SUGGESTED_CARDS.map((card, idx) => {
          const Icon = card.icon;
          return (
            <button
              key={idx}
              onClick={() => onPromptClick(card.title)}
              className="flex items-start gap-4 p-5 text-left ai-surface-card hover:border-ai-primary/30 hover:shadow-ai-medium transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-ai-primary/50"
            >
              <div className={`ai-icon-pastel shrink-0 transition-transform duration-200 group-hover:scale-110 ${card.colorClass}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-semibold text-ai-text-primary mb-0.5 group-hover:text-ai-primary transition-colors">
                  {card.title}
                </span>
                <span className="text-[12px] text-ai-text-muted">
                  {card.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useGamification } from '../../context/GamificationContext';

export default function XPAnimation() {
  const { floatyTexts, removeFloaty } = useGamification();

  return (
    <div className="fixed inset-0 pointer-events-none z-[180] overflow-hidden" aria-hidden="true">
      {floatyTexts.map((f) => (
        <FloatyText key={f.id} id={f.id} text={f.text} onDone={removeFloaty} />
      ))}
    </div>
  );
}

function FloatyText({ id, text, onDone }) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDone(id), 400);
    }, 1600);
    return () => clearTimeout(timerRef.current);
  }, [id, onDone]);

  return (
    <div
      className={`absolute right-6 transition-all duration-400 ${
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-8'
      }`}
      style={{
        bottom: `${Math.random() * 30 + 10}%`,
        animation: visible ? 'floatUp 1.6s ease-out forwards' : 'none',
      }}
    >
      <span
        className="text-sm font-extrabold font-mono px-3 py-1.5 rounded-full border whitespace-nowrap"
        style={{
          color: '#fbbf24',
          textShadow: '0 0 10px rgba(251,191,36,0.8), 0 0 20px rgba(251,191,36,0.4)',
          background: 'rgba(251,191,36,0.1)',
          borderColor: 'rgba(251,191,36,0.3)',
          boxShadow: '0 0 15px rgba(251,191,36,0.15)',
        }}
      >
        {text}
      </span>

      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(0.8);  opacity: 0; }
          20%  { transform: translateY(-8px) scale(1); opacity: 1; }
          80%  { transform: translateY(-40px) scale(1); opacity: 1; }
          100% { transform: translateY(-60px) scale(0.9); opacity: 0; }
        }
      `}</style>
    </div>
  );
}


import React, { useState, useEffect } from 'react';

interface LoaderProps {
  text?: string;
}

const EMOJIS = ['🌿', '🧬', '🔬', '🧪', '🌸', '🌵', '🍂', '🍄'];

const Loader: React.FC<LoaderProps> = ({ text = "ANALYZING..." }) => {
  const [emojiIndex, setEmojiIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setEmojiIndex((prev) => (prev + 1) % EMOJIS.length);
    }, 400); // Cycle emojis every 400ms
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020c0a]/90 backdrop-blur-xl text-[#00ff88] overflow-hidden">
      {/* Background Decor: subtle pulsating gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#00ff8810] via-transparent to-transparent pointer-events-none animate-pulse" />
      
      {/* Central Animation Container */}
      <div className="relative w-40 h-40 mb-12 flex items-center justify-center">
        
        {/* Outer Rotating Ring (Clockwise) */}
        <div className="absolute inset-0 border-2 border-[#00ff88]/20 rounded-full animate-[spin_4s_linear_infinite]"></div>
        <div className="absolute inset-0 border-t-2 border-[#00ff88] rounded-full animate-[spin_3s_linear_infinite]"></div>
        
        {/* Inner Rotating Ring (Counter-Clockwise) */}
        <div className="absolute inset-4 border-2 border-[#00ff88]/30 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>
        <div className="absolute inset-4 border-b-2 border-[#00ff88] rounded-full animate-[spin_2s_linear_infinite_reverse]"></div>
        
        {/* Core Glow */}
        <div className="absolute inset-0 rounded-full bg-[#00ff88]/5 animate-pulse shadow-[0_0_30px_#00ff8820]"></div>

        {/* Cycling Emoji */}
        <div key={emojiIndex} className="text-6xl animate-bounce drop-shadow-[0_0_15px_rgba(0,255,136,0.8)] z-10 transition-all duration-300">
            {EMOJIS[emojiIndex]}
        </div>
      </div>

      {/* Text Info */}
      <h2 className="text-2xl font-bold tracking-[0.2em] text-white animate-pulse text-center mb-2 drop-shadow-md">
        {text}
      </h2>
      <p className="text-xs text-[#00ff88] font-mono mb-8 tracking-widest opacity-80">
        PROCESSING BIOLOGICAL NEURAL NETWORK
      </p>

      {/* High-Tech Progress Bar */}
      <div className="relative w-72 h-3 bg-[#0a1f18] rounded-full overflow-hidden border border-[#00ff88]/30 shadow-[0_0_10px_rgba(0,255,136,0.1)]">
        {/* Moving Bar */}
        <div className="absolute top-0 left-0 h-full bg-[#00ff88] w-2/3 animate-[shimmer_2s_infinite_linear] opacity-80 rounded-full"></div>
        
        {/* Shimmer Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
      </div>
      
      {/* Decorative floating particles/text at bottom */}
      <div className="absolute bottom-12 flex gap-4 text-[10px] text-[#00ff88]/50 font-mono">
        <span className="animate-pulse">CPU: ACTIVE</span>
        <span className="animate-pulse delay-75">MEM: OPTIMAL</span>
        <span className="animate-pulse delay-150">NET: SECURE</span>
      </div>
    </div>
  );
};

export default Loader;

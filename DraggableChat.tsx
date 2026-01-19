
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, Maximize2, Minimize2, ZoomIn, ZoomOut, ArrowDownRight } from 'lucide-react';
import { chatWithGemini } from '../services/geminiService';
import { ChatMessage } from '../types';
import { playSound } from '../services/soundService';

const SUGGESTIONS = [
  "How do I scan?",
  "Features?",
  "Gardening help",
  "System check"
];

const MIN_W = 240;
const MIN_H = 320;

const DraggableChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Positions
  const [iconPos, setIconPos] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 100 });
  // Initial state made significantly smaller/compact
  const [winState, setWinState] = useState({ 
    x: window.innerWidth - 300, 
    y: window.innerHeight - 450, 
    w: 280, 
    h: 380 
  });
  
  // Interaction State
  const [interaction, setInteraction] = useState<'NONE' | 'DRAG_ICON' | 'DRAG_WIN' | 'RESIZE'>('NONE');
  
  const startPos = useRef({ x: 0, y: 0 }); // Mouse/Touch start
  const initialWinState = useRef({ ...winState }); // Window state at start of drag
  const initialIconPos = useRef({ ...iconPos }); // Icon position at start of drag

  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: 'init', 
      role: 'model', 
      text: 'Plant Ai v3.0 online. How may I assist?' 
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Interaction Handlers ---

  const handleStart = (
    e: React.MouseEvent | React.TouchEvent, 
    type: 'DRAG_ICON' | 'DRAG_WIN' | 'RESIZE'
  ) => {
    // Prevent dragging if clicking buttons inside the header
    if ((e.target as HTMLElement).closest('button')) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    startPos.current = { x: clientX, y: clientY };
    initialWinState.current = { ...winState };
    initialIconPos.current = { ...iconPos };
    setInteraction(type);
  };

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (interaction === 'NONE') return;

    if(e.cancelable) e.preventDefault(); // Prevent scrolling while dragging

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const dx = clientX - startPos.current.x;
    const dy = clientY - startPos.current.y;

    if (interaction === 'DRAG_ICON') {
      setIconPos({
        x: initialIconPos.current.x + dx,
        y: initialIconPos.current.y + dy
      });
    } else if (interaction === 'DRAG_WIN' && !isFullScreen) {
      setWinState(prev => ({
        ...prev,
        x: initialWinState.current.x + dx,
        y: initialWinState.current.y + dy
      }));
    } else if (interaction === 'RESIZE' && !isFullScreen) {
      setWinState(prev => ({
        ...prev,
        w: Math.max(MIN_W, initialWinState.current.w + dx),
        h: Math.max(MIN_H, initialWinState.current.h + dy)
      }));
    }
  }, [interaction, isFullScreen]);

  const handleEnd = useCallback(() => {
    setInteraction('NONE');
  }, []);

  useEffect(() => {
    if (interaction !== 'NONE') {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchend', handleEnd);
      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchend', handleEnd);
      };
    }
  }, [interaction, handleMove, handleEnd]);

  // --- Actions ---

  const toggleChat = () => {
    if (!isOpen) playSound('click');
    else playSound('cancel');
    setIsOpen(!isOpen);
  };

  const handleZoom = (direction: 'in' | 'out') => {
      playSound('tap');
      setWinState(prev => {
          const scale = direction === 'in' ? 1.1 : 0.9;
          return {
              ...prev,
              w: Math.max(MIN_W, prev.w * scale),
              h: Math.max(MIN_H, prev.h * scale)
          };
      });
  };

  const sendMessage = async (text: string = inputText) => {
    if (!text.trim()) return;
    playSound('tap');
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: text };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      const responseText = await chatWithGemini(history, userMsg.text);
      playSound('success');
      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
        playSound('cancel');
        setMessages(prev => [...prev, { id: 'err', role: 'model', text: 'Connection interrupted.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isOpen, isFullScreen]);


  return (
    <>
      {/* Floating Icon - Draggable */}
      {!isOpen && (
        <div
          className="fixed z-[90] touch-none"
          style={{ left: iconPos.x, top: iconPos.y }}
          onMouseDown={(e) => handleStart(e, 'DRAG_ICON')}
          onTouchStart={(e) => handleStart(e, 'DRAG_ICON')}
          onClick={toggleChat}
        >
          <div className="relative group cursor-pointer hover:scale-110 transition-transform">
             <div className="w-14 h-14 rounded-full bg-[#0a1f18] border-2 border-[#00ff88] shadow-[0_0_15px_#00ff8840] flex items-center justify-center text-[#00ff88]">
                <Bot size={28} />
             </div>
             <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-bounce">1</div>
          </div>
        </div>
      )}

      {/* Chat Window - Draggable & Resizable */}
      {isOpen && (
        <div 
          className="fixed z-[100] flex flex-col glass-panel overflow-hidden shadow-[0_0_50px_rgba(0,255,136,0.1)] border border-[#00ff88]/30 transition-all duration-75"
          style={isFullScreen ? { inset: 0, borderRadius: 0 } : { 
             left: winState.x, 
             top: winState.y, 
             width: winState.w, 
             height: winState.h,
             borderRadius: '1.25rem'
          }}
        >
            {/* Header - Drag Handle */}
            <div 
                className="p-2 border-b border-[#00ff88]/20 flex justify-between items-center bg-[#020c0a] cursor-move select-none touch-none active:bg-[#00ff88]/5 transition-colors"
                onMouseDown={(e) => !isFullScreen && handleStart(e, 'DRAG_WIN')}
                onTouchStart={(e) => !isFullScreen && handleStart(e, 'DRAG_WIN')}
            >
              <div className="flex items-center gap-2 pointer-events-none">
                 <div className="w-6 h-6 rounded-full bg-[#00ff88]/10 flex items-center justify-center border border-[#00ff88]/50">
                    <Bot size={14} className="text-[#00ff88]" />
                 </div>
                 <div>
                    <h3 className="text-white font-bold text-[10px] tracking-wider">PLANT AI</h3>
                    <div className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-[#00ff88] animate-pulse"></span>
                        <span className="text-[8px] text-[#00ff88] uppercase">Online</span>
                    </div>
                 </div>
              </div>

              {/* Header Controls */}
              <div className="flex gap-0.5" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
                {/* Zoom Buttons */}
                {!isFullScreen && (
                    <>
                        <button onClick={() => handleZoom('out')} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition" title="Zoom Out">
                            <ZoomOut size={12} />
                        </button>
                        <button onClick={() => handleZoom('in')} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition" title="Zoom In">
                            <ZoomIn size={12} />
                        </button>
                    </>
                )}
                
                <div className="w-px h-3 bg-white/10 mx-1 self-center"></div>

                <button 
                  onClick={() => setIsFullScreen(!isFullScreen)} 
                  className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition"
                >
                  {isFullScreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>
                <button 
                  onClick={toggleChat} 
                  className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-[#020c0a] to-[#0a1f18]">
               {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                  <div className={`max-w-[85%] p-2 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-[#00ff88] text-black font-semibold rounded-tr-none' 
                      : 'bg-[#1a2e28] text-gray-100 border border-white/5 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                 <div className="flex items-center gap-1 ml-2">
                     <span className="w-1 h-1 bg-[#00ff88] rounded-full animate-bounce"></span>
                     <span className="w-1 h-1 bg-[#00ff88] rounded-full animate-bounce delay-75"></span>
                     <span className="w-1 h-1 bg-[#00ff88] rounded-full animate-bounce delay-150"></span>
                 </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Quick Suggestions */}
            <div className="bg-[#020c0a] px-2 py-1.5 flex gap-1.5 overflow-x-auto no-scrollbar border-t border-white/5">
                {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)} className="whitespace-nowrap px-2 py-0.5 rounded-full bg-white/5 text-[9px] text-[#00ff88] border border-white/10 hover:bg-[#00ff88]/10 transition">
                        {s}
                    </button>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-2 bg-[#020c0a] border-t border-[#00ff88]/10 flex gap-1.5">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask..."
                className="flex-1 bg-[#0a1f18] border border-[#00ff88]/30 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#00ff88]"
              />
              <button 
                onClick={() => sendMessage()}
                disabled={!inputText.trim()}
                className="bg-[#00ff88] text-black w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#00cc6a] disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </div>

            {/* Resize Handle */}
            {!isFullScreen && (
                <div 
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-0.5 z-50 touch-none opacity-50 hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => handleStart(e, 'RESIZE')}
                    onTouchStart={(e) => handleStart(e, 'RESIZE')}
                >
                    <ArrowDownRight size={16} className="text-[#00ff88]" />
                </div>
            )}
        </div>
      )}
    </>
  );
};

export default DraggableChat;

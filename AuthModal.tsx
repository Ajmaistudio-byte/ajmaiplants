
import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, AlertCircle, ArrowRight, UserPlus, LogIn, KeyRound, Sparkles, Upload, User, Globe, CheckCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { updateProfile } from '../services/profileService';
import { ALL_COUNTRIES } from '../constants';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customMessage?: string | null;
}

type AuthMode = 'LOGIN' | 'SIGNUP' | 'RESET';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, customMessage }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Profile Fields
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState(ALL_COUNTRIES.find(c => c === "United States of America") || ALL_COUNTRIES[0]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (customMessage) {
        setMode('SIGNUP'); 
    } else {
        setMode('LOGIN');
    }
    // Reset state on open
    if (isOpen) {
        setIsDone(false);
        setError(null);
        setMessage(null);
    }
  }, [customMessage, isOpen]);

  if (!isOpen) return null;

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getErrorMessage = (err: any): string => {
    if (!err) return "Unknown error occurred";
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    
    // Robust object handling
    if (typeof err === 'object') {
        // Prioritize string properties known in Supabase/Auth errors
        if (typeof err.message === 'string') return err.message;
        if (typeof err.error_description === 'string') return err.error_description;
        if (typeof err.msg === 'string') return err.msg;
        if (typeof err.error === 'string') return err.error;
        
        // If message/error is an object (nested error), try to extract or stringify
        if (err.message && typeof err.message === 'object') {
            return getErrorMessage(err.message);
        }
        if (err.error && typeof err.error === 'object') {
            return getErrorMessage(err.error);
        }

        // Try to stringify the whole object if it's not empty, avoiding [object Object]
        try {
            const json = JSON.stringify(err);
            if (json !== '{}' && !json.includes('[object Object]')) return "Error: " + json;
        } catch {}
    }
    
    return "Authentication failed";
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'SIGNUP') {
        // Sign Up with Metadata
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              username: fullName, // Default username to full name
              country: country,
              avatar_url: avatarPreview, // Storing base64 directly for demo persistence
            }
          }
        });

        if (signUpError) throw signUpError;
        
        // Optimization: Do NOT await this. Run in background to show success screen immediately.
        if (data.user) {
            updateProfile(data.user.id, {
                username: fullName,
                full_name: fullName,
                country: country,
                avatar_url: avatarPreview || undefined
            }).catch(err => console.warn("Background profile sync warning:", err));
        }

        if (data.session) {
            setIsDone(true);
        } else {
            setMessage("Account created. Please verify your email.");
            setMode('LOGIN'); 
        }

      } else if (mode === 'LOGIN') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        onSuccess();
        onClose();
      } else if (mode === 'RESET') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
        if (resetError) throw resetError;
        setMessage("Password reset link sent to your email.");
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  // SUCCESS VIEW
  if (isDone) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
             <div className="glass-panel w-full max-w-sm rounded-2xl p-8 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-[#00ff88]/20 rounded-full flex items-center justify-center mb-6 text-[#00ff88]">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Profile Created</h2>
                <p className="text-gray-400 mb-8">Your agent identity has been established successfully.</p>
                <button 
                    onClick={handleDone}
                    className="w-full bg-[#00ff88] text-black font-bold py-3 rounded-xl hover:bg-[#00cc6a] transition shadow-[0_0_20px_#00ff8840]"
                >
                    DONE
                </button>
             </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden relative shadow-[0_0_50px_rgba(0,255,136,0.15)] my-8">
        
        {/* Header */}
        <div className="p-6 border-b border-[#00ff88]/20 flex justify-between items-center bg-[#00ff88]/5">
          <h2 className="text-xl font-bold text-[#00ff88] tracking-wider flex items-center gap-2">
            {mode === 'LOGIN' && <><LogIn size={20} /> ACCESS TERMINAL</>}
            {mode === 'SIGNUP' && <><UserPlus size={20} /> AGENT REGISTRATION</>}
            {mode === 'RESET' && <><KeyRound size={20} /> RECOVER CREDENTIALS</>}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {customMessage && (
             <div className="mb-6 bg-[#00ff88]/10 border border-[#00ff88] text-[#00ff88] p-4 rounded-xl text-center font-bold shadow-[0_0_15px_rgba(0,255,136,0.2)]">
                <Sparkles className="inline-block mb-1 mr-2" size={18} />
                {customMessage}
             </div>
          )}

          {error && (
            <div className="mb-4 bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="mb-4 bg-green-900/30 border border-[#00ff88]/50 text-[#00ff88] p-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            
            {/* SIGNUP: Profile Fields */}
            {mode === 'SIGNUP' && (
                <div className="space-y-4 mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex justify-center">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-24 h-24 rounded-full bg-[#0a1f18] border-2 border-dashed border-[#00ff88]/50 flex items-center justify-center cursor-pointer hover:bg-[#00ff88]/10 transition relative overflow-hidden group"
                        >
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center text-[#00ff88]/70">
                                    <Upload size={24} />
                                    <span className="text-[10px] uppercase mt-1">Photo</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                <span className="text-xs text-white">Change</span>
                            </div>
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImagePick}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input 
                                type="text" 
                                required={mode === 'SIGNUP'}
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-[#020c0a] border border-[#00ff88]/30 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#00ff88] transition-all"
                                placeholder="Your Name"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">Country</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <select
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="w-full bg-[#020c0a] border border-[#00ff88]/30 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#00ff88] transition-all appearance-none"
                            >
                                {ALL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">Email Identity</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#020c0a] border border-[#00ff88]/30 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#00ff88] focus:shadow-[0_0_10px_rgba(0,255,136,0.2)] transition-all"
                  placeholder="agent@plantaipro.net"
                />
              </div>
            </div>

            {mode !== 'RESET' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">Passcode</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#020c0a] border border-[#00ff88]/30 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#00ff88] focus:shadow-[0_0_10px_rgba(0,255,136,0.2)] transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#00ff88] text-black font-bold py-3 rounded-lg hover:bg-[#00cc6a] transition shadow-[0_0_20px_#00ff8840] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? 'PROCESSING...' : (
                <>
                  {mode === 'LOGIN' ? 'AUTHENTICATE' : mode === 'SIGNUP' ? 'CREATE PROFILE' : 'SEND RESET LINK'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer / Toggle Modes */}
          <div className="mt-6 flex flex-col gap-2 text-center text-sm">
            {mode === 'LOGIN' && (
              <>
                <p className="text-gray-400">
                  Forgot your credentials?{' '}
                  <button onClick={() => setMode('RESET')} className="text-[#00ff88] hover:underline">Reset here</button>
                </p>
                <p className="text-gray-400">
                  New unit?{' '}
                  <button onClick={() => setMode('SIGNUP')} className="text-[#00ff88] hover:underline">Initialize registry</button>
                </p>
              </>
            )}
            
            {mode === 'SIGNUP' && (
              <p className="text-gray-400">
                Already registered?{' '}
                <button onClick={() => setMode('LOGIN')} className="text-[#00ff88] hover:underline">Access Login</button>
              </p>
            )}

            {mode === 'RESET' && (
              <button onClick={() => setMode('LOGIN')} className="text-[#00ff88] hover:underline">
                Return to Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;

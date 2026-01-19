
import React, { useState, useEffect, useRef } from 'react';
import { X, User, Save, Upload, AlertCircle, Sparkles, Globe } from 'lucide-react';
import { User as AppUser } from '../types';
import { updateProfile } from '../services/profileService';
import { ALL_COUNTRIES } from '../constants';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser;
  onUpdate: (updatedData: { username: string; avatarUrl: string }) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
  const [fullName, setFullName] = useState(user.fullName || user.username || '');
  const [country, setCountry] = useState(user.country || ALL_COUNTRIES.find(c => c === "United States of America") || ALL_COUNTRIES[0]);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName(user.fullName || user.username || '');
      setCountry(user.country || ALL_COUNTRIES.find(c => c === "United States of America") || ALL_COUNTRIES[0]);
      setAvatarUrl(user.avatarUrl || '');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await updateProfile(user.id, {
        username: fullName, // keeping username synced with full name for this simple app
        full_name: fullName,
        country: country,
        avatar_url: avatarUrl,
      });
      onUpdate({ username: fullName, avatarUrl });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden relative shadow-[0_0_50px_rgba(0,255,136,0.15)] animate-float">
        
        {/* Header */}
        <div className="p-6 border-b border-[#00ff88]/20 flex justify-between items-center bg-[#00ff88]/5">
          <h2 className="text-xl font-bold text-[#00ff88] tracking-wider flex items-center gap-2">
            <User size={20} /> AGENT PROFILE
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-900/30 border border-[#00ff88]/50 text-[#00ff88] p-3 rounded-lg text-sm flex items-start gap-2">
              <Sparkles size={16} className="mt-0.5 shrink-0" />
              <span>Profile Protocol Updated Successfully.</span>
            </div>
          )}

          <div className="flex flex-col items-center mb-6">
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-28 h-28 rounded-full border-4 border-[#00ff88]/20 bg-[#020c0a] mb-4 overflow-hidden relative group cursor-pointer hover:border-[#00ff88] transition"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#00ff88]/50">
                  <User size={30} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <Upload size={20} className="text-white" />
              </div>
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleImagePick} 
            />
            <p className="text-xs text-gray-500 uppercase tracking-widest">Tap image to update</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#020c0a] border border-[#00ff88]/30 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[#00ff88] focus:shadow-[0_0_10px_rgba(0,255,136,0.2)] transition-all"
                placeholder="Enter your name"
              />
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

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#00ff88] text-black font-bold py-3 rounded-lg hover:bg-[#00cc6a] transition shadow-[0_0_20px_#00ff8840] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? 'UPLOADING...' : (
                <>
                  UPDATE RECORD <Save size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;

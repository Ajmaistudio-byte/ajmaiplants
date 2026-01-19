
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, LogIn, User as UserIcon, LogOut, ArrowLeft, RefreshCw, Zap, Trash2, Settings, Wand2, Eye, EyeOff, Lock, X, Aperture, Download, Share2, ChevronDown, Cpu, Activity, Radio, MessageSquare } from 'lucide-react';
import DraggableChat from './components/DraggableChat';
import Loader from './components/Loader';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import { AppView, User, ScanResult, PlantDetails } from './types';
import { analyzePlantImage } from './services/geminiService';
import { generatePlantImage } from './services/huggingFaceService';
import { supabase } from './services/supabaseClient';
import { getProfile } from './services/profileService';
import { playSound } from './services/soundService';

const FREE_TRIAL_LIMIT = 2;

// --- Smart Splash Screen Component ---
const SmartSplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [terminalText, setTerminalText] = useState<string[]>([]);
  const messages = [
    "INITIALIZING BIOS...",
    "CONNECTING TO NEURAL NET...",
    "CALIBRATING OPTICAL SENSORS...",
    "LOADING BOTANICAL DATABASE...",
    "ACCESS GRANTED."
  ];

  useEffect(() => {
    playSound('startup');

    // Progress Bar Animation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500); // Short delay after 100%
          return 100;
        }
        return prev + 2; // Speed of loading
      });
    }, 50);

    // Terminal Text Animation
    messages.forEach((msg, index) => {
      setTimeout(() => {
        setTerminalText(prev => [...prev.slice(-3), `> ${msg}`]);
        playSound('tap');
      }, index * 600);
    });

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-[#020c0a] flex flex-col items-center justify-center font-mono overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,136,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,136,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      
      {/* Central Core */}
      <div className="relative mb-12">
        <div className="w-32 h-32 rounded-full border-2 border-[#00ff88]/30 flex items-center justify-center animate-spin-slow">
           <div className="w-24 h-24 rounded-full border border-[#00ff88]/50 border-t-transparent animate-spin" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap size={40} className="text-[#00ff88] animate-pulse" />
        </div>
        {/* Orbiting particles */}
        <div className="absolute w-full h-full animate-ping opacity-20 bg-[#00ff88] rounded-full filter blur-xl"></div>
      </div>

      {/* Main Title */}
      <h1 className="text-4xl font-bold text-white tracking-[0.3em] mb-2 glitch-text relative z-10">
        PLANT<span className="text-[#00ff88]">.AI</span>
      </h1>
      <p className="text-[#00ff88] text-xs tracking-widest mb-12 opacity-80">SYSTEM VERSION 3.0.1</p>

      {/* Terminal Output */}
      <div className="w-64 h-24 mb-6 flex flex-col justify-end items-start text-xs text-[#00ff88]/70 leading-relaxed border-l-2 border-[#00ff88]/30 pl-3">
        {terminalText.map((t, i) => (
          <div key={i} className="animate-fade-in">{t}</div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="w-64 h-1 bg-[#0a1f18] relative overflow-hidden rounded-full">
        <div 
          className="h-full bg-[#00ff88] shadow-[0_0_10px_#00ff88]" 
          style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}
        />
      </div>
      <div className="mt-2 text-[#00ff88] text-xs font-bold">{progress}%</div>
    </div>
  );
};

function App() {
  // --- App State ---
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("LOADING...");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  
  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // UI States for Result View
  const [showAiView, setShowAiView] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isCareExpanded, setIsCareExpanded] = useState(false);
  
  // Camera State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Initialize recent scans from LocalStorage
  const [recentScans, setRecentScans] = useState<ScanResult[]>(() => {
    try {
      const saved = localStorage.getItem('cp_recent_scans');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist recent scans to LocalStorage
  useEffect(() => {
    localStorage.setItem('cp_recent_scans', JSON.stringify(recentScans));
  }, [recentScans]);

  // Fetch Profile Helper - Optimized for Speed
  const loadUserProfile = async (sessionUser: any) => {
    // 1. Immediate Load from Metadata (Fastest)
    const meta = sessionUser.user_metadata || {};
    
    // Set user state immediately so UI updates instantly
    setUser({ 
        id: sessionUser.id, 
        isGuest: false, 
        email: sessionUser.email,
        username: meta.username || meta.full_name || undefined,
        fullName: meta.full_name || undefined,
        country: meta.country || undefined,
        avatarUrl: meta.avatar_url || undefined
    });

    // 2. Background Sync with DB (In case metadata is stale)
    getProfile(sessionUser.id).then(profile => {
        if (profile) {
            setUser(prev => {
                if (!prev) return null;
                // Only update if different to avoid re-renders or flickering
                const hasChanges = 
                   (profile.username && profile.username !== prev.username) ||
                   (profile.full_name && profile.full_name !== prev.fullName) ||
                   (profile.country && profile.country !== prev.country) ||
                   (profile.avatar_url && profile.avatar_url !== prev.avatarUrl);

                if (hasChanges) {
                    return {
                        ...prev,
                        username: profile.username || prev.username,
                        fullName: profile.full_name || prev.fullName,
                        country: profile.country || prev.country,
                        avatarUrl: profile.avatar_url || prev.avatarUrl
                    };
                }
                return prev;
            });
        }
    }).catch(err => console.log("Background profile sync note:", err));
  };

  // Check Supabase Session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await loadUserProfile(session.user);
        setView(AppView.DASHBOARD);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        if (!user || user.id !== session.user.id) {
            await loadUserProfile(session.user);
        }
        setView(AppView.DASHBOARD);
      } else {
        if (user && !user.isGuest) {
            setUser(null);
            setView(AppView.LANDING);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [user?.id]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
    };
  }, [cameraStream]);

  // Handle camera stream assignment
  useEffect(() => {
    if (view === AppView.CAMERA && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, view]);

  // --- Auth Handlers ---
  const handleGuest = () => {
    playSound('click');
    setUser({ id: 'guest', isGuest: true });
    setView(AppView.DASHBOARD);
  };

  const handleLogout = async () => {
    playSound('cancel');
    if (user?.isGuest) {
        setUser(null);
        setView(AppView.LANDING);
    } else {
        await supabase.auth.signOut();
        setUser(null);
        setView(AppView.LANDING);
    }
  };

  const handleProfileUpdate = (updatedData: { username: string; avatarUrl: string }) => {
    if (user) {
        // Optimistic update of local user state
        setUser(prev => prev ? ({
            ...prev,
            username: updatedData.username,
            avatarUrl: updatedData.avatarUrl
        }) : null);
    }
  };

  // --- Access Control Logic ---
  const checkAccess = (): boolean => {
    if (user && !user.isGuest) return true;
    if (user?.isGuest) {
        if (recentScans.length >= FREE_TRIAL_LIMIT) {
            playSound('cancel');
            setAuthMessage("TRIAL COMPLETE. SIGN UP FOR UNLIMITED ACCESS.");
            setIsAuthModalOpen(true);
            return false;
        }
    }
    return true;
  };

  const handleDeleteScan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSound('cancel');
    if (window.confirm("Delete this scan record permanently?")) {
      setRecentScans(prev => prev.filter(s => s.id !== id));
      if (scanResult?.id === id) {
        setScanResult(null);
        setView(AppView.DASHBOARD);
      }
    }
  };

  // --- Save & Share Utilities ---
  
  const generateCompositeImage = async (imageSrc: string, details: PlantDetails): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Set high resolution for export (4:4 / 1:1 aspect ratio)
        const width = 1080; 
        const height = 1080;
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(imageSrc);

        // Draw Background
        ctx.fillStyle = '#020c0a';
        ctx.fillRect(0, 0, width, height);

        // Draw Image (Cover Fit)
        const scale = Math.max(width / img.width, height / img.height);
        const x = (width / 2) - (img.width / 2) * scale;
        const y = (height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        // Draw Gradient Overlay for Text Readability
        const gradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0.5)');
        gradient.addColorStop(1, 'rgba(2,12,10,0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // --- Draw Text ---
        const padding = 60;
        let currentY = height - 80; // Bottom margin

        // 1. Care Instructions Logic (Calculated from bottom up)
        // Slightly smaller font for square aspect ratio
        ctx.font = '24px sans-serif';
        const maxWidth = width - (padding * 2);
        const lineHeight = 35;
        
        const words = details.careInstructions.split(' ');
        let line = '';
        const lines = [];
        
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);
        
        // Take at most last 3 lines for image if text is very long
        const displayLines = lines.slice(-4);
        
        const careBlockHeight = displayLines.length * lineHeight;
        const careStartY = currentY - careBlockHeight;
        
        // Draw Care Text
        ctx.fillStyle = '#e0e0e0';
        displayLines.forEach((l, i) => {
            ctx.fillText(l, padding, careStartY + 10 + (i * lineHeight));
        });

        // "Care Protocol" Label
        currentY = careStartY - 40;
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#00ff88';
        ctx.fillText("CARE PROTOCOL", padding, currentY);

        // Scientific Name
        currentY -= 50;
        ctx.font = 'italic 30px sans-serif';
        ctx.fillStyle = '#00ff88';
        ctx.fillText(details.scientificName, padding, currentY);

        // Common Name
        currentY -= 60;
        ctx.font = 'bold 70px sans-serif';
        ctx.fillStyle = '#ffffff';
        // Handle name wrapping
        const nameMetrics = ctx.measureText(details.name);
        if (nameMetrics.width > maxWidth) {
             ctx.font = 'bold 45px sans-serif';
        }
        ctx.fillText(details.name, padding, currentY);

        // Add Watermark
        ctx.font = 'bold 20px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'right';
        ctx.fillText("SCANNED WITH PLANT AI PRO", width - 40, 40);

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  };

  const dataURLtoFile = (dataurl: string, filename: string) => {
    let arr = dataurl.split(','), mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    let mime = mimeMatch[1],
        bstr = atob(arr[1]), 
        n = bstr.length, 
        u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  }

  const handleSaveToGallery = async (imgSrc: string) => {
    playSound('click');
    if (!scanResult) return;
    try {
        const composite = await generateCompositeImage(imgSrc, scanResult.details);
        const link = document.createElement('a');
        link.href = composite;
        link.download = `plantaipro-${scanResult.details.name.replace(/\s+/g, '-').toLowerCase()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Save failed", e);
    }
  };

  const handleShare = async (imgSrc: string, title: string) => {
    playSound('click');
    if (!scanResult) return;
    try {
        const composite = await generateCompositeImage(imgSrc, scanResult.details);
        const file = dataURLtoFile(composite, 'scan.jpg');
        
        const shareData: ShareData = {
            title: 'Plant Ai Pro Scan',
            text: `Check out this ${title}!`,
        };
        
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
            shareData.files = [file];
            await navigator.share(shareData);
        } else {
             alert("Sharing not supported or permission denied.");
        }

    } catch (e) {
        console.error("Share failed", e);
    }
  };

  // --- Core Analysis Logic ---
  const handleAnalysis = async (base64: string) => {
    playSound('scan');
    setIsLoading(true);
    setLoadingText("ANALYZING BIOLOGICAL DATA...");
    setShowAiView(false);
    setIsCareExpanded(false); // Reset expanded state

    try {
        // 1. Analyze with Gemini
        const details = await analyzePlantImage(base64);
        
        const scanId = Date.now().toString();
        const newResult: ScanResult = {
          id: scanId,
          timestamp: Date.now(),
          originalImage: base64,
          details
        };

        setScanResult(newResult);
        setRecentScans(prev => [newResult, ...prev]);
        setView(AppView.RESULT);
        setIsLoading(false);
        playSound('success');

        // 2. Generate Image in Background
        setIsGeneratingAi(true);
        try {
            const aiImage = await generatePlantImage(details.name);
            if (aiImage) {
                setScanResult(prev => {
                    if (prev && prev.id === scanId) {
                        return { ...prev, generatedImage: aiImage };
                    }
                    return prev;
                });
                setRecentScans(prev => prev.map(s => 
                    s.id === scanId ? { ...s, generatedImage: aiImage } : s
                ));
            }
        } catch (genError) {
            console.error("Background AI Gen failed", genError);
        } finally {
            setIsGeneratingAi(false);
        }
    } catch (err) {
        console.error(err);
        playSound('cancel');
        alert("Scan Failed. System Malfunction.");
        setIsLoading(false);
        setView(AppView.DASHBOARD);
    }
  };

  // --- Camera & Upload Handlers ---

  const handleCameraStart = async () => {
    playSound('click');
    if (!checkAccess()) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        setCameraStream(stream);
        setView(AppView.CAMERA);
    } catch (e) {
        console.error("Camera access failed", e);
        // Fallback to file picker if camera fails
        if (fileInputRef.current) {
            fileInputRef.current.setAttribute("capture", "environment");
            fileInputRef.current.click();
        }
    }
  };

  const handleCameraClose = () => {
    playSound('cancel');
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
    }
    setView(AppView.DASHBOARD);
  };

  const handleCapture = () => {
    playSound('click');
    if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            if (cameraStream) {
              cameraStream.getTracks().forEach(track => track.stop());
              setCameraStream(null);
            }
            handleAnalysis(base64);
        }
    }
  };

  const handleUploadClick = () => {
    playSound('click');
    if (!checkAccess()) return;
    if (fileInputRef.current) {
        fileInputRef.current.removeAttribute("capture");
        fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            handleAnalysis(base64);
        };
        reader.readAsDataURL(e.target.files[0]);
    }
  };

  // --- Views ---

  const renderLanding = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden bg-[#020c0a]">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#00ff8810] via-transparent to-transparent pointer-events-none" />
      
      <div className="glass-panel p-8 rounded-3xl w-full max-w-md animate-float relative z-10">
        <h1 className="text-4xl font-bold mb-2 text-[#00ff88]">PLANT AI PRO</h1>
        <p className="text-gray-400 mb-6 font-light tracking-wide">Next-Gen Botanical Intelligence</p>
        
        <div className="relative w-40 h-40 mx-auto mb-8 flex items-center justify-center">
            {/* Holographic Ring */}
            <div className="absolute inset-0 border border-[#00ff88]/20 rounded-full animate-spin-slow"></div>
            <div className="text-7xl filter drop-shadow-[0_0_15px_rgba(0,255,136,0.5)] z-10">🌿</div>
            <div className="absolute -bottom-4 bg-[#00ff88]/10 text-[#00ff88] text-[10px] px-3 py-1 rounded-full border border-[#00ff88]/30">
                SYSTEM ONLINE
            </div>
        </div>

        <div className="space-y-4">
          <button onClick={handleGuest} className="w-full bg-[#00ff88] text-black font-bold py-4 rounded-xl hover:bg-[#00cc6a] transition shadow-[0_0_20px_#00ff8840] flex items-center justify-center gap-2 group">
            <Zap size={20} className="group-hover:text-white transition-colors" /> START FREE TRIAL
          </button>
          
          <button onClick={() => { playSound('click'); setAuthMessage(null); setIsAuthModalOpen(true); }} className="w-full bg-transparent border border-[#00ff88]/50 text-[#00ff88] font-bold py-4 rounded-xl hover:bg-[#00ff88]/10 transition flex items-center justify-center gap-2">
            <LogIn size={20} /> MEMBER LOGIN
          </button>
        </div>
        
        <p className="text-gray-600 text-xs mt-8">
            Interact with the <span className="text-[#00ff88]">AI Assistant</span> below for help.
        </p>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="min-h-screen p-6 pb-24 bg-[#020c0a]">
      <header className="flex justify-between items-center mb-8">
        <div 
            className={`flex items-center gap-3 ${!user?.isGuest ? 'cursor-pointer hover:opacity-80 transition' : ''}`}
            onClick={() => {
                if (!user?.isGuest) {
                    playSound('tap');
                    setIsProfileModalOpen(true);
                }
            }}
        >
            <div className="w-10 h-10 rounded-full border border-[#00ff88] bg-[#0a1f18] overflow-hidden flex items-center justify-center">
                {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    <UserIcon size={20} className="text-[#00ff88]" />
                )}
            </div>
            <div>
                <h2 className="text-xl font-bold text-white leading-tight">
                    {user?.username || (user?.isGuest ? 'Guest User' : 'Agent')}
                </h2>
                <p className="text-[#00ff88] text-xs">
                    {user?.isGuest ? 'Trial Mode' : 'Unlimited Access'}
                </p>
            </div>
        </div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-white" title="Logout">
            <LogOut size={24} />
        </button>
      </header>

      {/* Usage Indicator for Guests */}
      {user?.isGuest && (
        <div className="mb-6 bg-[#0a1f18] border border-yellow-500/30 p-4 rounded-xl flex justify-between items-center">
            <div>
                <p className="text-yellow-500 text-xs font-bold uppercase tracking-widest">Free Trial Status</p>
                <p className="text-white text-sm">{recentScans.length} / {FREE_TRIAL_LIMIT} Scans Used</p>
            </div>
            {recentScans.length >= FREE_TRIAL_LIMIT && (
                <Lock size={20} className="text-yellow-500" />
            )}
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button 
          onClick={handleCameraStart}
          className="glass-panel p-6 rounded-2xl flex flex-col items-center gap-3 hover:bg-[#00ff88]/10 transition active:scale-95 relative overflow-hidden group"
        >
          <div className="w-12 h-12 rounded-full bg-[#00ff88]/20 flex items-center justify-center text-[#00ff88] z-10">
            <Camera size={24} />
          </div>
          <span className="font-semibold text-sm z-10 text-white">Camera</span>
          {user?.isGuest && recentScans.length >= FREE_TRIAL_LIMIT && (
             <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                <Lock className="text-gray-400" />
             </div>
          )}
        </button>

        <button 
           onClick={handleUploadClick}
           className="glass-panel p-6 rounded-2xl flex flex-col items-center gap-3 hover:bg-[#00ff88]/10 transition active:scale-95 relative overflow-hidden group"
        >
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 z-10">
            <Upload size={24} />
          </div>
          <span className="font-semibold text-sm z-10 text-white">Upload</span>
          {user?.isGuest && recentScans.length >= FREE_TRIAL_LIMIT && (
             <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                <Lock className="text-gray-400" />
             </div>
          )}
        </button>
      </div>

      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange} 
      />

      {/* Recent Scans */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-400">Scan Logs</h3>
      </div>
      
      <div className="space-y-4">
        {recentScans.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-gray-800 rounded-xl text-gray-600">
                No data logs found.
            </div>
        ) : (
            recentScans.map((scan) => (
                <div key={scan.id} onClick={() => { playSound('tap'); setScanResult(scan); setView(AppView.RESULT); setShowAiView(false); setIsCareExpanded(false); }} className="glass-panel p-4 rounded-xl flex items-center gap-4 cursor-pointer hover:bg-[#ffffff05] transition group">
                    <img src={scan.originalImage} alt="thumb" className="w-16 h-16 rounded-lg object-cover" />
                    <div className="flex-1">
                        <h4 className="font-bold text-[#00ff88]">{scan.details.name}</h4>
                        <p className="text-xs text-gray-400 italic">{scan.details.scientificName}</p>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteScan(scan.id, e)}
                      className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition z-10"
                      title="Delete Scan"
                    >
                      <Trash2 size={20} />
                    </button>
                </div>
            ))
        )}
      </div>
    </div>
  );

  const renderCamera = () => (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Video Feed */}
        <div className="relative flex-1 bg-black overflow-hidden">
            <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover"
                onLoadedMetadata={() => videoRef.current?.play()} 
            />
            
            {/* Animated Scanner Overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none opacity-50">
                 {/* Grid Pattern */}
                 <div className="w-full h-full bg-[linear-gradient(rgba(0,255,136,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,136,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                 {/* Scanning Line */}
                 <div className="absolute w-full h-2 bg-[#00ff88] shadow-[0_0_20px_#00ff88] animate-scan top-0 left-0"></div>
                 {/* Corners */}
                 <div className="absolute top-8 left-8 w-16 h-16 border-l-4 border-t-4 border-[#00ff88]"></div>
                 <div className="absolute top-8 right-8 w-16 h-16 border-r-4 border-t-4 border-[#00ff88]"></div>
                 <div className="absolute bottom-8 left-8 w-16 h-16 border-l-4 border-b-4 border-[#00ff88]"></div>
                 <div className="absolute bottom-8 right-8 w-16 h-16 border-r-4 border-b-4 border-[#00ff88]"></div>
                 
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#00ff88] font-mono text-xs tracking-widest animate-pulse">
                    TARGET ACQUIRED
                 </div>
            </div>
            
            {/* Close Button */}
            <button 
                onClick={handleCameraClose}
                className="absolute top-6 right-6 z-20 bg-black/50 text-white p-3 rounded-full hover:bg-red-500 transition backdrop-blur-md"
            >
                <X size={24} />
            </button>
        </div>

        {/* Camera Controls */}
        <div className="h-32 bg-black flex items-center justify-center relative">
             <button 
                onClick={handleCapture}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center group active:scale-95 transition"
             >
                <div className="w-16 h-16 bg-white rounded-full group-hover:bg-[#00ff88] transition"></div>
             </button>
             <div className="absolute bottom-4 text-gray-500 text-xs uppercase tracking-widest">
                Optical Sensor Active
             </div>
        </div>
    </div>
  );

  const renderResult = () => {
    if (!scanResult) return null;

    const hasGeneratedImage = !!scanResult.generatedImage;
    // If showAiView is true AND we have one, show it. 
    // If showAiView is false, show original.
    const displayImage = (showAiView && hasGeneratedImage) ? scanResult.generatedImage : scanResult.originalImage;
    const miniImage = (showAiView && hasGeneratedImage) ? scanResult.originalImage : scanResult.generatedImage;
    
    // Ensure valid source
    const mainSrc = displayImage || "https://placehold.co/600x600/0a1f18/00ff88?text=Image+Error";

    return (
        <div className="min-h-screen bg-[#020c0a] flex flex-col items-center justify-center p-4">
             {/* 4:4 (Square) Card Container */}
             <div className="relative w-full max-w-sm aspect-square rounded-[2rem] overflow-hidden shadow-[0_0_40px_rgba(0,255,136,0.15)] border border-[#00ff88]/30 group bg-black">
                
                {/* Main Background Image */}
                <div className="absolute inset-0">
                    <img 
                        src={mainSrc} 
                        className="w-full h-full object-cover" 
                        alt="Result"
                    />
                    {/* Dark Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90"></div>
                </div>

                {/* Top Header */}
                <div className="absolute top-0 left-0 w-full p-6 z-30 flex justify-between items-start">
                    <button 
                        onClick={() => { playSound('cancel'); setView(AppView.DASHBOARD); }}
                        className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-[#00ff88] hover:text-black transition"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleSaveToGallery(mainSrc)}
                            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-[#00ff88] hover:text-black transition"
                        >
                            <Download size={20} />
                        </button>
                        <button 
                            onClick={() => handleShare(mainSrc, scanResult.details.name)}
                            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-[#00ff88] hover:text-black transition"
                        >
                            <Share2 size={20} />
                        </button>
                    </div>
                </div>

                {/* Mini Picture (Toggle) */}
                {hasGeneratedImage && (
                    <button
                        onClick={() => { playSound('tap'); setShowAiView(!showAiView); }}
                        className="absolute top-20 right-6 z-30 w-16 h-16 rounded-xl border-2 border-[#00ff88]/50 overflow-hidden shadow-lg hover:scale-105 transition active:scale-95 bg-gray-900"
                    >
                        <img 
                            src={miniImage} 
                            className="w-full h-full object-cover opacity-80" 
                            alt="Mini"
                        />
                         <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <RefreshCw size={16} className="text-white drop-shadow-md" />
                         </div>
                    </button>
                )}

                {/* Expanded Care Protocol Overlay */}
                {isCareExpanded && (
                   <div 
                     className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl p-8 flex flex-col justify-center animate-fade-in text-left"
                     onClick={(e) => { e.stopPropagation(); playSound('cancel'); setIsCareExpanded(false); }}
                   >
                       <button className="absolute top-6 right-6 text-gray-400 hover:text-white">
                          <X size={24} />
                       </button>
                       <Zap size={32} className="text-[#00ff88] mb-4" />
                       <h2 className="text-2xl font-bold text-white mb-4">Care Protocol</h2>
                       <div className="overflow-y-auto max-h-[60%] pr-2">
                           <p className="text-gray-200 leading-relaxed whitespace-pre-wrap text-sm">
                               {scanResult.details.careInstructions}
                           </p>
                       </div>
                       <div className="mt-6 text-xs text-gray-500 text-center uppercase tracking-widest border-t border-gray-800 pt-4">
                           AI Botanical Advisory
                       </div>
                   </div>
                )}

                {/* Bottom Content */}
                <div className="absolute bottom-0 w-full p-6 z-30 flex flex-col gap-4">
                    
                    {/* Status Chips */}
                    <div className="flex gap-2">
                        <span className="bg-[#00ff88] text-black text-[10px] font-bold px-2 py-1 rounded shadow-[0_0_10px_#00ff8860]">
                            {(scanResult.details.confidence * 100).toFixed(0)}% MATCH
                        </span>
                        {isGeneratingAi && !hasGeneratedImage && (
                            <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse">
                                GENERATING AI...
                            </span>
                        )}
                    </div>

                    {/* Titles */}
                    <div>
                        <h1 className="text-3xl font-bold text-white leading-none mb-1 drop-shadow-md">
                            {scanResult.details.name}
                        </h1>
                        <p className="text-[#00ff88] italic font-mono text-sm opacity-90">
                            {scanResult.details.scientificName}
                        </p>
                    </div>

                    {/* Care Card (Clickable Trigger) */}
                    <div 
                        onClick={() => { playSound('tap'); setIsCareExpanded(true); }}
                        className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/20 transition group/card"
                    >
                        <h3 className="text-[#00ff88] text-xs font-bold uppercase tracking-widest mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-2"><Zap size={12} /> Care Protocol</span>
                            <ChevronDown size={14} className="opacity-50 group-hover/card:opacity-100 transition" />
                        </h3>
                        <p className="text-gray-200 text-sm leading-relaxed line-clamp-2">
                            {scanResult.details.careInstructions}
                        </p>
                    </div>
                </div>
             </div>
        </div>
    );
  };

  // --- Main Render ---

  // Splash Screen Render
  if (showSplash) {
      return <SmartSplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Application Render
  return (
    <>
      <div className="max-w-md mx-auto relative min-h-screen bg-[#020c0a] shadow-2xl overflow-hidden animate-fade-in">
        {isLoading && <Loader text={loadingText} />}
        
        {view === AppView.LANDING && renderLanding()}
        {view === AppView.DASHBOARD && renderDashboard()}
        {view === AppView.RESULT && renderResult()}
        {view === AppView.CAMERA && renderCamera()}
        
        {/* Chat is now always available unless camera is active */}
        {view !== AppView.CAMERA && <DraggableChat />}

        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => { playSound('cancel'); setIsAuthModalOpen(false); }} 
          onSuccess={() => { playSound('success'); setIsAuthModalOpen(false); }}
          customMessage={authMessage}
        />

        {user && (
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => { playSound('cancel'); setIsProfileModalOpen(false); }}
            user={user}
            onUpdate={handleProfileUpdate}
          />
        )}
      </div>
    </>
  );
}

export default App;

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, ShieldAlert, User, Clock, Calendar, Hash, Phone, ArrowLeft } from 'lucide-react';

export default function VerifyPass() {
    const { id } = useParams(); 
    const navigate = useNavigate();
    const [visitor, setVisitor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const verifyVisitor = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/visitors/${id}`);
                setVisitor(response.data);
                setLoading(false);
            } catch (err) {
                setError('Invalid or Expired Pass. Record not found.');
                setLoading(false);
            }
        };
        verifyVisitor();

        // ⏱️ Live clock to prove this is not a screenshot
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [id]);

    // --- LOADING STATE ---
    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-6">
            <div className="animate-pulse flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-blue-400 font-bold tracking-widest uppercase">Verifying ID...</p>
            </div>
        </div>
    );

    // --- ERROR STATE ---
    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-6">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border-b-8 border-red-500">
                <ShieldAlert className="mx-auto text-red-500 mb-4" size={64} />
                <h1 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-wide">Invalid Pass</h1>
                <p className="text-slate-500 mb-8 font-medium">{error}</p>
                <button onClick={() => navigate('/')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-3 rounded-xl w-full transition-colors flex items-center justify-center gap-2">
                    <ArrowLeft size={18} /> Return Home
                </button>
            </div>
        </div>
    );

    // --- SUCCESS STATE (THE DIGITAL BADGE) ---
    const isBanned = visitor.Status === 'Banned';
    const StatusIcon = isBanned ? ShieldAlert : ShieldCheck;
    const themeColor = isBanned ? 'bg-red-500' : 'bg-emerald-500';
    const textColor = isBanned ? 'text-red-600' : 'text-emerald-600';
    const ringColor = isBanned ? 'ring-red-100' : 'ring-emerald-100';
    const statusText = isBanned ? 'ACCESS DENIED' : 'ACCESS GRANTED';

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4 sm:p-6">
            
            {/* The ID Card */}
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden relative">
                
                {/* Top Header - ViSecure Branding */}
                <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
                    <div className="text-white font-black tracking-widest text-lg">ViSecure</div>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <span className="text-slate-300 text-xs font-bold tracking-wider uppercase">Live</span>
                    </div>
                </div>

                {/* Big Status Banner */}
                <div className={`${themeColor} text-white px-6 py-4 flex flex-col items-center justify-center shadow-inner`}>
                    <StatusIcon size={48} className="mb-2 drop-shadow-md" />
                    <h2 className="text-2xl font-black tracking-widest">{statusText}</h2>
                </div>

                {/* Profile Section */}
                <div className="px-6 pt-8 pb-6 text-center border-b border-slate-100">
                    <div className={`mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 ring-8 ${ringColor}`}>
                        <User size={40} className="text-slate-400" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 leading-tight mb-1">
                        {visitor.FullName}
                    </h1>
                    <span className="inline-block px-4 py-1.5 bg-slate-100 text-slate-600 font-bold uppercase tracking-widest text-xs rounded-full mt-2">
                        {visitor.VisitorType || visitor.AffiliationType}
                    </span>
                </div>

                {/* Details Grid */}
                <div className="p-6 space-y-4 bg-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded-lg shadow-sm text-slate-400"><Hash size={20} /></div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visitor ID</p>
                            <p className="font-semibold text-slate-800">{visitor.VisitorID}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded-lg shadow-sm text-slate-400"><Calendar size={20} /></div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered</p>
                            <p className="font-semibold text-slate-800">{new Date(visitor.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded-lg shadow-sm text-slate-400"><Phone size={20} /></div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</p>
                            <p className="font-semibold text-slate-800">{visitor.ContactNumber || 'Unspecified'}</p>
                        </div>
                    </div>
                </div>

                {/* Live Timestamp Footer */}
                <div className="bg-white px-6 py-4 text-center border-t border-slate-100">
                    <div className="flex justify-center items-center gap-2 text-slate-400 mb-4">
                        <Clock size={16} />
                        <span className="text-sm font-semibold tracking-wide font-mono">
                            {currentTime.toLocaleTimeString()}
                        </span>
                    </div>
                    
                    <button 
                        onClick={() => navigate('/')} 
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-4 rounded-xl transition-colors flex justify-center items-center gap-2"
                    >
                        <ArrowLeft size={18} /> Exit Verification
                    </button>
                </div>
            </div>
            
        </div>
    );
}
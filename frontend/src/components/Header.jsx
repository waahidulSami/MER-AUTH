import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, Lock, Zap } from 'lucide-react';
import { assets } from '../assets/assets';

const Header = () => {
  const { userData, isLoggedIn } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center text-center pt-24 pb-16 px-4 max-w-4xl mx-auto">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-8 shadow-xs">
        <Sparkles className="w-4 h-4" />
        <span>Next-Gen MERN Authentication</span>
      </div>

      {/* User Greeting Avatar */}
      <div className="relative mb-6">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-1 shadow-xl shadow-indigo-100">
          <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center overflow-hidden">
            <img src={assets.header_img} alt="User Avatar" className="w-20 h-20 sm:w-24 sm:h-24 object-cover" />
          </div>
        </div>
        <div className="absolute -bottom-2 -right-2 bg-amber-400 p-2 rounded-xl shadow-md">
          <img src={assets.hand_wave} alt="Wave" className="w-5 h-5 animate-bounce" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
        Hey {isLoggedIn && userData ? (typeof userData === 'string' ? userData : userData.name) : 'Developer'}!
      </h1>

      <p className="text-base sm:text-xl text-slate-600 max-w-xl font-normal leading-relaxed mb-8">
        Welcome to your secure authentication portal built with modern minimalist UI and Redux toolkit state management.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
        {!isLoggedIn ? (
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Get Started Now</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-3 rounded-2xl font-semibold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Authenticated Session Active</span>
          </div>
        )}
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 text-left w-full">
        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">JWT & Cookies</h3>
          <p className="text-slate-500 text-xs leading-relaxed">Secure HTTP-Only cookie authentication flow for maximum backend security.</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">Redux State</h3>
          <p className="text-slate-500 text-xs leading-relaxed">Centralized global state management using Redux Toolkit slices & thunks.</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">OTP Verification</h3>
          <p className="text-slate-500 text-xs leading-relaxed">6-digit email OTP verification & instant password reset flow.</p>
        </div>
      </div>
    </div>
  );
};

export default Header;

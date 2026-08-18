import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../redux/slices/authSlice';
import { assets } from '../assets/assets';
import { toast } from 'react-toastify';
import axios from 'axios';
import { LogOut, CheckCircle, Mail, ArrowRight, User } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { userData, isAccountVerify, backendUrl, isLoggedIn } = useSelector((state) => state.auth);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const sendVerification = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(`${backendUrl}/api/auth/send-verify-otp`);
      if (data.success) {
        navigate('/verifyEmail');
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleLogout = async () => {
    const resultAction = await dispatch(logoutUser());
    if (logoutUser.fulfilled.match(resultAction)) {
      toast.success('Logged out successfully');
      navigate('/');
    } else {
      toast.error('Logout failed');
    }
  };

  return (
    <nav className="w-full flex justify-between items-center px-6 sm:px-16 py-5 absolute top-0 left-0 z-50">
      <div 
        onClick={() => navigate('/')} 
        className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
      >
        <img src={assets.logo} className="w-28 sm:w-32" alt="logo" />
      </div>

      {isLoggedIn && userData ? (
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
              {userData.name ? userData.name[0].toUpperCase() : 'U'}
            </div>
            <span className="text-sm font-semibold text-slate-700 pr-1 hidden sm:inline">
              {userData.name || 'User'}
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Signed in as</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{userData.email || userData}</p>
              </div>

              {!isAccountVerify && (
                <button
                  onClick={sendVerification}
                  className="w-full px-4 py-2.5 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2.5 font-medium transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>Verify Email</span>
                </button>
              )}

              {isAccountVerify && (
                <div className="px-4 py-2 text-xs font-medium text-emerald-600 flex items-center gap-1.5 bg-emerald-50 my-1 mx-2 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Account Verified</span>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-all shadow-sm hover:shadow group cursor-pointer"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      )}
    </nav>
  );
};

export default Navbar;

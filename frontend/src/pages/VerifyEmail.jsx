import React, { useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { setIsAccountVerify, getUserData } from '../redux/slices/authSlice';
import { KeyRound, ArrowRight } from 'lucide-react';
import { assets } from '../assets/assets';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const inputsRef = useRef([]);
  const { backendUrl } = useSelector((state) => state.auth);

  axios.defaults.withCredentials = true;

  const handleInput = (e, index) => {
    if (e.target.value.length > 0 && index < inputsRef.current.length - 1) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeydown = (e, index) => {
    if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').slice(0, inputsRef.current.length);
    paste.split('').forEach((char, index) => {
      if (inputsRef.current[index]) {
        inputsRef.current[index].value = char;
      }
    });
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    const otp = inputsRef.current.map((input) => input.value).join('');

    try {
      const { data } = await axios.post(`${backendUrl}/api/auth/verfiy-account`, { otp });

      if (data.success) {
        toast.success(data.message);
        dispatch(setIsAccountVerify(true));
        dispatch(getUserData());
        navigate('/');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden px-4 sm:px-6">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-200 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      <div 
        onClick={() => navigate('/')} 
        className="absolute top-6 left-6 sm:left-12 flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
      >
        <img src={assets.logo} alt="Logo" className="w-28 sm:w-32" />
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 sm:p-10 border border-slate-100 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 shadow-inner">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            Email Verification
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Enter the 6-digit verification code sent to your email
          </p>
        </div>

        <form onSubmit={onSubmitHandler} className="space-y-6">
          <div className="flex justify-between gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <input
                key={index}
                type="text"
                ref={(el) => (inputsRef.current[index] = el)}
                className="w-11 h-12 sm:w-12 sm:h-14 bg-slate-50 border border-slate-200 text-slate-800 text-center text-xl font-bold rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                maxLength={1}
                required
                onInput={(e) => handleInput(e, index)}
                onKeyDown={(e) => handleKeydown(e, index)}
                onPaste={handlePaste}
              />
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all duration-200 flex items-center justify-center gap-2 group"
          >
            <span>Verify Account</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyEmail;

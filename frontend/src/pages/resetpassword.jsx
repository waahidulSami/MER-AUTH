import React, { useState } from "react";
import { assets } from "../assets/assets";
import {  useNavigate } from "react-router-dom";
import { useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";
const Resetpassword = () => {

  const { backendUrl,
     getUserData,
     userData,
      setIsAccountVerify,
      isAccountVerify ,
      isLoggedIn  } = useContext(AppContext);
      axios.defaults.withCredentials= true 
  
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const inputsRef = useRef([]);
  const [otp , setOtp] = useState(0)
  const [isEmailSent, setisEmailSent] = useState(false);
  const [isOtpSubmited, setisOtpSubmited] = useState(false);
  // Input navigation
  const handleInput = (e, index) => {
    if (e.target.value.length > 0 && index < inputsRef.current.length - 1) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeydown = (e, index) => {
    if (e.key === "Backspace" && e.target.value === "" && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData
      .getData("text")
      .slice(0, inputsRef.current.length);
    paste.split("").forEach((char, index) => {
      inputsRef.current[index].value = char;
    });
  };

const onSubmitEmail = async (e) => {
  e.preventDefault();
  try {
    const { data } = await axios.post(
      backendUrl + "/api/auth/send-reset-otp",
      { email }
    );

    if (data.success) {
      toast.success(data.message);
      setisEmailSent(true); // OTP পাঠানো হলে true হবে
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    toast.error(error.response?.data?.message || error.message);
  }
};


const onSubmitOtP = async (e) => {
  e.preventDefault()
  const otpArray = inputsRef.current.map(e => e.value)
  setOtp(otpArray.join(""));

  setisOtpSubmited(true)
}


const onSubmitnewPassword = async (e) => {
  e.preventDefault()
  try {
    const {data} = await axios.post(backendUrl + '/api/auth/reset-password', 
       {email,otp,newPassword})
       data.success ? toast.success(data.message) : toast.error(data.message)
  data.success && navigate('/login')
      } catch (error) {
    toast.error(error.message)
  }
}

  return (
    <div className="flex items-center justify-center min-h-screen px-6 sm:px-0 bg-gradient-to-br from-blue-200 to-purple-300">
      <img
        onClick={() => navigate("/")}
        src={assets.logo}
        alt=""
        className="absolute left-5 sm:left-20 top-5 w-28 sm:w-32 cursor-pointer"
      />
      {/* enter email */}
      {!isEmailSent && (
        <form
          onSubmit={onSubmitEmail}
          className="bg-slate-900 p-8 rounded-lg shadow-lg w-96 text-sm"
        >
          <h1 className="text-3xl font-semibold text-white mb-4 text-center">
            Reset Password OTP
          </h1>
          <p className="text-center text-sm mb-6 text-slate-400">
            Enter your registered Email id.
          </p>
          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 bg-[#33345c] rounded-full">
            <img src={assets.mail_icon} alt="" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="email"
              required
              className="flex-1 text-amber-50 bg-transparent outline-none"
            />
          </div>

          <button className="w-full py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-900 text-amber-50">
            Send
          </button>
        </form>
      )}

      {/* otp iinput from */}
      {!isOtpSubmited && isEmailSent && (
        <form
          onSubmit={onSubmitOtP}
          className="bg-slate-900 p-8 rounded-lg shadow-lg w-96 text-sm"
        >
          <h1 className="text-3xl font-semibold text-white mb-4 text-center">
            Reset password OTP
          </h1>
          <p className="text-center text-sm mb-6 text-slate-400">
            Enter the 6-digit code sent to your email.
          </p>

          <div className="flex justify-between">
            {Array.from({ length: 6 }).map((_, index) => (
              <input
                key={index}
                type="text"
                ref={(el) => (inputsRef.current[index] = el)}
                className="w-12 h-12 bg-[#333A5C] text-white text-center text-xl rounded-md"
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
            className="w-full py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-900 text-amber-50 mt-6"
          >
            Verify Email
          </button>
        </form>
      )}
      {/* new password  */}
      {isOtpSubmited && isEmailSent && (
        <form
          onSubmit={onSubmitnewPassword}
          className="bg-slate-900 p-8 rounded-lg shadow-lg w-96 text-sm"
        >
          <h1 className="text-3xl font-semibold text-white mb-4 text-center">
            New Password
          </h1>
          <p className="text-center text-sm mb-6 text-slate-400">
            Enter the 6-digit code sent to your email.
          </p>
          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 bg-[#33345c] rounded-full">
            <img src={assets.lock_icon} alt="" />
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              placeholder="enter your new password "
              required
              className="flex-1 text-amber-50 bg-transparent outline-none"
            />
          </div>

          <button className="w-full py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-900 text-amber-50">
            Send
          </button>
        </form>
      )}
    </div>
  );
};

export default Resetpassword;

import React, { useContext, useEffect, useRef } from "react";
import { assets } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const inputsRef = useRef([]);

  axios.defaults.withCredentials = true;

const { backendUrl, getUserData,userData, setIsAccountVerify,isAccountVerify ,isLoggedIn  } = useContext(AppContext);


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
    const paste = e.clipboardData.getData("text").slice(0, inputsRef.current.length);
    paste.split("").forEach((char, index) => {
      inputsRef.current[index].value = char;
    });
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    const otp = inputsRef.current.map((input) => input.value).join("");

    try {
      const { data } = await axios.post(`${backendUrl}/api/auth/verfiy-account`, { otp });

     if (data.success) {
  toast.success(data.message);
  setIsAccountVerify(true); // ✅ function call
  await getUserData();
  navigate("/");
}
 else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };




  return (
    <div className="flex items-center justify-center min-h-screen px-6 sm:px-0 bg-gradient-to-br from-blue-200 to-purple-300">
      <img
        onClick={() => navigate("/")}
        src={assets.logo}
        alt="Logo"
        className="absolute left-5 sm:left-20 top-5 w-28 sm:w-32 cursor-pointer"
      />

      <form
        onSubmit={onSubmitHandler}
        className="bg-slate-900 p-8 rounded-lg shadow-lg w-96 text-sm"
      >
        <h1 className="text-3xl font-semibold text-white mb-4 text-center">
          Email Verify OTP
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
    </div>
  );
};

export default VerifyEmail;

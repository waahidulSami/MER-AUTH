import React, { useState } from "react";
import { assets } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios"
import { toast } from "react-toastify";
const Login = () => {
const navgiate = useNavigate()
  const [state, setState] = useState("Sign Up");
  const [name , setName] = useState('')
  const [email , setEmail] = useState('')
  const [password , setPassword] = useState('')

  const {backendUrl , setIsLoggedIn, getUserData } = useContext(AppContext)

const onSubmitHandler = async (e) => {
  e.preventDefault();

  try {
    axios.defaults.withCredentials = true;

    if (state === 'Sign Up') {
      const { data } = await axios.post(
        backendUrl + '/api/auth/register',
        { name, email, password }
      );

      if (data.success) {
        setIsLoggedIn(true);
        getUserData()
       navgiate('/');
      } else {
        toast.error(data.message);
      }
    } else {
      // Handle login
      const { data } = await axios.post(
        backendUrl + '/api/auth/login',
        { email, password },
        { withCredentials: true }  
      );

      if (data.success) {
        setIsLoggedIn(true);
        getUserData()
        console.log("Auth Response:", getUserData);
        navgiate('/');
      } else {
        toast.error(data.message);
      }
    } 
  } catch (error) {
    toast.error(error.response?.data?.message || error.message);
  }
};


  return (
    <div className="flex items-center justify-center min-h-screen px-6 sm:px-0 bg-gradient-to-br from-blue-200 to-purple-300">
      <img
      onClick={() => navgiate("/")}
        src={assets.logo}
        alt=""
        className="absolute left-5 sm:left-20 top-5 w-28 sm:w-32 cursor-pointer"
      />
      <div className="bg-slate-900 p-10 rounded-lg shadow-lg w-full sm:w-96 text-sm">
        <h2 className="text-3xl font-semibold text-white mb-4 text-center">
          {state === "Sign Up" ? "Create Account" : "Login"}
        </h2>
        <p className="text-center text-sm mb-6 text-slate-400">
          {state === "Sign Up"
            ? "Create your account"
            : "Login to your account!"}
        </p>

        <form onSubmit={onSubmitHandler}>
          {state === "Sign Up" && (
            <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 bg-[#33345c] rounded-full">
              <img src={assets.person_icon} alt="" />
              <input
              onChange={e => setName(e.target.value)}
              value={name}
                type="text"
                placeholder="Full Name"
                required
                className="flex-1 text-amber-50 bg-transparent outline-none"
              />
            </div>
          )}

          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 bg-[#33345c] rounded-full">
            <img src={assets.mail_icon} alt="" />
            <input
              onChange={e => setEmail(e.target.value)}
              value={email}
              type="email"
              placeholder="Email"
              required
              className="flex-1 text-amber-50 bg-transparent outline-none"
            />
          </div>

          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 bg-[#33345c] rounded-full">
            <img src={assets.lock_icon} alt="" />
            <input
                 onChange={e => setPassword(e.target.value)}
              value={password}
              type="password"
              placeholder="Password"
              required
              className="flex-1 text-amber-50 bg-transparent outline-none"
            />
          </div>

          {state === "Login" && (
            <p onClick={() => navgiate('/resetPassword')} className="mb-4
             text-indigo-500
              cursor-pointer">Forgot password?</p>
          )}

          <button className="w-full py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-900 text-amber-50">
            {state}
          </button>
        </form>

        {state === "Sign Up" ? (
          <p className="text-gray-400 text-center text-xs mt-4">
            Already have an account?{" "}
            <span
              onClick={() => setState("Login")}
              className="text-blue-400 cursor-pointer underline"
            >
              Login here
            </span>
          </p>
        ) : (
          <p className="text-gray-400 text-center text-xs mt-4">
            Don't have an account?{" "}
            <span
              onClick={() => setState("Sign Up")}
              className="text-blue-400 cursor-pointer underline"
            >
              Sign Up
            </span>
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;

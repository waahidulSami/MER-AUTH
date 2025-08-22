import React, { useContext , useState } from 'react'
import { assets } from '../assets/assets'
import {useNavigate} from "react-router-dom"
import { AppContext } from '../context/AppContext.jsx'
import { toast } from 'react-toastify'
import axios from 'axios'
const Navbar = () => {
  const navigate = useNavigate()

  const {userData , isAccountVerify,  backendUrl
     ,setUserData , setIsLoggedIn }  = useContext(AppContext)
    const [dropdownOpen, setDropdownOpen] = useState(false);

     const sendVerification = async () => {
   try {
       axios.defaults.withCredentials = true;
 
       const {data} = await axios.post(backendUrl + '/api/auth/send-verify-otp')
       if (data.success) {
         navigate('/verifyEmail')
         toast.success(data.message)
       } else {
         toast.error(data.message)
       }
   } catch (error) {
    toast.error(error.message)
   }
     }


const logout = async () => {
    try {
      axios.defaults.withCredentials = true
      const {data} = await axios.post(backendUrl + '/api/auth/logout')
      data.success && setIsLoggedIn(false)
      data.success && setUserData (false)
      navigate('/')
    } catch (error) {
      toast.error(error.message)
    }
  }
  
  return (
    <div className="w-full flex justify-between items-center p-4 sm:p-6 sm:px-24 absolute top-0">
      <img src={assets.logo} className="w-28 sm:w-32" alt="logo" />
 
  {userData ? (
        <div className="relative">
          {/* User Avatar */}
          <div
            className="w-10 h-10 flex justify-center items-center rounded-full bg-black text-amber-50 font-semibold cursor-pointer"
            onClick={() => setDropdownOpen(!dropdownOpen)} // toggle on click
          >
            {userData[0].toUpperCase()}
          </div>

          {/* Dropdown Menu */}
          <div
            className={`absolute top-12 right-0 w-36 bg-white border border-gray-200 rounded shadow-lg overflow-hidden transition-all duration-300 ease-in-out
              ${dropdownOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}
          >
            <ul className="flex flex-col">
              {!isAccountVerify && (
                <li
                  onClick={sendVerification}
                  className="px-4 py-2 hover:bg-gray-200 cursor-pointer"
                >
                  Verify Email
                </li>
              )}
              <li
                onClick={logout}
                className="px-4 py-2 hover:bg-gray-200 cursor-pointer"
              >
                Logout
              </li>
            </ul>
          </div>
        </div>

) : (
  <button
    onClick={() => navigate('/login')}
    className="flex items-center gap-2 border border-gray-600 px-6 py-2 rounded-full cursor-pointer 
      hover:bg-gray-200 transition-all relative"
  >
    Login
    <img
      src={assets.arrow_icon}
      className="w-4 h-4 transform transition-transform duration-200 group-hover:translate-x-1"
      alt="arrow"
    />
  </button>
)}

      

    </div>
  )
}

export default Navbar

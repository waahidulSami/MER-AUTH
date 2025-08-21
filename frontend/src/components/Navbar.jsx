import React, { useContext } from 'react'
import { assets } from '../assets/assets'
import {useNavigate} from "react-router-dom"
import { AppContext } from '../context/AppContext.jsx'
const Navbar = () => {
  const navigate = useNavigate()

  const {userData , isAccountVerify,  backendUrl ,setUserData , setIsLoggedIn }  = useContext(AppContext)
  console.log(userData , isAccountVerify)

  const logout = async () => {
    try {
      
    } catch (error) {
      
    }
  }
  return (
    <div className="w-full flex justify-between items-center p-4 sm:p-6 sm:px-24 absolute top-0">
      <img src={assets.logo} className="w-28 sm:w-32" alt="logo" />
 

 {userData ? (
<div className="relative group">
  {/* User Avatar Circle */}
  <div className="w-10 h-10 flex justify-center items-center rounded-full bg-black text-amber-50 font-semibold cursor-pointer">
    {userData[0].toUpperCase()}
  </div>

  {/* Dropdown Menu */}
  <div className="absolute top-12 right-0 w-36 bg-white border border-gray-200 rounded shadow-lg overflow-hidden
                  max-h-0 opacity-0 group-hover:max-h-40 group-hover:opacity-100 transition-all duration-300 ease-in-out">
    <ul className="flex flex-col">
      {!isAccountVerify && 
      <li className="px-4 py-2 hover:bg-gray-200 cursor-pointer ">Verify Email</li>
      }
      
      <li className="px-4 py-2 hover:bg-gray-200 cursor-pointer">Logout</li>
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

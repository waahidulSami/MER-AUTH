import React from "react";
import { assets } from "../assets/assets";
import { useContext } from "react";
import { AppContext } from "../context/AppContext.jsx";

const Header = () => {
  const {userData} = useContext(AppContext)

  return (
    <div className="flex flex-col items-center mt-10 px+4 text-center tex-gray-800">
      <img
        src={assets.header_img}
        alt=""
        className="w-36 h-36 rounded-full mb-6"
      />
    <h1 className="flex items-center gap-2 sm:text-3xl">
  Hey {userData ? userData : "Developer"}
  <img src={assets.hand_wave} alt="" className="w-8 aspect-square" />
</h1>

      <h2 className="text-3xl sm:text-5xl font-semibold mb-4">welcome to our app </h2>
      <p className="mb-8 max-w-md">hey bro how are you</p>
      <button className="border
       border-gray-600 rounded-full
        px-8 py-2.5 cursor-pointer hover:bg-gray-200 transition-all">Get Started</button>
    </div>
  );
};

export default Header;

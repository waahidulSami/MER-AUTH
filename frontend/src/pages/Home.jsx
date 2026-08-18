import React from 'react';
import Navbar from '../components/Navbar';
import Header from '../components/Header';

const Home = () => {
  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-indigo-100/60 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      <Navbar />
      <Header />
    </div>
  );
};

export default Home;

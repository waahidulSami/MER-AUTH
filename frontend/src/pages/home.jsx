import React from 'react'
import Navbar from '../components/navbar'
import Header from '../components/header'

const home = () => {


  return (
    <div className='flex flex-col items-center
     justify-center min-h-screen bg-[url("/bg_img.png")] bg-cover bg bg-center'>
      <Navbar  />
      <Header />
    </div>
  )
}

export default home

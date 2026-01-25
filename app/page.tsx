"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import HomeHeader from "@/components/home/header"
import BalanceCardSection from "@/components/home/balance-card-section"
import QuickActions from "@/components/home/quick-actions"
import RecentTransactions from "@/components/home/recent-transactions"
import BottomNavigation from "@/components/home/bottom-navigation"
import { useAuth } from "@/hooks/useAuth"
import { Download, Wallet } from "lucide-react";
import Navbar from "@/components/landing/Navbar"
import StepCard from "@/components/landing/StepCard"
import FAQSection from "@/components/landing/Faq"
import Slider from "@/components/landing/Slider"

export default function Home() {
  return (
    <div className="w-full h-dvh">
      {/* NAVBAR */}
      <div className="w-full flex justify-center">
        <Navbar className="fixed" />
      </div>

      {/* Hero Section */}
      <section className="relative w-full flex flex-col gap-20 py-10 justify-center bg-gradient-to-b from-primary to-background items-center text-center pt-35">
        <h1 className="text-[150px] text-black/85 font-medium leading-normal">
        Your 
          <span>
            <video
            className="w-50 inline"
            src="/logo.webm"
            autoPlay
            muted
            loop
            playsInline
            />
          </span> 
        trusted wallet shit
        </h1>
        <a className="relative -top-20 py-5 px-12 transition-all duration-300 font-medium text-xl hover:bg-white rounded-full" href=""><Wallet className="inline mr-2 w-7 h-7 text-black" />Try Saku Now!</a>
        {/* <div className="">
          <img
            className="w-100 rounded-4xl h-auto"
            src="/landing/landing.png"
            />
        </div> */}
      </section>

      {/* Promotion Section  */}
      <section className="relative w-full flex flex-col gap-20 py-10 justify-center items-center text-center">
        <div className="flex flex-col gap-6">
          <h1 className="text-[80px] text-black/85 font-medium leading-normal">Transfer crypto <br /> with phone number</h1>
          <p className="text-2xl text-black/50">Easily transfer IDRX without inputing the complex address</p>
        </div>
        <div className="w-[95%]">
        <Slider />
        </div>
      </section>

      {/* Steps Section  */}
      <section className="relative w-full flex flex-col gap-20 py-10 justify-center items-center text-center pt-30">
        <div className="max-w-200 flex flex-col gap-6">
          <h2 className="text-5xl font-semibold">Transfer crypto with <br /> phone number</h2>
          <p className="text-2xl text-black/50">Easily transfer IDRX without inputing the complex address</p>
        </div>

        <div className="w-full flex justify-center gap-10">
          <StepCard
            step={1}
            title="Deposit Crypto"
            description="Deposit crypto easily just with your phone number"
            imageSrc="/landing/steps1.png"
          />
          <StepCard
            step={2}
            title="Transfer Crypto"
            description="Transfer crypto easily just with your phone number"
            imageSrc="/landing/steps2.png"
          />
          <StepCard
            step={3}
            title="Withdraw Crypto"
            description="Withdraw crypto easily just with your phone number"
            imageSrc="/landing/steps3.png"
          />

        </div>
      </section>

      <section className="relative w-full flex flex-col gap-20 py-20 justify-center items-center text-center pt-30">
        <FAQSection />
      </section>

      {/* Hero Section */}
      <section className="relative w-full p-10 justify-around py-40 h-100 flex gap-20 bg-gradient-to-b from-background to-primary items-center">
        <div className="flex flex-col gap-10">
          <p className="text-2xl font-medium">
            Secure your transaction without wallet addresses. <br />
            <span className="
              bg-gradient-to-r from-amber-600 to-amber-800
              bg-clip-text text-transparent
          ">
    Try Saku and use your phone number instead.
  </span>
</p>

          <a className="w-fit px-12 py-4 bg-gradient-to-r from-amber-300 border border-black to-primary rounded-3xl shadow-2xl" href=""><Wallet className="inline mr-3"/> Try Saku Now</a>
        </div>

        <img className="w-[250px]" src="/landing/cta.gif" alt="" />
      </section>

    </div>
    
  )
}

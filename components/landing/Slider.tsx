"use client"

import React, { useState } from "react"
// @ts-ignore - Types are available but not resolved correctly by Next.js 16
import { Splide, SplideSlide } from "@splidejs/react-splide"
import "@splidejs/react-splide/css"

export default function Slider() {
  const [active, setActive] = useState(false)

  return (
    <div className="relative">
      <Splide
        options={{
          gap: "2rem",
          perPage: 3,
          perMove: 1,
          padding: "5rem",
          arrows: false,
          breakpoints: {
            1024: {
              perPage: 2,
              padding: "3rem",
            },
            640: {
              perPage: 1,
              padding: "1.5rem",
            },
          },
        }}
        onMounted={() => {
          setTimeout(() => {
            setActive(true)
          }, 2000);
        }}
        onMoved={() => setActive(true)}
        aria-label="My Favorite Images"
      >
        <SplideSlide>
          <div
            className={`
              w-full max-w-[420px] z-5 mx-auto relative h-full max-h-[520px]
              text-left p-12 rounded-4xl bg-[#F0F8A4]
              transition-all duration-700 ease-out
              ${active ? "left-0" : "left-90"}
            `}
          >
            <p className="text-4xl font-medium">
              No more long wallet addresses.
            </p>
            <img className="mx-auto w-full" src="/landing/card1.png" alt="" />
          </div>
        </SplideSlide>

        <SplideSlide>
          <div
            className={`
              w-full max-w-[420px] z-4 mx-auto relative h-full max-h-[520px]
              text-left p-12 rounded-4xl bg-[#f7df78]
              transition-all duration-700 ease-out
              ${active ? "left-0" : ""}
            `}
          >
            <p className="text-4xl font-medium">
              Send money with just a phone number.
            </p>
            <img className="mx-auto w-full" src="/landing/card2.png" alt="" />
          </div>
        </SplideSlide>

        <SplideSlide>
          <div
            className={`
              w-full max-w-[420px] z-3 mx-auto relative h-full max-h-[520px]
              text-left p-12 rounded-4xl bg-[#F0F8A4]
              transition-all duration-700 ease-out
              ${active ? "right-0" : "right-90"}
            `}
          >
            <p className="text-4xl font-medium">
              Transfer tokens without worry.
            </p>
            <img className="mx-auto w-full" src="/landing/card3.png" alt="" />
          </div>
        </SplideSlide>

        <SplideSlide>
          <div
            className={`
              w-full max-w-[420px] z-2 mx-auto relative h-full max-h-[520px]
              overflow-hidden text-left p-12 rounded-4xl bg-[#f7df78]
              transition-all duration-700 ease-out
              ${active ? "right-0" : "right-180"}
            `}
          >
            <p className="text-4xl font-medium">
              Secure by design.
            </p>
            <img
              className="mx-auto absolute bottom-0 left-0"
              src="/landing/card4.png"
              alt=""
            />
          </div>
        </SplideSlide>
      </Splide>
    </div>
  )
}

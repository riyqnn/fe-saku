"use client";
import { useState } from "react";

interface NavbarProps {
  className?: string;
}

export default function Navbar({ className = "" }: NavbarProps) {
  const [state, setState] = useState(false);

  const navigation = [
    { title: "Customers", path: "javascript:void(0)" },
    { title: "Careers", path: "javascript:void(0)" },
    { title: "Guides", path: "javascript:void(0)" },
    { title: "Partners", path: "javascript:void(0)" }
  ];

  return (
    <nav
      className={`
        top-6
        bg-white/50
        backdrop-blur-md
        py-1
        w-[80%]
        shadow-2xl
        rounded-2xl
        border
        border-black
        z-50
        ${className}
      `}
    >
      <div className="items-center px-4 max-w-screen-xl mx-auto md:flex md:px-8">

        {/* Logo */}
        <div className="flex items-center justify-between py-3 md:py-5 md:block">
          <a href="#" className="text-green text-xl font-bold">
            Saku
          </a>

          {/* Mobile Toggle */}
          <div className="md:hidden">
            <button
              className="text-green outline-none p-2 rounded-md focus:border-green focus:border"
              onClick={() => setState(!state)}
            >
              {state ? (
                <svg xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0
                    011.414 0L10 8.586l4.293-4.293a1 1 0
                    111.414 1.414L11.414 10l4.293 4.293a1
                    1 0 01-1.414 1.414L10 11.414l-4.293
                    4.293a1 1 0 01-1.414-1.414L8.586 10
                    4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8h16M4 16h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Nav Links */}
        <div
          className={`flex-1 justify-self-center pb-3 mt-8 md:block md:pb-0 md:mt-0 ${
            state ? "block" : "hidden"
          }`}
        >
          <ul className="justify-center items-center space-y-8 md:flex md:space-x-6 md:space-y-0">
            {navigation.map((item, idx) => (
              <li
                key={idx}
                className="text-green hover:text-green/70"
              >
                <a href={item.path}>{item.title}</a>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Button */}
        <div className="hidden md:inline-block">
          <a
            href="#"
            className="py-3 px-4 bg-custom3 border border-black text-custom1 hover:bg-custom3/80 rounded-full shadow"
          >
            Sign In
          </a>
        </div>
      </div>
    </nav>
  );
}

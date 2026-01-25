import React, { useState } from 'react';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';

export default () => {
  const [scrolled, setScrolled] = useState(false);
  
  return (
    <div className='relative '>
      <Splide
        options={ {
          gap   : '2rem',
          perPage: 3,
          perMove: 1,
          padding: '5rem',
          arrows: false,
        } }
        aria-label="My Favorite Images"
      >
        <SplideSlide>
          <div className='w-full max-w-[420px] z-5 mx-auto relative h-full max-h-[520px] text-left p-12 rounded-4xl bg-[#F0F8A4]'>
            <p className='text-4xl font-medium'>Transfer tokens without worry. </p>
            <img className='mx-auto w-full' src="/landing/card1.png" alt="" />
          </div>
        </SplideSlide>
        <SplideSlide>
          <div className='w-full max-w-[420px] z-5 mx-auto relative h-full max-h-[520px] text-left p-12 rounded-4xl bg-[#F0F8A4]'>
            <p className='text-4xl font-medium'>Transfer tokens without worry. </p>
            <img className='mx-auto w-full' src="/landing/card2.png" alt="" />
          </div>
        </SplideSlide>
        <SplideSlide>
          <div className='w-full max-w-[420px] z-5 mx-auto relative h-full max-h-[520px] text-left p-12 rounded-4xl bg-[#F0F8A4]'>
            <p className='text-4xl font-medium'>Transfer tokens without worry. </p>
            <img className='mx-auto w-full' src="/landing/card3.png" alt="" />
          </div>
        </SplideSlide>
        <SplideSlide>
          <div className='w-full max-w-[420px] z-5 mx-auto relative h-full max-h-[520px] overflow-hidden text-left p-12 rounded-4xl bg-[#F0F8A4]'>
            <p className='text-4xl font-medium'>Transfer tokens without worry. </p>
            <img className='mx-auto absolute bottom-0 left-0' src="/landing/card4.png" alt="" />
          </div>
        </SplideSlide>
        
        {/* <SplideSlide>
          <div className='w-full max-w-[420px] mx-auto h-[520px] bg-[#DAD887]'>

          </div>
        </SplideSlide>
        <SplideSlide>
          <div className='w-full max-w-[420px] mx-auto relative -z-1 h-[520px] bg-[#75B06F]'>

          </div>
        </SplideSlide>
        <SplideSlide>
          <div className='w-full max-w-[420px] mx-auto h-[520px] bg-[#36656B]'>

          </div>
        </SplideSlide> */}

      </Splide>
    </div>
  );
}
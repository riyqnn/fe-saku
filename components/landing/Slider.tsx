import React from 'react';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';

export default () => {
  return (
    <Splide
      options={ {
        gap   : '1rem',
        perPage: 2,
        perMove: 1,
        padding: '5rem',
      } }
      aria-label="My Favorite Images"
    >
      <SplideSlide>
        <img className='w-80' src="/logo.png" alt="Image 1"/>
      </SplideSlide>
      <SplideSlide>
        <img className='w-80' src="/logo.png" alt="Image 1"/>
      </SplideSlide>
      <SplideSlide>
        <img className='w-80' src="/logo.png" alt="Image 1"/>
      </SplideSlide>
      <SplideSlide>
        <img className='w-80' src="/logo.png" alt="Image 1"/>
      </SplideSlide>
      <SplideSlide>
        <img className='w-80' src="/logo.png" alt="Image 1"/>
      </SplideSlide>
      
    </Splide>
  );
}
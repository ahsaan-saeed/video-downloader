'use client';

import React from 'react';
import { Hero } from '@/components/sections/Hero';
import { Features } from '@/components/sections/Features';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { SupportedPlatforms } from '@/components/sections/SupportedPlatforms';

export default function Home() {
  return (
    <div className="space-y-8">
      <Hero />
      <Features />
      <HowItWorks />
      <SupportedPlatforms />
    </div>
  );
}

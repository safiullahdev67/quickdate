'use client';

import React from 'react';

export default function DateMap() {
  return (
    <div className="bg-white rounded-3xl shadow-sm p-1 relative h-[280px] sm:h-[340px] md:h-[400px]">
      {/* Map Background */}
      <div className="relative w-full h-full bg-gray-100 rounded-2xl overflow-hidden">
        {/* Static placeholder map image */}
        <img src="/images/map.png" alt="Map" className="absolute inset-0 w-full h-full object-cover" />
      </div>
    </div>
  );
}

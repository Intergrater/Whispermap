import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet with no SSR
const LeafletMapWithNoSSR = dynamic(
  () => import('./LeafletMapClient'),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-gray-100 rounded-lg p-8 text-center h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }
);

export default function LeafletMap(props) {
  return <LeafletMapWithNoSSR {...props} />;
} 
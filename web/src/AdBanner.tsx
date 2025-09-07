import React, { useEffect, useRef, useState } from 'react';

function AdBanner() {
  const adRef = useRef<HTMLModElement>(null);
  const [adBlocked, setAdBlocked] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    console.log('AdBanner mounted');
    
    const checkAds = () => {
      console.log('Checking ads...');
      console.log('adsbygoogle available:', !!(window as any).adsbygoogle);
      console.log('Ad element:', adRef.current);
      
      try {
        if ((window as any).adsbygoogle && adRef.current) {
          console.log('Pushing ad...');
          (window as any).adsbygoogle.push({});
          setAdLoaded(true);
        } else {
          // If adsbygoogle is not available, it's likely blocked
          setAdBlocked(true);
        }
      } catch (e) {
        console.error('AdSense error:', e);
        setAdBlocked(true);
      }
    };

    // Check if script loaded
    const scriptCheck = () => {
      if ((window as any).adsbygoogle) {
        checkAds();
      } else {
        // Script didn't load - likely blocked
        setAdBlocked(true);
      }
    };

    // Initial check after delay
    const timer = setTimeout(scriptCheck, 3000);

    // Additional check for ad block detection
    const fallbackTimer = setTimeout(() => {
      if (adRef.current && !adLoaded) {
        const rect = adRef.current.getBoundingClientRect();
        if (rect.height === 0 || rect.width === 0) {
          setAdBlocked(true);
        }
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, [adLoaded]);

  if (adBlocked) {
    return (
      <div style={{ 
        width: '100%', 
        minHeight: 100, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#f0f0f0', 
        color: '#666',
        border: '1px dashed #ccc',
        borderRadius: '8px',
        margin: '10px 0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>📢 Support CrazyPuzzle</p>
          <small>Please disable ad blocker to support development</small>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minWidth: 320, minHeight: 100, margin: '10px 0' }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minHeight: '100px' }}
        data-ad-client="ca-pub-1917839501702299"
        data-ad-slot="8369048135"
        data-ad-format="auto"
        data-full-width-responsive="true"
        ref={adRef}
      ></ins>
      {!adLoaded && !adBlocked && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100px',
          color: '#999',
          background: '#f8f9fa',
          borderRadius: '4px'
        }}>
          Loading advertisement...
        </div>
      )}
    </div>
  );
}

export default AdBanner;
import React, { useEffect, useRef, useState } from 'react';

function AdBanner() {
  const adRef = useRef(null);
  const [adBlocked, setAdBlocked] = useState(false);

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
        }
      } catch (e) {
        console.error('AdSense error:', e);
      }
    };

    // Wait a bit for the script to load
    const timer = setTimeout(checkAds, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (adBlocked) {
    return (
      <div style={{ width: '100%', minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', color: '#666' }}>
        <p>Support us by disabling your ad blocker</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minWidth: 320, minHeight: 100 }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minHeight: '100px' }}
        data-ad-client="ca-pub-1917839501702299"
        data-ad-slot="8369048135"
        data-ad-format="auto"
        data-full-width-responsive="true"
        ref={adRef}
      ></ins>
    </div>
  );
}

export default AdBanner;
import React, { useEffect, useRef } from 'react';

function AdBanner() {
  const adRef = useRef(null);

  useEffect(() => {
    try {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({});
      }
    } catch (e) {
      console.warn('AdSense failed to load:', e);
    }
  }, []);

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
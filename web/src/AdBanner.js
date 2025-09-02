import React, { useEffect, useRef } from 'react';

function AdBanner() {
  const adRef = useRef(null);

  useEffect(() => {
    try {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({});
      }
    } catch (e) {
      // Fail gracefully if adsbygoogle is not available
      console.warn('AdSense failed to load:', e);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', minHeight: '90px' }}
      data-ad-client="ca-pub-1917839501702299"
      data-ad-slot="8369048135"
      data-ad-format="auto"
      data-full-width-responsive="true"
      ref={adRef}
    ></ins>
  );
}

export default AdBanner;
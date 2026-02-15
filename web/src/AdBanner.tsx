import React, { useEffect, useRef, useState } from 'react';

const AdBanner = React.memo(() => {
  const adRef = useRef<HTMLModElement>(null);
  const [adBlocked, setAdBlocked] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    setDebugInfo('Initializing...');

    const checkAds = () => {
      setDebugInfo('Checking AdSense availability...');

      const adsbygoogle = (window as any).adsbygoogle;

      try {
        if (adsbygoogle && adRef.current) {
          setDebugInfo('Pushing ad request...');

          // Initialize adsbygoogle array if it doesn't exist
          if (!Array.isArray(adsbygoogle)) {
            (window as any).adsbygoogle = [];
          }

          (window as any).adsbygoogle.push({});
          setAdLoaded(true);
          setDebugInfo('Ad request sent successfully');

          // Check if ad actually loaded after some time
          setTimeout(() => {
            if (adRef.current) {
              const rect = adRef.current.getBoundingClientRect();
              const hasContent = adRef.current.innerHTML.trim().length > 100;

              if (rect.height > 50 && hasContent) {
                setDebugInfo('✅ Ad loaded successfully');
              } else {
                setDebugInfo('⚠️ Ad space exists but no ad content (may be normal for new sites)');
              }
            }
          }, 5000);

        } else {
          if (!adsbygoogle) {
            setDebugInfo('❌ AdSense script not loaded');
            setAdBlocked(true);
          } else if (!adRef.current) {
            setDebugInfo('❌ Ad element not found');
          }
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
        setDebugInfo(`❌ Error: ${errorMessage}`);
        setAdBlocked(true);
      }
    };

    // Wait for script to load
    const waitForScript = () => {
      const script = document.querySelector('script[src*="adsbygoogle.js"]');
      const adsbygoogle = (window as any).adsbygoogle;

      if (script) {
        setDebugInfo('AdSense script found, initializing...');
        // Initialize the adsbygoogle array if it doesn't exist
        if (!adsbygoogle) {
          (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        }
        checkAds();
      } else {
        setDebugInfo('❌ AdSense script not found in page');
        setAdBlocked(true);
      }
    };

    // Check immediately and after delays
    const timer1 = setTimeout(waitForScript, 1000);
    const timer2 = setTimeout(waitForScript, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Show debug info in development or with ?debug=true
  const showDebug = process.env.NODE_ENV === 'development' ||
    new URLSearchParams(window.location.search).has('debug');

  if (adBlocked) {
    return (
      <div style={{
        width: '100%',
        minHeight: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.05)',
        color: '#ccc',
        border: '1px dashed rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        margin: '10px 0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>📢 Support CrazyPuzzle</p>
          <small>Please disable ad blocker to support development</small>
          {showDebug && <div style={{ fontSize: '10px', marginTop: '5px' }}>Debug: {debugInfo}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minWidth: 320, minHeight: 100, margin: '10px 0' }}>
      {showDebug && (
        <div style={{
          fontSize: '12px',
          background: 'rgba(25, 118, 210, 0.2)',
          padding: '5px',
          borderRadius: '4px',
          marginBottom: '5px',
          color: '#33ccff'
        }}>
          Debug: {debugInfo}
        </div>
      )}

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
          color: 'rgba(255, 255, 255, 0.5)',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '4px'
        }}>
          Loading advertisement...
        </div>
      )}
    </div>
  );
});

export default AdBanner;
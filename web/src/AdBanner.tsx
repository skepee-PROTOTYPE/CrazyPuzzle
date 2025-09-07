import React, { useEffect, useRef, useState } from 'react';

const AdBanner = React.memo(() => {
  const adRef = useRef<HTMLModElement>(null);
  const [adBlocked, setAdBlocked] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    console.log('AdBanner mounted');
    setDebugInfo('Initializing...');
    
    const checkAds = () => {
      console.log('Checking ads...');
      setDebugInfo('Checking AdSense availability...');
      
      const adsbygoogle = (window as any).adsbygoogle;
      console.log('adsbygoogle available:', !!adsbygoogle);
      console.log('Ad element:', adRef.current);
      
      try {
        if (adsbygoogle && adRef.current) {
          console.log('Pushing ad...');
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
              
              console.log('Ad element dimensions:', rect);
              console.log('Ad element has content:', hasContent);
              
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
        console.error('AdSense error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
        setDebugInfo(`❌ Error: ${errorMessage}`);
        setAdBlocked(true);
      }
    };

    // Wait for script to load
    const waitForScript = () => {
      const script = document.querySelector('script[src*="adsbygoogle.js"]');
      const adsbygoogle = (window as any).adsbygoogle;
      
      console.log('AdSense script element found:', !!script);
      console.log('AdSense object available:', !!adsbygoogle);
      
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
        background: '#f0f0f0', 
        color: '#666',
        border: '1px dashed #ccc',
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
          background: '#e3f2fd', 
          padding: '5px', 
          borderRadius: '4px', 
          marginBottom: '5px',
          color: '#1976d2'
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
          color: '#999',
          background: '#f8f9fa',
          borderRadius: '4px'
        }}>
          Loading advertisement...
        </div>
      )}
    </div>
  );
});

export default AdBanner;
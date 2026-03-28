import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Shield } from 'lucide-react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in',
          onComplete,
        });
      },
    });

    tl.fromTo(logoRef.current,
      { scale: 0, rotation: -180, opacity: 0 },
      { scale: 1, rotation: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.7)' }
    )
    .fromTo(textRef.current,
      { opacity: 0, y: 20, letterSpacing: '0.5em' },
      { opacity: 1, y: 0, letterSpacing: '0.15em', duration: 0.6, ease: 'power3.out' },
      '-=0.3'
    )
    .fromTo(subtitleRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
      '-=0.2'
    )
    .to({}, { duration: 0.8 });

    return () => { tl.kill(); };
  }, [onComplete]);

  return (
    <div ref={containerRef} className="splash-overlay">
      <div className="text-center">
        <div ref={logoRef} className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary mb-6">
          <Shield className="w-10 h-10 text-primary-foreground" />
        </div>
        <div ref={textRef}>
          <h1 className="text-4xl font-bold font-display text-foreground tracking-widest">LIVORIA</h1>
        </div>
        <p ref={subtitleRef} className="text-sm text-muted-foreground mt-2">
          Living Information & Organized Records Archive
        </p>
      </div>
    </div>
  );
}

# Scroll Direction Floating Button

Fitur tombol mengambang yang muncul sesuai arah scroll pengguna, hilang otomatis, dan melakukan scroll ke atas/bawah saat diklik.

## Spesifikasi Fitur

| No | Fitur | Deskripsi |
|----|------|---------|
| 1 | **Deteksi Arah Scroll** | ↑ jika scroll ke atas, ↓ jika scroll ke bawah |
| 2 | **Tampil Cepat** | Muncul setelah gerakan minimal 3px |
| 3 | **Auto Hide** | Hilang setelah 700ms tidak ada pergerakan scroll |
| 4 | **Klik Action** | Klik → scroll smooth ke paling atas (↑) atau paling bawah (↓) |
| 5 | **Anti Flicker** | Tidak muncul selama animasi smooth scroll |
| 6 | **Muncul Kembali** | Hanya muncul lagi jika user melakukan scroll manual setelah klik |
| 7 | **Mobile Friendly** | Support swipe, fling, touch-action, tanpa highlight biru |
| 8 | **Performa Tinggi** | Menggunakan `requestAnimationFrame` + passive listener |
| 9 | **Responsif** | Ukuran mengecil di layar < 500px |
| 10 | **Aksesibilitas** | ARIA label, keyboard focusable |

## Alur Kerja

1. User scroll manual → tombol muncul sesuai arah terakhir
2. User berhenti scroll ≥ 700ms → tombol hilang
3. User klik tombol → 
   - Tombol langsung hilang
   - Halaman scroll smooth ke target
   - Selama animasi, tombol tidak muncul
4. Setelah animasi selesai → tombol tetap hidden sampai user scroll manual lagi

## Teknologi

- React/Reactplus + TypeScript (versi component)
- Animasi gunakan GSAP Fullpower (bisa modifikasi ulang script pada 'Cara Penggunaan' agar lebih powerfull)
- Icon button bisa dicari di web eksternal (flatiocon/flutter/web lainnya) cari yang sangat elegan, estetik dan juga selaras dengan web nya
- Tailwind / CSS Modules / Styled Components (bisa diadaptasi)

## Parameter yang Dapat Disesuaikan

- `hideDelay`: 700ms (default)
- `minDelta`: 3px (sensitivitas)
- `smoothScrollDuration`: estimasi 1400ms
- Warna tombol up/down
- Ukuran tombol

## Cara Penggunaan

```
'use client'; // Jika pakai Next.js App Router

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface ScrollDirectionButtonProps {
  hideDelay?: number;
  minDelta?: number;
  className?: string;
}

const ScrollDirectionButton: React.FC<ScrollDirectionButtonProps> = ({
  hideDelay = 700,
  minDelta = 3,
  className = '',
}) => {
  const [direction, setDirection] = useState<'up' | 'down'>('down');
  const [isVisible, setIsVisible] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  const lastY = useRef(0);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
    clearHideTimer();
  }, [clearHideTimer]);

  const show = useCallback(
    (newDir: 'up' | 'down') => {
      if (isAutoScrolling) return;

      setDirection(newDir);
      setIsVisible(true);

      clearHideTimer();
      hideTimer.current = setTimeout(hide, hideDelay);
    },
    [isAutoScrolling, hideDelay, hide, clearHideTimer]
  );

  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    const delta = Math.abs(currentY - lastY.current);

    if (delta < minDelta) return;

    const newDir = currentY > lastY.current ? 'down' : 'up';
    lastY.current = currentY;
    show(newDir);
  }, [minDelta, show]);

  const scrollToTarget = useCallback(() => {
    hide();

    const target = direction === 'up' ? 0 : document.documentElement.scrollHeight;

    setIsAutoScrolling(true);
    window.scrollTo({ top: target, behavior: 'smooth' });

    // Reset flag setelah estimasi animasi selesai
    setTimeout(() => {
      setIsAutoScrolling(false);
      lastY.current = window.scrollY;
    }, 1400);
  }, [direction, hide]);

  // Scroll listener
  useEffect(() => {
    let rafId: number;

    const onScroll = () => {
      rafId = requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
      clearHideTimer();
    };
  }, [handleScroll, clearHideTimer]);

  // Inisialisasi
  useEffect(() => {
    const initTimer = setTimeout(() => {
      if (window.scrollY > 80) {
        show('down');
      }
    }, 100);

    return () => clearTimeout(initTimer);
  }, [show]);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={scrollToTarget}
      aria-label={direction === 'up' ? 'Scroll ke atas' : 'Scroll ke bawah'}
      className={`
        fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center
        text-white font-bold text-3xl shadow-xl transition-all duration-300
        touch-manipulation active:scale-95
        ${direction === 'up' ? 'bg-blue-600' : 'bg-red-600'}
        ${isVisible ? 'opacity-95 scale-100' : 'opacity-0 scale-75 translate-y-3 pointer-events-none'}
        hover:scale-110 hover:shadow-2xl
        ${className}
      `}
    >
      {direction === 'up' ? '↑' : '↓'}
    </button>
  );
};

export default ScrollDirectionButton;
```

atau

```
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tombol Scroll Arah (Lebih Cepat)</title>
  <style>
    body {
      margin:0; font-family:system-ui,sans-serif;
      background:linear-gradient(#f8fbff,#e8f0ff);
      min-height:500vh; padding:40px 20px; line-height:1.7;
    }
    #btn {
      position:fixed; bottom:24px; right:24px; z-index:9999;
      width:54px; height:54px; border:none; border-radius:50%;
      color:white; font-size:28px; font-weight:bold;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 4px 14px rgba(0,0,0,0.3);
      opacity:0; transform:scale(0.8) translateY(10px);
      transition:opacity 0.25s, transform 0.25s;
      pointer-events:none; touch-action:manipulation;
    }
    #btn.visible { opacity:0.95; transform:scale(1) translateY(0); pointer-events:auto; }
    #btn:active { transform:scale(0.92); }
    #btn.up    { background:#0066cc; }
    #btn.down  { background:#d32f2f; }
    #btn.up::before    { content:"↑"; }
    #btn.down::before  { content:"↓"; }

    @media (hover:hover) and (pointer:fine) {
      #btn.visible:hover { transform:scale(1.08); opacity:1; }
    }
    @media (max-width:500px) {
      #btn { bottom:20px; right:20px; width:50px; height:50px; font-size:26px; }
    }
  </style>
</head>
<body>

  <div style="height:2200px;background:linear-gradient(#fff,#f5f9ff)"></div>
  <div style="height:2400px;background:linear-gradient(#f5f9ff,#e8f0ff)"></div>
  <div style="height:2000px;background:linear-gradient(#e8f0ff,#d8e5ff)"></div>

  <button id="btn" type="button"></button>

  <script>
    const b = document.getElementById('btn');
    let y = scrollY, dir = 'down', t, auto = false;
    const DELAY = 700, MIN = 3;   // ← lebih cepat & sensitif

    function show(d) {
      if (auto) return;
      if (d !== dir) { b.className = d; dir = d; }
      b.classList.add('visible');
      clearTimeout(t);
      t = setTimeout(hide, DELAY);
    }

    function hide() {
      b.classList.remove('visible');
    }

    function onScroll() {
      const cy = scrollY, delta = Math.abs(cy - y);
      if (delta < MIN) return;
      const nd = cy > y ? 'down' : 'up';
      y = cy;
      show(nd);
    }

    addEventListener('scroll', () => {
      requestAnimationFrame(onScroll);
    }, {passive:true});

    b.onclick = () => {
      b.classList.add('pressed');
      setTimeout(() => b.classList.remove('pressed'), 140);

      clearTimeout(t);
      hide();

      const target = dir === 'up' ? 0 : document.documentElement.scrollHeight;
      auto = true;
      scrollTo({top: target, behavior: 'smooth'});

      setTimeout(() => {
        auto = false;
        y = scrollY;
      }, 1400);   // dikurangi sedikit juga
    };

    // init lebih cepat
    setTimeout(() => {
      if (scrollY > 80) show('down');   // threshold init juga diturunkan
    }, 100);
  </script>

</body>
</html>
```

---

**Status**: Production Ready ✓  
**Last Updated**: 25 Maret 2026
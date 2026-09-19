import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  fadeSpeed: number;
  color: string;
}

export default function DemonSlayerWallpaper() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Hinokami Kagura & Sun Breathing ember tones
    const colors = [
      'rgba(255, 69, 58, ',    // Flame red
      'rgba(255, 159, 10, ',   // Fiery orange
      'rgba(255, 214, 10, ',   // Golden sun spark
      'rgba(229, 9, 20, ',     // Netflix Yuva crimson
      'rgba(255, 255, 255, '   // Core white spark
    ];

    const particleCount = Math.min(Math.floor((width * height) / 20000), 55);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.5 + 0.8,
        speedX: (Math.random() - 0.45) * 0.7,
        speedY: -(Math.random() * 1.3 + 0.5), // gentle upward drift
        opacity: Math.random() * 0.7 + 0.2,
        fadeSpeed: Math.random() * 0.006 + 0.002,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity += p.fadeSpeed;

        if (p.opacity > 0.8 || p.opacity < 0.15) {
          p.fadeSpeed = -p.fadeSpeed;
        }

        // Recycle to bottom when off-screen
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.max(0, Math.min(1, p.opacity))})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color + '0.7)';
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden select-none">
      {/* 8K-Grade High Resolution Demon Slayer Artwork */}
      <div 
        className="absolute inset-0 bg-cover bg-[center_top_15%] sm:bg-[center_top_10%] transition-opacity duration-1000"
        style={{
          backgroundImage: `url('https://raw.githubusercontent.com/Bhav-Dua/Wallpaper/main/Tanjiro.jpg')`,
          filter: 'brightness(0.62) contrast(1.15) saturate(1.2)',
          opacity: 0.40
        }}
      />

      {/* Atmospheric Hinokami Kagura Sun Flame Aura */}
      <div 
        className="absolute inset-0 opacity-25 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 80% 20%, rgba(229, 9, 20, 0.35) 0%, transparent 60%), radial-gradient(circle at 15% 70%, rgba(255, 149, 0, 0.25) 0%, transparent 55%)`
        }}
      />

      {/* Floating Flame Embers Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full opacity-75 pointer-events-none" 
      />

      {/* Even Ambient Tint (Preserves 100% visibility of bottom options without heavy dark masks) */}
      <div className="absolute inset-0 bg-[#141414]/55 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(20,20,20,0.75)_100%)] pointer-events-none" />
    </div>
  );
}

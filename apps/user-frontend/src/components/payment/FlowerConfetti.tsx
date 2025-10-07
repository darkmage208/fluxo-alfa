/**
 * @fileoverview Celebratory flower confetti animation component
 * Displays a burst of animated flowers on payment success
 */

import React, { useEffect, useState } from 'react';

interface FlowerConfettiProps {
  duration?: number; // Duration in milliseconds
}

interface Flower {
  id: number;
  emoji: string;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
  scale: number;
}

const FLOWER_EMOJIS = ['🌸', '🌺', '🌻', '🌼', '🌷', '🏵️', '💐', '🌹'];

export const FlowerConfetti: React.FC<FlowerConfettiProps> = ({ duration = 5000 }) => {
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Generate random flowers
    const generatedFlowers: Flower[] = [];
    const numberOfFlowers = 100; // Number of flowers to generate

    for (let i = 0; i < numberOfFlowers; i++) {
      generatedFlowers.push({
        id: i,
        emoji: FLOWER_EMOJIS[Math.floor(Math.random() * FLOWER_EMOJIS.length)],
        left: Math.random() * 100, // Random position from 0-100%
        delay: Math.random() * 1000, // Random delay 0-1s
        duration: 2000 + Math.random() * 2000, // Duration 2-4s
        rotation: Math.random() * 360, // Random rotation
        scale: 0.5 + Math.random() * 0.5, // Scale 0.5-1
      });
    }

    setFlowers(generatedFlowers);

    // Hide animation after duration
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {flowers.map((flower) => (
        <div
          key={flower.id}
          className="absolute animate-fall"
          style={{
            left: `${flower.left}%`,
            top: '-10%',
            animationDelay: `${flower.delay}ms`,
            animationDuration: `${flower.duration}ms`,
            fontSize: '2rem',
            transform: `scale(${flower.scale}) rotate(${flower.rotation}deg)`,
          }}
        >
          {flower.emoji}
        </div>
      ))}
      
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-10vh) scale(var(--scale)) rotate(var(--rotation));
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) scale(var(--scale)) rotate(calc(var(--rotation) + 360deg));
            opacity: 0;
          }
        }
        
        .animate-fall {
          --scale: ${flowers[0]?.scale || 1};
          --rotation: ${flowers[0]?.rotation || 0}deg;
          animation: fall linear forwards;
          will-change: transform, opacity;
        }
      `}</style>
    </div>
  );
};


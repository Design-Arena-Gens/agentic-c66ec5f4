'use client';

import { useEffect, useRef } from 'react';

type Props = {
  meterLevel: number;
  frequencyBins: Uint8Array;
};

export function AvatarCanvas({ meterLevel, frequencyBins }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const levelRef = useRef(0);
  const freqRef = useRef<Uint8Array>(new Uint8Array(0));

  useEffect(() => {
    levelRef.current = meterLevel;
    freqRef.current = frequencyBins;
  }, [meterLevel, frequencyBins]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return undefined;
    }

    let frameId: number;

    const render = () => {
      frameId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(1, '#020617');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const headCenterX = width / 2;
      const headCenterY = height * 0.42;
      const headRadius = Math.min(width, height) * 0.22;

      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = 4;
      ctx.stroke();

      const eyeOffsetX = headRadius * 0.55;
      const eyeOffsetY = headRadius * -0.2;
      const eyeRadius = headRadius * 0.12;
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.arc(headCenterX - eyeOffsetX, headCenterY + eyeOffsetY, eyeRadius, 0, Math.PI * 2);
      ctx.arc(headCenterX + eyeOffsetX, headCenterY + eyeOffsetY, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#020617';
      const pupilRadius = eyeRadius * 0.45;
      ctx.beginPath();
      ctx.arc(headCenterX - eyeOffsetX, headCenterY + eyeOffsetY, pupilRadius, 0, Math.PI * 2);
      ctx.arc(headCenterX + eyeOffsetX, headCenterY + eyeOffsetY, pupilRadius, 0, Math.PI * 2);
      ctx.fill();

      const level = levelRef.current;
      const mouthWidth = headRadius * 1.3;
      const mouthHeight = headRadius * (0.12 + level * 0.45);
      const mouthY = headCenterY + headRadius * 0.55;

      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(headCenterX - mouthWidth / 2, mouthY);
      ctx.quadraticCurveTo(headCenterX, mouthY + mouthHeight, headCenterX + mouthWidth / 2, mouthY);
      ctx.stroke();

      ctx.fillStyle = 'rgba(249, 115, 22, 0.18)';
      ctx.fillRect(headCenterX - mouthWidth / 2, mouthY, mouthWidth, mouthHeight * 1.1);

      const bodyTop = mouthY + headRadius * 0.5;
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(headCenterX, bodyTop);
      ctx.lineTo(headCenterX, bodyTop + headRadius * 2);
      ctx.stroke();

      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(headCenterX, bodyTop + headRadius * 0.6);
      ctx.lineTo(headCenterX - headRadius, bodyTop + headRadius * 1.4);
      ctx.moveTo(headCenterX, bodyTop + headRadius * 0.6);
      ctx.lineTo(headCenterX + headRadius, bodyTop + headRadius * 1.4);
      ctx.stroke();

      const bars = freqRef.current;
      if (bars.length > 0) {
        const baseY = height - 12;
        const segmentWidth = width / 60;
        for (let i = 0; i < 60; i += 1) {
          const idx = Math.min(bars.length - 1, Math.floor((i / 60) * bars.length));
          const magnitude = bars[idx] / 255;
          const barHeight = magnitude * 80;
          ctx.fillStyle = `rgba(${Math.floor(120 + magnitude * 135)}, 90, 255, 0.5)`;
          ctx.fillRect(i * segmentWidth, baseY - barHeight, segmentWidth * 0.6, barHeight);
        }
      }
    };

    render();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={500}
      style={{ width: '100%', height: '100%', borderRadius: '1.5rem' }}
    />
  );
}

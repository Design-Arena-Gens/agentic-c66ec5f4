'use client';

import { useEffect, useRef } from 'react';
import type { PoseFrame } from '../hooks/usePoseDetection';

type Props = {
  frame: PoseFrame;
};

const EDGES: Array<[number, number]> = [
  [0, 1],
  [1, 3],
  [0, 2],
  [2, 4],
  [0, 5],
  [0, 6],
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10],
  [5, 6],
  [5, 11],
  [6, 12],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16]
];

export function BodySkeletonCanvas({ frame }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dataRef = useRef<PoseFrame>({
    landmarks: [],
    inputWidth: 1,
    inputHeight: 1
  });

  useEffect(() => {
    dataRef.current = frame;
  }, [frame]);

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

    const draw = () => {
      frameId = requestAnimationFrame(draw);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, width, height);

      const { landmarks, inputWidth, inputHeight } = dataRef.current;
      if (landmarks.length === 0) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.font = '16px Inter, sans-serif';
        ctx.fillText('Stand in front of your webcam to drive the motion capture rig.', 24, height / 2);
        return;
      }

      ctx.strokeStyle = 'rgba(96, 165, 250, 0.8)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';

      const scaleX = width / inputWidth;
      const scaleY = height / inputHeight;

      EDGES.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        if (!start || !end || (start.score ?? 0) < 0.2 || (end.score ?? 0) < 0.2) {
          return;
        }
        ctx.beginPath();
        ctx.moveTo(start.x * scaleX, start.y * scaleY);
        ctx.lineTo(end.x * scaleX, end.y * scaleY);
        ctx.stroke();
      });

      ctx.fillStyle = '#f97316';
      landmarks.forEach((point) => {
        if ((point.score ?? 0) < 0.2) {
          return;
        }
        ctx.beginPath();
        ctx.arc(point.x * scaleX, point.y * scaleY, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    draw();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={500}
      style={{ width: '100%', height: '100%', borderRadius: '1.5rem' }}
    />
  );
}

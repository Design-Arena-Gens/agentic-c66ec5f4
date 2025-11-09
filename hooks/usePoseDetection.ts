'use client';

import { useEffect, useRef, useState } from 'react';
import type { Pose, PoseDetector } from '@tensorflow-models/pose-detection';

export type PoseLandmark = {
  x: number;
  y: number;
  score?: number;
};

export type PoseSkeleton = PoseLandmark[];
export type PoseFrame = {
  landmarks: PoseSkeleton;
  inputWidth: number;
  inputHeight: number;
};

export function usePoseDetection(videoElement: HTMLVideoElement | null) {
  const [frame, setFrame] = useState<PoseFrame>({
    landmarks: [],
    inputWidth: 1,
    inputHeight: 1
  });
  const detectorRef = useRef<PoseDetector | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!videoElement) {
      setFrame({
        landmarks: [],
        inputWidth: 1,
        inputHeight: 1
      });
      return undefined;
    }

    let isCancelled = false;

    const loadDetector = async () => {
      const [{ createDetector, SupportedModels }, tfCore] = await Promise.all([
        import('@tensorflow-models/pose-detection'),
        import('@tensorflow/tfjs-core')
      ]);
      await import('@tensorflow/tfjs-backend-webgl');
      await tfCore.setBackend('webgl');
      await tfCore.ready();
      return createDetector(SupportedModels.MoveNet, {
        modelType: 'SINGLEPOSE_LIGHTNING'
      });
    };

    const run = async () => {
      if (!detectorRef.current) {
        detectorRef.current = await loadDetector();
      }

      const detector = detectorRef.current;
      const detect = async () => {
        if (isCancelled || !videoElement) {
          return;
        }
        const poses = (await detector.estimatePoses(videoElement, {
          maxPoses: 1,
          flipHorizontal: true
        })) as Pose[];
        if (poses.length > 0) {
          const pose = poses[0];
          const width = videoElement.videoWidth || videoElement.width || 1;
          const height = videoElement.videoHeight || videoElement.height || 1;
          setFrame({
            landmarks: pose.keypoints.map((point) => ({
              x: point.x,
              y: point.y,
              score: point.score
            })),
            inputWidth: width,
            inputHeight: height
          });
        }
        rafRef.current = requestAnimationFrame(detect);
      };
      detect();
    };

    run().catch((error) => {
      console.error('Pose detection error', error);
    });

    return () => {
      isCancelled = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (detectorRef.current) {
        detectorRef.current.dispose?.();
        detectorRef.current = null;
      }
    };
  }, [videoElement]);

  return frame;
}

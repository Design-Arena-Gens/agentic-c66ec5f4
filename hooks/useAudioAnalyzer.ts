'use client';

import { useEffect, useRef, useState } from 'react';

type AnalyzerState = {
  meterLevel: number;
  frequencyBins: Uint8Array;
};

export function useAudioAnalyzer(audioElement: HTMLAudioElement | null) {
  const [state, setState] = useState<AnalyzerState>({
    meterLevel: 0,
    frequencyBins: new Uint8Array(0)
  });
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!audioElement) {
      return undefined;
    }

    let cancelled = false;

    const setup = async () => {
      if (!contextRef.current) {
        contextRef.current = new AudioContext();
      }

      const context = contextRef.current;
      if (!context) {
        return;
      }

      if (context.state === 'suspended') {
        try {
          await context.resume();
        } catch (error) {
          console.warn('Audio context resume blocked until user gesture', error);
        }
      }

      if (!sourceRef.current) {
        sourceRef.current = context.createMediaElementSource(audioElement);
      }

      if (!analyserRef.current) {
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.8;
        sourceRef.current.connect(analyser);
        analyser.connect(context.destination);
        analyserRef.current = analyser;
      }

      const analyser = analyserRef.current;
      if (!analyser) {
        return;
      }

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (cancelled) {
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
          sum += dataArray[i];
        }
        const avg = dataArray.length > 0 ? sum / dataArray.length : 0;
        const normalizedLevel = Math.min(1, avg / 255);
        setState({
          meterLevel: normalizedLevel,
          frequencyBins: new Uint8Array(dataArray)
        });
        rafRef.current = requestAnimationFrame(tick);
      };

      tick();
    };

    setup().catch((err) => {
      console.error('Audio setup failed', err);
    });

    return () => {
      cancelled = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      analyserRef.current?.disconnect();
      analyserRef.current = null;
      sourceRef.current?.disconnect();
      sourceRef.current = null;
      if (contextRef.current) {
        contextRef.current.close().catch(() => {});
        contextRef.current = null;
      }
    };
  }, [audioElement]);

  return state;
}

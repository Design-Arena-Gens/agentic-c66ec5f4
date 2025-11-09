'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AvatarCanvas } from '@/components/AvatarCanvas';
import { BodySkeletonCanvas } from '@/components/BodySkeletonCanvas';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { usePoseDetection } from '@/hooks/usePoseDetection';

type StatusBadge = {
  label: string;
  tone: 'default' | 'warning' | 'success';
};

export default function HomePage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const [status, setStatus] = useState<StatusBadge>({
    label: 'Waiting for input',
    tone: 'default'
  });
  const [audioState, setAudioState] = useState({
    meterLevel: 0,
    frequencyBins: new Uint8Array(0)
  });
  const microphoneCleanupRef = useRef<() => void>();

  const { meterLevel, frequencyBins } = useAudioAnalyzer(audioRef.current);
  const poseFrame = usePoseDetection(cameraActive ? videoRef.current : null);

  const updateStatus = (badge: StatusBadge) => {
    setStatus(badge);
  };

  const handleAudioUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const url = URL.createObjectURL(file);
    setAudioUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return url;
    });
    updateStatus({ label: `Loaded audio • ${file.name}`, tone: 'success' });
  };

  const toggleCamera = async () => {
    if (cameraActive) {
      videoStreamRef.current?.getTracks().forEach((track) => track.stop());
      videoStreamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
      updateStatus({ label: 'Camera stopped', tone: 'default' });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 256, height: 256 },
        audio: false
      });
      videoStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      updateStatus({ label: 'Camera streaming', tone: 'success' });
    } catch (error) {
      console.error('Camera access failed', error);
      updateStatus({ label: 'Camera access denied', tone: 'warning' });
    }
  };

  const toggleMicrophone = async () => {
    if (microphoneActive) {
      microphoneCleanupRef.current?.();
      microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
      microphoneStreamRef.current = null;
      setMicrophoneActive(false);
      updateStatus({ label: 'Microphone stopped', tone: 'default' });
      return;
    }

    try {
      microphoneCleanupRef.current?.();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let rafId: number;

      const render = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
          sum += dataArray[i];
        }
        const avg = dataArray.length > 0 ? sum / dataArray.length : 0;
        const normalizedLevel = Math.min(1, avg / 255);
        setAudioState({
          meterLevel: normalizedLevel,
          frequencyBins: new Uint8Array(dataArray)
        });
        rafId = requestAnimationFrame(render);
      };

      render();

      microphoneCleanupRef.current = () => {
        cancelAnimationFrame(rafId);
        analyser.disconnect();
        source.disconnect();
        audioContext.close();
        stream.getAudioTracks().forEach((track) => track.stop());
        microphoneStreamRef.current = null;
        setAudioState({ meterLevel: 0, frequencyBins: new Uint8Array(0) });
      };

      setMicrophoneActive(true);
      updateStatus({ label: 'Microphone streaming', tone: 'success' });
    } catch (error) {
      console.error('Microphone access failed', error);
      updateStatus({ label: 'Microphone access denied', tone: 'warning' });
    }
  };

  useEffect(() => {
    if (microphoneActive) {
      return;
    }
    setAudioState({ meterLevel, frequencyBins });
  }, [meterLevel, frequencyBins, microphoneActive]);

  useEffect(() => {
    if (!audioRef.current || !audioUrl) {
      return;
    }
    const audioElement = audioRef.current;
    audioElement.src = audioUrl;
    audioElement.load();
    audioElement.play().catch(() => {
      updateStatus({ label: 'Audio ready — press play', tone: 'warning' });
    });
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      videoStreamRef.current?.getTracks().forEach((track) => track.stop());
      microphoneCleanupRef.current?.();
      microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const cameraStatus = useMemo(() => {
    if (cameraActive) {
      return 'Tracking body motion';
    }
    return 'Camera idle';
  }, [cameraActive]);

  return (
    <main className="page-shell">
      <header className="hero">
        <div>
          <h1>LipSync Motion Lab</h1>
          <p>
            Blend AI-driven lipsync with real-time body motion capture directly in your browser.
            Upload audio or speak into the microphone and mirror your moves for instant avatar
            performance.
          </p>
        </div>
        <div className={`status-badge status-${status.tone}`}>{status.label}</div>
      </header>

      <section className="grid">
        <div className="panel">
          <h2>Avatar Lipsync</h2>
          <AvatarCanvas meterLevel={audioState.meterLevel} frequencyBins={audioState.frequencyBins} />
          <div className="panel-controls">
            <label className="file-input">
              <input type="file" accept="audio/*" onChange={handleAudioUpload} />
              <span>Upload Audio</span>
            </label>
            <button type="button" onClick={toggleMicrophone} className={microphoneActive ? 'active' : ''}>
              {microphoneActive ? 'Stop Microphone' : 'Use Microphone'}
            </button>
            <audio ref={audioRef} controls className="audio-player" />
          </div>
        </div>

        <div className="panel">
          <h2>Body Motion Capture</h2>
          <div className="video-wrapper">
            <video ref={videoRef} playsInline muted className="hidden-video" />
            <BodySkeletonCanvas frame={poseFrame} />
          </div>
          <div className="panel-controls">
            <button type="button" onClick={toggleCamera} className={cameraActive ? 'active' : ''}>
              {cameraActive ? 'Stop Camera' : 'Start Camera'}
            </button>
            <span className="camera-status">{cameraStatus}</span>
          </div>
        </div>
      </section>
    </main>
  );
}

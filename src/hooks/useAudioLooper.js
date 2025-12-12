import { useRef, useEffect, useState, useCallback } from "react";

export default function useAudioLooper(fullSrc, loopSrc, fadeTime = 10) {
  const fullRef = useRef(null);
  const loopRef = useRef(null);
  const fadeIntervals = useRef([]);
  const loopTimeouts = useRef([]);
  const [muted, setMutedState] = useState(false);

  const fade = (audio, targetVol, duration) => {
    const steps = 20;
    const stepTime = (duration * 1000) / steps;
    const startVol = audio.volume;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      audio.volume = Math.min(Math.max(startVol + ((targetVol - startVol) * i) / steps, 0), 1);
      if (i >= steps) clearInterval(interval);
    }, stepTime);
    fadeIntervals.current.push(interval);
  };

  const clearAllTimers = () => {
    fadeIntervals.current.forEach(clearInterval);
    fadeIntervals.current = [];
    loopTimeouts.current.forEach(clearTimeout);
    loopTimeouts.current = [];
  };

  const scheduleLoopFade = useCallback(() => {
    const fullAudio = fullRef.current;
    const loopAudio = loopRef.current;
    if (!fullAudio || !loopAudio) return;

    const startFade = Math.max(fullAudio.duration - fadeTime, 0) * 1000;
    const timeout = setTimeout(() => {
      loopAudio.currentTime = 0;
      loopAudio.play();
      fade(fullAudio, 0, fadeTime);
      fade(loopAudio, 1, fadeTime);

      const loopSchedule = () => {
        const timeout2 = setTimeout(() => {
          const newLoop = loopAudio.cloneNode();
          newLoop.volume = 0;
          newLoop.play();
          fade(loopAudio, 0, fadeTime);
          fade(newLoop, 1, fadeTime);
          loopRef.current = newLoop;
          loopTimeouts.current.push(timeout2);
          loopSchedule();
        }, (loopAudio.duration - fadeTime) * 1000);
        loopTimeouts.current.push(timeout2);
      };

      loopSchedule();
    }, startFade);
    loopTimeouts.current.push(timeout);
  }, [fadeTime]);

  const start = useCallback(() => {
    const fullAudio = fullRef.current;
    const loopAudio = loopRef.current;
    if (!fullAudio || !loopAudio) return;

    clearAllTimers();
    fullAudio.volume = muted ? 0 : 1;
    loopAudio.volume = 0;
    fullAudio.play().catch(() => {});
    if (fullAudio.duration > 0) scheduleLoopFade();
    else fullAudio.onloadedmetadata = scheduleLoopFade;
  }, [muted, scheduleLoopFade]);

  const setMuted = useCallback(
    (value) => {
      setMutedState(value);
      if (fullRef.current) fullRef.current.volume = value ? 0 : 1;
      if (loopRef.current) loopRef.current.volume = value ? 0 : loopRef.current.volume;
    },
    [fullRef, loopRef]
  );

  useEffect(() => {
    return () => {
      clearAllTimers();
      fullRef.current?.pause();
      loopRef.current?.pause();
    };
  }, []);

  return { fullRef, loopRef, start, muted, setMuted };
}

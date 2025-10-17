import { useEffect, useRef } from "react";

/**
 * Plays a full audio track, then crossfades into a looping track indefinitely.
 * Stops all audio when `stop` becomes true.
 *
 * @param {string} fullSrc - URL of full intro audio
 * @param {string} loopSrc - URL of looping audio
 * @param {boolean} stop - stop playback when true
 * @param {number} fadeTime - crossfade time in seconds
 */
export default function useAudioLooper(fullSrc, loopSrc, stop = false, fadeTime = 10) {
  const fullRef = useRef(null);
  const loopRef = useRef(null);
  const fadeIntervals = useRef([]);
  const loopTimeouts = useRef([]);

  useEffect(() => {
    const fullAudio = fullRef.current;
    const loopAudio = loopRef.current;
    if (!fullAudio || !loopAudio) return;

    const clearAllTimers = () => {
      fadeIntervals.current.forEach(clearInterval);
      fadeIntervals.current = [];
      loopTimeouts.current.forEach(clearTimeout);
      loopTimeouts.current = [];
    };

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

    const scheduleLoopFade = () => {
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
            loopRef.current = newLoop; // update ref
            loopTimeouts.current.push(timeout2);
            loopSchedule();
          }, (loopAudio.duration - fadeTime) * 1000);
          loopTimeouts.current.push(timeout2);
        };

        loopSchedule();
      }, startFade);
      loopTimeouts.current.push(timeout);
    };

    if (!stop) {
      fullAudio.volume = 1;
      loopAudio.volume = 0;
      fullAudio.play().catch(() => {}); // play may fail on first interaction

      if (fullAudio.duration > 0) scheduleLoopFade();
      else fullAudio.onloadedmetadata = scheduleLoopFade;
    } else {
      // stop all audio
      clearAllTimers();
      fullAudio.pause();
      loopAudio.pause();
      fullAudio.currentTime = 0;
      loopAudio.currentTime = 0;
    }

    return () => {
      clearAllTimers();
      fullAudio.pause();
      loopAudio.pause();
    };
  }, [stop, fadeTime]);

  return [fullRef, loopRef];
}

import React from "react";
import useAudioLooper from "./hooks/useAudioLooper";

export default function TestAudio() {
  const { fullRef, loopRef, start, muted, setMuted } = useAudioLooper(
    "/fulltitlesong.mp3",
    "/looptitlesong.mp3",
    5
  );

  return (
    <div style={{ padding: 20 }}>
      <button onClick={start} style={{ marginRight: 10 }}>▶️ Play</button>
      <button onClick={() => setMuted(!muted)}>{muted ? "🔇 Unmute" : "🔊 Mute"}</button>

      <audio ref={fullRef} src="/fulltitlesong.mp3" preload="auto" />
      <audio ref={loopRef} src="/looptitlesong.mp3" preload="auto" loop />
    </div>
  );
}

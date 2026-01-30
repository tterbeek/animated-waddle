import React, { useState, useRef, useEffect } from "react";

export default function App() {
  // ===== States =====
  const [playerPool, setPlayerPool] = useState([]); // all saved players
  const [players, setPlayers] = useState([]); // active players for current game
  const [playerName, setPlayerName] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [darts, setDarts] = useState(["", "", ""]);
  const [round, setRound] = useState(1);
  const [undoStack, setUndoStack] = useState([]); // last 20 dart snapshots
  const [winner, setWinner] = useState(null); // for winner screen
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef(null);
  const [multiplier, setMultiplier] = useState(1);
  const [currentDart, setCurrentDart] = useState(0);
  const MAX_UNDO = 20;



  // refs
  const dartRefs = [useRef(null), useRef(null), useRef(null)];
  const playerInputRef = useRef(null);
  
  // ===== Load & Save Player Pool =====
  useEffect(() => {
    try {
      const savedPlayers = JSON.parse(localStorage.getItem("playerPool") || "[]");
      setPlayerPool(savedPlayers);
    } catch (err) {
      setPlayerPool([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("playerPool", JSON.stringify(playerPool));
  }, [playerPool]);

useEffect(() => {
  const handleFirstInteraction = () => {
    if (audioRef.current) {
      try {
        audioRef.current.muted = true;
        setIsMuted(true);
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      } catch (err) {
        console.warn("Audio play failed on first interaction:", err);
      }
    }
    document.removeEventListener("click", handleFirstInteraction);
  };

  document.addEventListener("click", handleFirstInteraction);
  return () => document.removeEventListener("click", handleFirstInteraction);
}, []);



  
  // ===== Focus first dart input =====
  useEffect(() => {
    if (gameStarted && dartRefs[0].current) {
      dartRefs[0].current.focus();
    }
  }, [currentPlayerIndex, gameStarted]);

  // ===== Utility: shuffle players =====
  const shuffleArray = (arr) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };


  // ===== Mute / Unmute function =====
  const toggleMute = () => {
    if (audioRef.current) {
      const newMutedState = !isMuted;
      audioRef.current.muted = newMutedState;
      setIsMuted(newMutedState);

      if (!newMutedState) {
        // unmuting: ensure playback resumes
        audioRef.current.play().catch((err) => {
          console.warn("Audio play failed after unmute:", err);
        });
      }
    }
  };

  // ===== Undo helpers =====
  const snapshotState = (overrides = {}) => ({
    players: JSON.parse(JSON.stringify(players)),
    currentPlayerIndex,
    lastScore,
    round,
    darts: [...darts],
    currentDart,
    multiplier,
    gameStarted,
    winner,
    ...overrides,
  });

  const isStartOfTurn = (dartsState, dartIndex) =>
    dartsState.every((d) => !d) && dartIndex === 0;

  const dartsEqual = (a, b) => a.length === b.length && a.every((d, i) => d === b[i]);

  const dartValueToNumber = (d) => {
    if (!d) return 0;
    if (typeof d === "string" && d.toLowerCase() === "bull") return 50;
    const val = Number(d);
    return isNaN(val) ? 0 : val;
  };

  const calculateScore = (values) => values.reduce((acc, d) => acc + dartValueToNumber(d), 0);

  const pushUndoState = (overrides = {}) => {
    const safeOverrides = { ...overrides };
    if (overrides.darts) safeOverrides.darts = [...overrides.darts];
    if (overrides.players) safeOverrides.players = JSON.parse(JSON.stringify(overrides.players));
    const snapshot = snapshotState(safeOverrides);
    setUndoStack((stack) => {
      const next = [...stack, snapshot];
      return next.slice(-MAX_UNDO);
    });
  };

  const restoreSnapshot = (snapshot) => {
    setPlayers(snapshot.players);
    setCurrentPlayerIndex(snapshot.currentPlayerIndex);
    setLastScore(snapshot.lastScore);
    setRound(snapshot.round);
    setDarts(snapshot.darts);
    setCurrentDart(snapshot.currentDart);
    setMultiplier(1); // reset any double/triple after undo
    setWinner(snapshot.winner || null);
    setGameStarted(snapshot.gameStarted);
  };









  // ===== Add / Remove Player =====
  const addPlayer = () => {
    const trimmedName = playerName.trim();
    if (!trimmedName) return;
    if (!playerPool.some((p) => p.name === trimmedName)) {
      setPlayerPool([...playerPool, { name: trimmedName }]);
    }
    setPlayerName("");
    if (playerInputRef.current) playerInputRef.current.focus();
  };

  const removePlayer = (name) => {
    setPlayerPool(playerPool.filter((p) => p.name !== name));
    setPlayers(players.filter((p) => p.name !== name));
  };


  // ===== Keypad logic =====  
  const handleKeypadPress = (value) => {
    if (!gameStarted) return;

    const targetIndex = currentDart;
    const hasHistory = undoStack.length > 0;

    let dartValue = "";

    if (value === "Bull") {
      dartValue = "bull";
    } else if (typeof value === "number") {
      dartValue = value * multiplier;
    }

    const dartString = dartValue.toString();

    setDarts((prev) => {
      const skipSnapshot = hasHistory && isStartOfTurn(prev, targetIndex);
      if (!skipSnapshot) {
        pushUndoState({ darts: prev, currentDart: targetIndex, multiplier });
      }
      const updated = [...prev];
      updated[targetIndex] = dartString;
      return updated;
    });

    // Reset multiplier after each dart
    setMultiplier(1);

    // Move to next dart if available
    setCurrentDart((idx) => (idx < 2 ? idx + 1 : 2));
  };

  const selectDouble = () => setMultiplier(2);
  const selectTriple = () => setMultiplier(3);





  // ===== Start Game =====
  const startGame = () => {
    if (players.length < 2) return;
    const initialized = players.map((p) => ({ ...p, lives: 3, score: 0 }));
    const randomized = shuffleArray(initialized);
    setPlayers(randomized);
    setGameStarted(true);
    setWinner(null);
    setRound(1);
    setLastScore(0);
    setDarts(["", "", ""]);
    setCurrentPlayerIndex(0);
    setUndoStack([]);
    setCurrentDart(0);
    setMultiplier(1);
  };

  // ===== Submit Turn =====
  const submitTurn = (e) => {
    if (e) e.preventDefault();

    if (darts.some((d) => d !== "")) {
      pushUndoState();
    }

    const currentPlayer = { ...players[currentPlayerIndex] };
    const score = calculateScore(darts);

    const bullseyes = darts.filter((d) => typeof d === "string" && d.toLowerCase() === "bull").length;

    currentPlayer.lives += bullseyes;
    if (score < lastScore) currentPlayer.lives -= 1;
    if (currentPlayer.lives < 0) currentPlayer.lives = 0;
    currentPlayer.score = score;

    const updatedPlayers = [...players];
    updatedPlayers[currentPlayerIndex] = currentPlayer;
    setPlayers(updatedPlayers);
    setLastScore(score);

    // check for winner
    const alive = updatedPlayers.filter((p) => p.lives > 0);
    if (alive.length === 1) {
      setWinner(alive[0]);
      setGameStarted(false);
      return;
    }

    // move to next alive player
    let next = (currentPlayerIndex + 1) % updatedPlayers.length;
    while (updatedPlayers[next].lives <= 0) {
      next = (next + 1) % updatedPlayers.length;
    }
    setCurrentPlayerIndex(next);
    if (next === 0) setRound((r) => r + 1);
    setDarts(["", "", ""]);

    setCurrentDart(0);
    setMultiplier(1);

  };

  // ===== Undo Dart =====
  const undoLastDart = () => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;

      let next = [...stack];
      let previous = null;

      // Pop until we find a snapshot that differs from the current view
      while (next.length > 0) {
        const candidate = next[next.length - 1];
        next.pop();
        const dartsChanged = !dartsEqual(candidate.darts, darts);
        const playerChanged = candidate.currentPlayerIndex !== currentPlayerIndex;
        const roundChanged = candidate.round !== round;

        if (dartsChanged || playerChanged || roundChanged) {
          previous = candidate;
          break;
        }
      }

      if (previous) {
        restoreSnapshot(previous);
      }

      return next;
    });
  };

  // ===== Start New Game =====
  const startNewGame = () => {
    // If a game is currently running, ask for confirmation
    if (gameStarted) {
      const confirmRestart = window.confirm(
        "Are you sure you want to restart and lose current game data?"
      );
      if (!confirmRestart) return; // cancel if user says no
    }

    // Reset all game states
    setGameStarted(false);
    setPlayers([]);
    setLastScore(0);
    setRound(1);
    setDarts(["", "", ""]);
    setWinner(null);
    setCurrentPlayerIndex(0);
    setUndoStack([]);
    setCurrentDart(0);
    setMultiplier(1);
  };


  // ===== Heart display (up to 6) =====
  const renderHearts = (lives) => {
    const capped = Math.max(0, Math.min(6, lives));
    return "❤️".repeat(capped);
  };

  const currentTurnScore = calculateScore(darts);
  const hasDartThrown = darts.some((d) => d !== "");
  const pointsLeft = lastScore - currentTurnScore;

  // ===== Winner Screen =====
  if (winner) {
    return (
          <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start", // 👈 top align
        alignItems: "center",
        fontFamily: "Arial",
        backgroundColor: "#fff",
        padding: "40px 20px", // extra top padding for spacing
      }}
    >

        <h1 style={{ fontSize: "2.5rem", marginBottom: 8 }}>🎯 {winner.name} Wins! 🎉</h1>
        <p style={{ fontSize: "1.5rem", marginTop: 6 }}>{renderHearts(winner.lives)}</p>

        <video
          src="/HendrikWins.mp4"
          autoPlay
          loop={false}
          muted={false}
          controls
          style={{ maxWidth: "90%", maxHeight: "65vh", marginTop: 20, borderRadius: 8 }}
        />

        <button
          onClick={startNewGame}
          style={{
            marginTop: "20px",
            fontSize: "1.1rem",
            padding: "10px 18px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Start New Game
        </button>
      </div>
    );
  }



// ===== Main Render =====
return (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      padding: "20px",
      fontFamily: "Arial",
    }}
  >
    <button
      onClick={toggleMute}
      style={{
        backgroundColor: "#e0e0e0",
        padding: "10px 18px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        cursor: "pointer",
        fontWeight: "bold",
        position: "fixed",
        top: 15,
        right: 15,
        zIndex: 1000,
      }}
    >
      {isMuted ? "🔇 Unmute" : "🔊 Mute"}
    </button>

    {!gameStarted ? (
      // ===== Setup View =====
      <div>
        {/* setup content here */}
        <div>
          <h2>Setup Players</h2>

          <div style={{ marginBottom: 12 }}>
            <input
              ref={playerInputRef}
              type="text"
              placeholder="New player name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              style={{ marginRight: "8px", padding: "6px 8px" }}
            />
            <button onClick={addPlayer} style={{ padding: "6px 10px", cursor: "pointer" }}>
              Add Player
            </button>
          </div>

          <h3>Player Pool</h3>

          <ul style={{ listStyle: "none", padding: 0 }}>
            {playerPool.length === 0 && <p>No players yet</p>}
            {playerPool.map((p, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "6px",
                  fontFamily: "monospace",
                }}
              >
                {/* Name + checkbox column (150px) */}
                <span style={{ width: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <label style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={players.some((pl) => pl.name === p.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPlayers([...players, { ...p, lives: 3, score: 0 }]);
                        } else {
                          setPlayers(players.filter((pl) => pl.name !== p.name));
                        }
                      }}
                      style={{ marginRight: "8px" }}
                    />
                    {p.name}
                  </label>
                </span>

                {/* Remove button column (150px) */}
                <span style={{ width: "150px", textAlign: "left" }}>
                  <button onClick={() => removePlayer(p.name)} style={{ cursor: "pointer" }}>
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 12 }}>
            <button onClick={startGame} disabled={players.length < 2} style={{ padding: "8px 12px", cursor: "pointer" }}>
              Start Game
            </button>
          </div>
        </div>

      </div>
    ) : (
      // ===== Game View =====
      <>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          {/* left and right columns here */}
                {/* Left Column: Player Status */}
      <div style={{ flex: 1, minWidth: 250 }}>
        <h2>Darts Game</h2>
        <h3 style={{ marginTop: 12 }}>Player Status</h3>
        <ul style={{ listStyle: "none", padding: 0, marginTop: 10 }}>
          {players.map((p, i) => {
            const isCurrent = i === currentPlayerIndex && p.lives > 0;
            const isDead = p.lives <= 0;
            return (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: isCurrent ? "rgba(144,238,144,0.35)" : "transparent",
                  textDecoration: isDead ? "line-through" : "none",
                  color: isDead ? "#999" : isCurrent ? "#006400" : "#000",
                  fontWeight: isCurrent ? "bold" : "normal",
                  marginBottom: "6px",
                  padding: "8px",
                  borderRadius: 6,
                  transition: "background-color 0.25s ease",
                  fontFamily: "monospace",
                }}
              >
                <span style={{ width: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                <span style={{ width: "150px", textAlign: "center" }}>{p.lives > 0 ? renderHearts(p.lives) : ""}</span>
                <span style={{ width: "150px", textAlign: "right" }}>Score: {p.score}</span>
              </li>
            );
          })}
        </ul>
      </div>
            {/* Right Column */}
      <div style={{ flex: 1, minWidth: 300 }}>
        <h3>Round {round}</h3>
        <h3>
          Current Player: <span style={{ fontWeight: "bold" }}>{players[currentPlayerIndex].name}</span> (Lives: {players[currentPlayerIndex].lives})
        </h3>

        {/* Score Summary */}
        <div
          style={{
            marginTop: "12px",
            padding: "12px 14px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            background: "#f8f8f8",
            maxWidth: "380px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", rowGap: "8px", columnGap: "12px", alignItems: "center" }}>
            <div style={{ fontWeight: "600" }}>Score to beat</div>
            <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{lastScore}</div>

            <div style={{ fontWeight: "600" }}>Current score</div>
            <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {hasDartThrown ? currentTurnScore : "—"}
            </div>

            <div style={{ fontWeight: "600" }}>Points left to score</div>
            <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: pointsLeft < 0 ? "#2d7a2d" : "#000" }}>
              {hasDartThrown ? (
                pointsLeft >= 0 ? pointsLeft : `New high score: ${currentTurnScore}`
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>

        {/* Enter scores */}
        <form onSubmit={submitTurn} style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
            {darts.map((dart, i) => (
              <input
                key={i}
                ref={dartRefs[i]}
                type="text"
                value={dart}
                readOnly
                onClick={() => setCurrentDart(i)}
                style={{ width: "70px", textAlign: "center", padding: "6px 4px", backgroundColor: "#f7f7f7", cursor: "pointer" }}
              />
            ))}
          </div>

        {/* Keypad */}
        <p>Entering dart {currentDart + 1} of 3</p>
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
            {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map((num) => (
              <button type="button" key={num} onClick={() => handleKeypadPress(num)} style={{ padding: "10px", fontSize: "1.1rem", cursor: "pointer" }}>
                {num}
              </button>
            ))}
          </div>

          {/* Bottom row */}
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
            <button type="button" onClick={() => handleKeypadPress(25)} style={{ padding: "12px 0", fontSize: "1rem", cursor: "pointer" }}>Outer Bull</button>
            <button type="button" onClick={() => handleKeypadPress("Bull")} style={{ padding: "12px 0", fontSize: "1rem", cursor: "pointer" }}>Bull</button>
            <button type="button" onClick={selectDouble} style={{ padding: "12px 0", fontSize: "1rem", cursor: "pointer", background: multiplier === 2 ? "#d0f0d0" : "#f0f0f0" }}>Double</button>
            <button type="button" onClick={selectTriple} style={{ padding: "12px 0", fontSize: "1rem", cursor: "pointer", background: multiplier === 3 ? "#d0f0d0" : "#f0f0f0" }}>Triple</button>
          </div>
        </div>

        {/* Submit / Undo row */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
          <button
            type="submit"
            style={{
              padding: "12px 22px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "1rem",
              minWidth: "180px",
              flex: 2,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#c2f0c2",
              border: "1px solid #7acb7a",
              borderRadius: "6px",
            }}
          >
            <span role="img" aria-label="check">✔️</span> Submit Turn
          </button>
          {undoStack.length > 0 && (
            <button
              type="button"
              onClick={undoLastDart}
              style={{
                backgroundColor: "#e6e6e6",
                padding: "10px 14px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                cursor: "pointer",
                fontWeight: "bold",
                flex: 1,
                minWidth: "120px",
              }}
            >
              ⬅️ Undo
            </button>
          )}
        </div>

        {/* Start new game row */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
          <button
            type="button"
            onClick={startNewGame}
            style={{ backgroundColor: "#e0e0e0", padding: "10px 18px", borderRadius: "6px", border: "1px solid #ccc", cursor: "pointer", fontWeight: "bold" }}
          >
            🔄 Start New Game
          </button>
        </div>
        </form>
      </div>
        </div>

      </>
    )}
  {/* Audio element — always present */}
  <audio
    ref={audioRef}
    src="/fulltitlesong.mp3"
    preload="auto"
    loop
    muted={isMuted}
  />
</div>
);
}

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
  const [previousState, setPreviousState] = useState(null); // for undo
  const [winner, setWinner] = useState(null); // for winner screen
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef(null);
  const [multiplier, setMultiplier] = useState(1);
  const [currentDart, setCurrentDart] = useState(0);



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
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
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


  // ===== Mute function =====
const toggleMute = () => {
  if (audioRef.current) {
    audioRef.current.muted = !audioRef.current.muted;
    setIsMuted(audioRef.current.muted);
  }
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
    let dartValue = "";

    if (value === "Bull") {
      dartValue = "bull";
    } else if (typeof value === "number") {
      dartValue = value * multiplier;
    }

    const newDarts = [...darts];
    newDarts[currentDart] = dartValue.toString();
    setDarts(newDarts);

    // Reset multiplier after each dart
    setMultiplier(1);

    // Move to next dart if available
    if (currentDart < 2) {
      setCurrentDart(currentDart + 1);
    }
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
    setPreviousState(null);
  };

  // ===== Submit Turn =====
  const submitTurn = (e) => {
    if (e) e.preventDefault();

    // Save state for undo (deep clone)
    setPreviousState({
      players: JSON.parse(JSON.stringify(players)),
      currentPlayerIndex,
      lastScore,
      round,
    });

    const currentPlayer = { ...players[currentPlayerIndex] };
    const score = darts.reduce((acc, d) => {
      if (!d) return acc;
      if (typeof d === "string" && d.toLowerCase() === "bull") return acc + 50;
      const val = Number(d);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

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

  // ===== Undo Turn =====
  const undoTurn = () => {
    if (!previousState) return;
    setPlayers(previousState.players);
    setCurrentPlayerIndex(previousState.currentPlayerIndex);
    setLastScore(previousState.lastScore);
    setRound(previousState.round);
    setDarts(["", "", ""]);
    setPreviousState(null);
    setWinner(null);
    setGameStarted(true);
    setCurrentDart(0);
    setMultiplier(1);

  };

  // ===== Start New Game =====
  const startNewGame = () => {
    setGameStarted(false);
    setPlayers([]);
    setLastScore(0);
    setRound(1);
    setDarts(["", "", ""]);
    setPreviousState(null);
    setWinner(null);
  };

  // ===== Heart display (up to 6) =====
  const renderHearts = (lives) => {
    const capped = Math.max(0, Math.min(6, lives));
    return "❤️".repeat(capped);
  };

  // ===== Winner Screen =====
  if (winner) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Arial",
          backgroundColor: "#fff",
          padding: 20,
        }}
      >
        <h1 style={{ fontSize: "2.5rem", marginBottom: 8 }}>🎯 {winner.name} Wins! 🎉</h1>
        <p style={{ fontSize: "1.5rem", marginTop: 6 }}>{renderHearts(winner.lives)}</p>

        <video
          src="/winner.mp4"
          autoPlay
          loop={false}
          muted={false}
          style={{ maxWidth: "90%", marginTop: 20, borderRadius: 8 }}
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
      ) : (
        // ===== Game View =====
        <div>
          <h2>Darts Game</h2>
          <h3>Round {round}</h3>
          <h3>
            Current Player:{" "}
            <span style={{ fontWeight: "bold" }}>{players[currentPlayerIndex].name}</span>{" "}
            (Lives: {players[currentPlayerIndex].lives})
          </h3>

          <form onSubmit={submitTurn} style={{ marginTop: 10 }}>
            <p>Enter scores for 3 darts (0–60 or "bull"):</p>
            {darts.map((dart, i) => (
              <input
                key={i}
                ref={dartRefs[i]}
                type="text"
                value={dart}
                onChange={(e) => setDarts(darts.map((d, idx) => (idx === i ? e.target.value : d)))}
                style={{ marginRight: "6px", width: "70px", textAlign: "center", padding: "6px 4px" }}
              />
            ))}
            <button type="submit" style={{ padding: "8px 12px", cursor: "pointer" }}>
              Submit Turn
            </button>
          </form>

         {/* Keypad scoring */}
<p>Entering dart {currentDart + 1} of 3</p>

<div style={{ marginTop: 20, textAlign: "center" }}>
  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
    {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map((num) => (
      <button
        key={num}
        onClick={() => handleKeypadPress(num)}
        style={{
          padding: "10px",
          fontSize: "1.1rem",
          cursor: "pointer",
        }}
      >
        {num}
      </button>
    ))}
  </div>
{/* Bottom row of special buttons */}
<div
  style={{
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
  }}
>
  <button
    onClick={() => handleKeypadPress(25)}
    style={{
      padding: "12px 0",
      fontSize: "1rem",
      cursor: "pointer",
    }}
  >
    Outer Bull
  </button>
  <button
    onClick={() => handleKeypadPress("Bull")}
    style={{
      padding: "12px 0",
      fontSize: "1rem",
      cursor: "pointer",
    }}
  >
    Bull
  </button>
  <button
    onClick={selectDouble}
    style={{
      padding: "12px 0",
      fontSize: "1rem",
      cursor: "pointer",
      background: multiplier === 2 ? "#d0f0d0" : "#f0f0f0",
    }}
  >
    Double
  </button>
  <button
    onClick={selectTriple}
    style={{
      padding: "12px 0",
      fontSize: "1rem",
      cursor: "pointer",
      background: multiplier === 3 ? "#d0f0d0" : "#f0f0f0",
    }}
  >
    Triple
  </button>
</div>
</div>



          {/* Player Status */}
          <h3 style={{ marginTop: 18 }}>Player Status</h3>
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
                  {/* Name column */}
                  <span style={{ width: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>

                  {/* Hearts column */}
                  <span style={{ width: "150px", textAlign: "center" }}>{p.lives > 0 ? renderHearts(p.lives) : ""}</span>

                  {/* Score column */}
                  <span style={{ width: "150px", textAlign: "right" }}>Score: {p.score}</span>
                </li>
              );
            })}
          </ul>

          {/* Score to beat line */}
          <p style={{ marginTop: "10px", fontSize: "16px" }}>
            <strong>Score to beat:</strong> {lastScore}
          </p>

          {/* Buttons below player list */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "15px",
              marginTop: "25px",
            }}
          >
            {/* Undo button (only shows if undo is available) */}
            {previousState && (
              <button
                onClick={undoTurn}
                style={{
                  backgroundColor: "#fff3b0",
                  padding: "10px 18px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                ⬅️ Undo Last Turn
              </button>
            )}

            {/* Start new game button */}
            <button
              onClick={startNewGame}
              style={{
                backgroundColor: "#e0e0e0",
                padding: "10px 18px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              🔄 Start New Game
            </button>
          </div>
        </div>
      )}
    <audio ref={audioRef} src="/fulltitlesong.mp3" preload="auto" loop muted/>

    </div>
  );
}

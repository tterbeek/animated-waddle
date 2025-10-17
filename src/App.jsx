import React, { useState, useRef, useEffect } from "react";

import useAudioLooper from "./useAudioLooper";






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
  const [audioStarted, setAudioStarted] = useState(false);

  // ===== Audio hook (inside the component) =====
  const [fullRef, loopRef] = useAudioLooper(
    "/fulltitlesong.mp3",
    "/looptitlesong.mp3",
    gameStarted, // stops audio when game starts
    10 // fade duration in seconds
  );



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

    {/* Winner video */}
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
          {/* Audio Elements */}
          <audio ref={fullRef} src="/fulltitlesong.mp3" preload="auto" />
          <audio ref={loopRef} src="/looptitlesong.mp3" preload="auto" loop />

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
    </div>
  );
}

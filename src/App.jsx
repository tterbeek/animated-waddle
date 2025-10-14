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

  // refs
  const dartRefs = [useRef(null), useRef(null), useRef(null)];
  const playerInputRef = useRef(null);

  // ===== Load & Save Player Pool to localStorage =====
  useEffect(() => {
    const savedPlayers = JSON.parse(localStorage.getItem("playerPool") || "[]");
    setPlayerPool(savedPlayers);
  }, []);

  useEffect(() => {
    localStorage.setItem("playerPool", JSON.stringify(playerPool));
  }, [playerPool]);

  // ===== Focus first dart input on player's turn =====
  useEffect(() => {
    if (gameStarted && dartRefs[0].current) {
      dartRefs[0].current.focus();
    }
  }, [currentPlayerIndex, gameStarted]);

  // ===== Add new player to pool =====
  const addPlayer = () => {
    const trimmedName = playerName.trim();
    if (!trimmedName) return;

    // add to pool if not exists
    if (!playerPool.some((p) => p.name === trimmedName)) {
      setPlayerPool([...playerPool, { name: trimmedName }]);
    }

    setPlayerName(""); // clear input
    if (playerInputRef.current) playerInputRef.current.focus();
  };

  // ===== Remove player from pool =====
  const removePlayer = (name) => {
    setPlayerPool(playerPool.filter((p) => p.name !== name));
    setPlayers(players.filter((p) => p.name !== name));
  };

  // ===== Submit turn logic =====
  const submitTurn = (e) => {
    if (e) e.preventDefault();

    const currentPlayer = { ...players[currentPlayerIndex] };
    const score = darts.reduce((acc, d) => {
      if (d.toLowerCase() === "bull") return acc + 50;
      const val = Number(d);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

    const bullseyes = darts.filter((d) => d.toLowerCase() === "bull").length;

    currentPlayer.lives += bullseyes;
    if (score < lastScore) currentPlayer.lives -= 1;
    currentPlayer.score = score;

    const updatedPlayers = [...players];
    updatedPlayers[currentPlayerIndex] = currentPlayer;
    setPlayers(updatedPlayers);
    setLastScore(score);

    // check for winner
    const alivePlayers = updatedPlayers.filter((p) => p.lives > 0);
    if (alivePlayers.length === 1) {
      alert(`${alivePlayers[0].name} wins!`);
      setGameStarted(false);
      setPlayers([]);
      setLastScore(0);
      setRound(1);
      setDarts(["", "", ""]);
      return;
    }

    // move to next alive player
    let nextIndex = (currentPlayerIndex + 1) % updatedPlayers.length;
    while (updatedPlayers[nextIndex].lives <= 0) {
      nextIndex = (nextIndex + 1) % updatedPlayers.length;
    }

    setCurrentPlayerIndex(nextIndex);
    if (nextIndex === 0) setRound((prev) => prev + 1);
    setDarts(["", "", ""]);
  };

  // ===== Start game with selected players =====
  const startGame = () => {
    if (players.length < 2) return;
    const initializedPlayers = players.map((p) => ({ ...p, lives: 3, score: 0 }));
    setPlayers(initializedPlayers);
    setGameStarted(true);
    setLastScore(0);
    setRound(1);
    setDarts(["", "", ""]);
    setCurrentPlayerIndex(0);
  };

  // ===== Start new game button during gameplay =====
  const startNewGame = () => {
    setGameStarted(false);
    setPlayers([]); // clear current game
    setLastScore(0);
    setRound(1);
    setDarts(["", "", ""]);
  };

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
        // =======================
        // SETUP PLAYERS VIEW
        // =======================
        <div>
          <h2>Setup Players</h2>

          {/* Add new player */}
          <div>
            <input
              ref={playerInputRef}
              type="text"
              placeholder="New player name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              style={{ marginRight: "5px" }}
            />
            <button onClick={addPlayer}>Add Player</button>
          </div>

          {/* Player pool with checkboxes and remove buttons */}
          <h3>Player Pool</h3>
          {playerPool.length === 0 && <p>No players yet</p>}
          <ul>
            {playerPool.map((p, i) => (
              <li key={i}>
                <label>
                  <input
                    type="checkbox"
                    checked={players.some((player) => player.name === p.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPlayers([...players, { ...p, lives: 3, score: 0 }]);
                      } else {
                        setPlayers(
                          players.filter((player) => player.name !== p.name)
                        );
                      }
                    }}
                  />{" "}
                  {p.name}
                </label>
                <button
                  onClick={() => removePlayer(p.name)}
                  style={{ marginLeft: "10px" }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          {/* Start game button */}
          <button onClick={startGame} disabled={players.length < 2}>
            Start Game
          </button>
        </div>
      ) : (
        // =======================
        // GAME STARTED VIEW
        // =======================
        <div>
          <h2>Darts Game</h2>
          <h3>Round {round}</h3>
          <h3>
            Current Player:{" "}
            <span style={{ fontWeight: "bold" }}>
              {players[currentPlayerIndex].name}
            </span>{" "}
            (Lives: {players[currentPlayerIndex].lives})
          </h3>

          <form onSubmit={submitTurn}>
            <p>Enter scores for 3 darts (0–60 or "bull"):</p>
            {darts.map((dart, i) => (
              <input
                key={i}
                ref={dartRefs[i]}
                type="text"
                value={dart}
                onChange={(e) =>
                  setDarts(darts.map((d, idx) => (idx === i ? e.target.value : d)))
                }
                style={{ marginRight: "5px", width: "70px", textAlign: "center" }}
              />
            ))}
            <button type="submit">Submit Turn</button>
          </form>

          <h3>Player Status</h3>
          <ul>
            {players.map((p, i) => (
              <li
                key={i}
                style={{
                  textDecoration: p.lives <= 0 ? "line-through" : "none",
                  color: i === currentPlayerIndex && p.lives > 0 ? "green" : "black",
                }}
              >
                {p.name} – Lives: {p.lives} – Last Score: {p.score}
              </li>
            ))}
          </ul>

          <p>
            <strong>Score to beat:</strong> {lastScore}
          </p>

          {/* New Game button */}
          <button
            onClick={startNewGame}
            style={{ marginTop: "20px", backgroundColor: "#f0f0f0" }}
          >
            Start New Game
          </button>
        </div>
      )}
    </div>
  );
}

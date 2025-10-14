import React, { useState, useRef, useEffect } from "react";

export default function App() {
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [darts, setDarts] = useState(["", "", ""]);
  const [round, setRound] = useState(1);

  // refs
  const dartRefs = [useRef(null), useRef(null), useRef(null)];
  const playerInputRef = useRef(null);

  // focus first dart input when player's turn starts
  useEffect(() => {
    if (gameStarted && dartRefs[0].current) {
      dartRefs[0].current.focus();
    }
  }, [currentPlayerIndex, gameStarted]);

  // add player helper
  const addPlayer = () => {
    if (!playerName.trim()) return;
    setPlayers([...players, { name: playerName.trim(), lives: 3, score: 0 }]);
    setPlayerName(""); // clear field
    if (playerInputRef.current) playerInputRef.current.focus(); // refocus input
  };

  // submit turn helper
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

  return (
    <div
      style={{
        minHeight: "100vh",             // full viewport height
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",  // align content at top
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
          <input
            ref={playerInputRef}
            type="text"
            placeholder="Player name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
          />
          <button onClick={addPlayer}>Add Player</button>

          <ul>
            {players.map((p, i) => (
              <li
                key={i}
                style={{
                  textDecoration: p.lives <= 0 ? "line-through" : "none",
                }}
              >
                {p.name} - Lives: {p.lives} - Last Score: {p.score}
              </li>
            ))}
          </ul>

          <button
            onClick={() => setGameStarted(true)}
            disabled={players.length < 2}
          >
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
            <p>Enter scores for 3 darts (number 0–60 or "bull"):</p>
            {darts.map((dart, i) => (
              <input
                key={i}
                ref={dartRefs[i]}
                type="text"
                value={dart}
                onChange={(e) =>
                  setDarts(
                    darts.map((d, idx) =>
                      idx === i ? e.target.value : d
                    )
                  )
                }
                style={{
                  marginRight: "5px",
                  width: "70px",
                  textAlign: "center",
                }}
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
                  textDecoration:
                    p.lives <= 0 ? "line-through" : "none",
                  color:
                    i === currentPlayerIndex && p.lives > 0
                      ? "green"
                      : "black",
                }}
              >
                {p.name} – Lives: {p.lives} – Last Score: {p.score}
              </li>
            ))}
          </ul>

          <p>
            <strong>Score to beat:</strong> {lastScore}
          </p>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";

const API_BASE = "https://api.runepixels.com";

function RunePixelsPlayerInfo() {
  const [player, setPlayer] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPlayer = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`${API_BASE}/players/${encodeURIComponent(player)}`);
      if (!res.ok) throw new Error("Jogador não encontrado ou erro na API.");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h2>Buscar Jogador RunePixels</h2>
      <input
        type="text"
        value={player}
        onChange={e => setPlayer(e.target.value)}
        placeholder="Nome do jogador"
        style={{ width: "70%", padding: 8 }}
      />
      <button onClick={fetchPlayer} style={{ padding: 8, marginLeft: 8 }}>
        Buscar
      </button>
      {loading && <p>Carregando...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {data && (
        <div style={{ marginTop: 16 }}>
          <h3>{data.username || data.name}</h3>
          <p>Nível total: {data.totals?.level}</p>
          <p>Experiência total: {data.totals?.xp}</p>
          {/* Adicione mais campos conforme necessário */}
        </div>
      )}
    </div>
  );
}

export default RunePixelsPlayerInfo; 

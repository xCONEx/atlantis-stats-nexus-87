import React, { useState } from "react";

const API_BASE = "https://api.runepixels.com";

function RunePixelsPlayerInfo() {
  const [player, setPlayer] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPlayer = async () => {
    if (!player.trim()) {
      setError("Digite o nome do jogador.");
      return;
    }
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
        onKeyDown={e => e.key === "Enter" && fetchPlayer()}
        disabled={loading}
      />
      <button onClick={fetchPlayer} style={{ padding: 8, marginLeft: 8 }} disabled={loading}>
        {loading ? "Buscando..." : "Buscar"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {data && (
        <div style={{ marginTop: 16 }}>
          <h3>{data.username || data.name}</h3>
          <p>Nível total: {data.totals?.level ?? "N/A"}</p>
          <p>Experiência total: {data.totals?.xp?.toLocaleString("pt-BR") ?? "N/A"}</p>
          <p>Combat Level: {data.combatlevel ?? "N/A"}</p>
          <p>Última atualização: {data.lastupdated ? new Date(data.lastupdated).toLocaleString("pt-BR") : "N/A"}</p>
          <hr style={{ margin: "12px 0" }} />
          <strong>Skills principais:</strong>
          <ul>
            {data.skills &&
              Object.entries(data.skills)
                .slice(0, 5)
                .map(([skill, info]) => (
                  <li key={skill}>
                    {skill}: Nível {info.level} | XP {info.xp?.toLocaleString("pt-BR")}
                  </li>
                ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default RunePixelsPlayerInfo; 

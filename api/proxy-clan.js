export default async function handler(req, res) {
  const { clanName } = req.query;
  if (!clanName) {
    return res.status(400).json({ error: "clanName obrigatório" });
  }
  const url = `https://secure.runescape.com/m=clan-hiscores/members_lite.ws?clanName=${encodeURIComponent(clanName)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: "Erro ao buscar dados do RuneScape" });
    }
    const text = await response.text(); // RuneScape retorna texto, não JSON
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    // Garante que o buffer é convertido para string UTF-8
    const buffer = Buffer.from(text, 'utf8');
    res.status(200).send(buffer.toString('utf8'));
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar dados do RuneScape" });
  }
} 

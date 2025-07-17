export default async function handler(req, res) {
  const { playerName } = req.query;
  if (!playerName) {
    return res.status(400).json({ error: "playerName obrigatório" });
  }
  const url = `https://secure.runescape.com/m=hiscore/index_lite.ws?player=${encodeURIComponent(playerName)}`;
  try {
    const response = await fetch(url);
    const text = await response.text(); // RuneScape retorna texto, não JSON
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const buffer = Buffer.from(text, 'utf8');
    res.status(200).send(buffer.toString('utf8'));
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar dados do RuneScape" });
  }
} 

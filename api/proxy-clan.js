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
    const buffer = await response.arrayBuffer();
    const text = new TextDecoder('latin1').decode(buffer);
    console.log('PROXY RAW TEXT (latin1):', text.slice(0, 1000));
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar dados do RuneScape" });
  }
} 

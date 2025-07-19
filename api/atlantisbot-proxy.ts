import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { discord_id } = req.query;
  if (!discord_id) {
    return res.status(400).json({ error: 'discord_id is required' });
  }
  try {
    const response = await axios.get(`https://atlantis.jvfs.dev/atlantisbot/api/users.json?search=${discord_id}`);
    return res.status(200).json(response.data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
} 

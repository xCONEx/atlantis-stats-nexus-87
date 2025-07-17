// RuneScape API Service
export interface PlayerStats {
  rank: number;
  level: number;
  experience: number;
}

export interface PlayerHiscores {
  overall: PlayerStats;
  attack: PlayerStats;
  defence: PlayerStats;
  strength: PlayerStats;
  constitution: PlayerStats;
  ranged: PlayerStats;
  prayer: PlayerStats;
  magic: PlayerStats;
  cooking: PlayerStats;
  woodcutting: PlayerStats;
  fletching: PlayerStats;
  fishing: PlayerStats;
  firemaking: PlayerStats;
  crafting: PlayerStats;
  smithing: PlayerStats;
  mining: PlayerStats;
  herblore: PlayerStats;
  agility: PlayerStats;
  thieving: PlayerStats;
  slayer: PlayerStats;
  farming: PlayerStats;
  runecrafting: PlayerStats;
  hunter: PlayerStats;
  construction: PlayerStats;
  summoning: PlayerStats;
  dungeoneering: PlayerStats;
  divination: PlayerStats;
  invention: PlayerStats;
  archaeology: PlayerStats;
  necromancy: PlayerStats;
}

export interface ClanMember {
  name: string;
  rank: string;
  experience: number;
  kills: number;
}

// Skill names in order as returned by the API
const SKILL_NAMES = [
  'overall', 'attack', 'defence', 'strength', 'constitution', 'ranged',
  'prayer', 'magic', 'cooking', 'woodcutting', 'fletching', 'fishing',
  'firemaking', 'crafting', 'smithing', 'mining', 'herblore', 'agility',
  'thieving', 'slayer', 'farming', 'runecrafting', 'hunter', 'construction',
  'summoning', 'dungeoneering', 'divination', 'invention', 'archaeology',
  'necromancy'
];

class RuneScapeApiService {
  private readonly baseUrl = 'https://secure.runescape.com';
  private readonly runePixelsBase = 'https://api.runepixels.com';
  
  async getPlayerHiscores(playerName: string): Promise<PlayerHiscores> {
    try {
      const encodedName = encodeURIComponent(playerName.trim());
      // Usar a rota proxy para contornar CORS
      const response = await fetch(`/api/proxy-player?playerName=${encodedName}`);
      if (!response.ok) {
        throw new Error(`Player "${playerName}" not found or API error`);
      }
      const data = await response.text();
      return this.parseHiscoresData(data);
    } catch (error) {
      console.error('Error fetching player hiscores:', error);
      throw error;
    }
  }
  
  async getClanMembers(clanName: string, pageSize: number = 15): Promise<ClanMember[]> {
    try {
      // Usar a rota proxy para contornar CORS
      const response = await fetch(`/api/proxy-clan?clanName=${encodeURIComponent(clanName)}`);
      if (!response.ok) {
        throw new Error(`Clan "${clanName}" not found or API error`);
      }
      const data = await response.text();
      return this.parseClanMembersData(data);
    } catch (error) {
      console.error('Error fetching clan members:', error);
      throw error;
    }
  }
  
  async getAtlantisClanMembers(): Promise<ClanMember[]> {
    return this.getClanMembers('Atlantis', 500);
  }
  
  async getAtlantisArgusClanMembers(): Promise<ClanMember[]> {
    return this.getClanMembers('Atlantis Argus', 500);
  }

  // RunePixels: Jogadores online (RS3)
  async getOnlinePlayers(): Promise<any[]> {
    const response = await fetch(`${this.runePixelsBase}/players/online`);
    if (!response.ok) throw new Error('Erro ao buscar jogadores online');
    return response.json();
  }

  // RunePixels: Info de um jogador (RS3)
  async getPlayerInfo(playerName: string): Promise<any> {
    const response = await fetch(`${this.runePixelsBase}/players/${encodeURIComponent(playerName)}`);
    if (!response.ok) throw new Error('Jogador não encontrado');
    return response.json();
  }

  // RunePixels: Ranking de clãs (RS3)
  async getClansRanking(): Promise<any[]> {
    const response = await fetch(`${this.runePixelsBase}/clans/ranking`);
    if (!response.ok) throw new Error('Erro ao buscar ranking de clãs');
    return response.json();
  }
  
  private parseHiscoresData(data: string): PlayerHiscores {
    const lines = data.trim().split('\n');
    const hiscores = {} as any;
    
    lines.forEach((line, index) => {
      if (index < SKILL_NAMES.length) {
        const [rank, level, experience] = line.split(',').map(val => 
          val === '-1' ? 0 : parseInt(val, 10)
        );
        
        hiscores[SKILL_NAMES[index]] = {
          rank: rank || 0,
          level: level || 1,
          experience: experience || 0
        };
      }
    });
    
    return hiscores as PlayerHiscores;
  }
  
  private parseClanMembersData(data: string): ClanMember[] {
    const lines = data.trim().split('\n');
    const members: ClanMember[] = [];
    
    // Skip header line if present
    const dataLines = lines.filter(line => line.includes(','));
    
    dataLines.forEach(line => {
      const parts = line.split(',');
      if (parts.length >= 4) {
        members.push({
          name: parts[0]?.trim() || '',
          rank: parts[1]?.trim() || 'Member',
          experience: parseInt(parts[2]) || 0,
          kills: parseInt(parts[3]) || 0
        });
      }
    });
    
    return members;
  }
  
  // Utility method to format experience numbers
  formatExperience(exp: number): string {
    if (exp >= 1000000000) {
      return `${(exp / 1000000000).toFixed(1)}B`;
    } else if (exp >= 1000000) {
      return `${(exp / 1000000).toFixed(1)}M`;
    } else if (exp >= 1000) {
      return `${(exp / 1000).toFixed(1)}K`;
    }
    return exp.toString();
  }
  
  // Get skill level from experience
  getSkillLevel(experience: number): number {
    if (experience === 0) return 1;
    
    // RuneScape experience table (simplified)
    let level = 1;
    let expForLevel = 0;
    
    for (let i = 2; i <= 120; i++) {
      const expRequired = Math.floor(expForLevel + 300 * Math.pow(2, (i - 2) / 7));
      if (experience >= expRequired) {
        level = i;
        expForLevel = expRequired;
      } else {
        break;
      }
    }
    
    return level;
  }
}

export const runescapeApi = new RuneScapeApiService();

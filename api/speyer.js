const https = require('https');

const ORIGINS_LEGENDS = new Set([
  'Akali', 'Annie', 'Ashe', 'Azir', 'Diana', 'Draven', 'Ezreal', 'Fiora', 
  'Irelia', 'Ivern', 'Jax', 'Jayce', 'Jhin', 'Jinx', 'Kennen', "Kha'Zix", 
  'LeBlanc', 'Lillia', 'Lucian', 'Lux', 'Master Yi', 'Nasus', 'Ornn', 'Poppy', 
  'Pyke', "Rek'Sai", 'Renekton', 'Rengar', 'Rumble', 'Sett', 'Shen', 'Sivir', 
  'Vex', 'Vi', 'Zed'
]);

function isOriginsLegend(fullName) {
  if (!fullName) return false;
  const shortName = fullName.split(',')[0].trim();
  return ORIGINS_LEGENDS.has(shortName);
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*'
      },
      timeout: 8000
    };

    const req = https.request(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return getJson(res.headers.location).then(resolve).catch(reject);
      }
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`HTTP ${res.statusCode}: ${rawData.slice(0, 100)}`));
          }
          const parsed = JSON.parse(rawData);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout for ${url}`));
    });
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const eventId = '835043';

  try {
    // 1. Fetch Overview
    const overview = await getJson(`https://api.riftbound.uvsgames.com/api/magic-events/${eventId}/tournament_overview/`);

    const swissPhase = (overview.tournament_phases || []).find(p => p.round_type === 'SWISS') || (overview.tournament_phases || [])[0];
    if (!swissPhase) throw new Error('Swiss phase not found');

    const rounds = [...(swissPhase.rounds || [])].sort((a, b) => b.round_number - a.round_number);
    let targetRound = rounds.find(r => r.status === 'COMPLETE') || rounds.find(r => r.status === 'IN_PROGRESS') || rounds[0];

    if (!targetRound) throw new Error('No active or completed rounds found');

    const roundId = targetRound.id;
    const isComplete = targetRound.status === 'COMPLETE';
    const roundNumber = targetRound.round_number;

    // 2. Fetch Standings
    const standingsData = await getJson(`https://api.riftbound.uvsgames.com/api/v2/tournament-rounds/${roundId}/standings/`);
    const rawList = standingsData.standings || (Array.isArray(standingsData) ? standingsData : []);

    const valid = rawList.filter(s => s.user_event_status?.deck_defining_card?.name);
    const totalPlayers = valid.length;

    // 3. Aggregate
    const aggregates = {};

    for (const s of valid) {
      const card = s.user_event_status.deck_defining_card;
      const legendName = card.name;
      const imageUrl = card.image_url;
      const rank = s.rank;
      const ues = s.user_event_status;

      if (!aggregates[legendName]) {
        aggregates[legendName] = {
          legend: legendName,
          image: imageUrl,
          players: 0,
          totalMatchWins: 0,
          totalMatchLosses: 0,
          totalMatchesPlayed: 0,
          undefeated: 0,
          noWins: 0,
          bestRank: 999999,
          rankSum: 0,
          top32: 0
        };
      }

      const agg = aggregates[legendName];
      agg.players += 1;
      agg.bestRank = Math.min(agg.bestRank, rank);
      agg.rankSum += rank;
      if (rank <= 32) agg.top32 += 1;

      const mw = ues.matches_won || 0;
      const ml = ues.matches_lost || 0;
      const md = ues.matches_drawn || 0;

      agg.totalMatchWins += mw;
      agg.totalMatchLosses += ml;
      agg.totalMatchesPlayed += (mw + ml + md);

      if (ml === 0 && mw > 0) agg.undefeated += 1;
      if (mw === 0 && ml > 0) agg.noWins += 1;
    }

    const data = Object.values(aggregates).map(agg => {
      agg.meta = (agg.players / totalPlayers) * 100;
      agg.winrate = agg.totalMatchesPlayed > 0 ? (agg.totalMatchWins / agg.totalMatchesPlayed) * 100 : 0;
      agg.avgRank = agg.players > 0 ? agg.rankSum / agg.players : 999999;
      agg.isOrigins = isOriginsLegend(agg.legend);
      return agg;
    });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({
      roundNumber,
      isComplete,
      totalPlayers,
      data
    });
  } catch (err) {
    console.error('Speyer API Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

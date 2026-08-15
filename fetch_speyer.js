const fs = require('fs');

async function generateSpeyerJson() {
  const eventId = '835043';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json'
  };

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

  // 1. Overview
  const overviewRes = await fetch(`https://api.riftbound.uvsgames.com/api/magic-events/${eventId}/tournament_overview/`, { headers });
  const overview = await overviewRes.json();
  const swissPhase = (overview.tournament_phases || []).find(p => p.round_type === 'SWISS') || overview.tournament_phases[0];
  const totalRounds = swissPhase.number_of_rounds || 10;
  const rounds = [...(swissPhase.rounds || [])].sort((a, b) => b.round_number - a.round_number);
  
  // Target Round (Round 2 IN_PROGRESS or latest)
  const targetRound = rounds.find(r => r.status === 'IN_PROGRESS') || rounds.find(r => r.status === 'COMPLETE') || rounds[0];
  console.log('Target round:', targetRound.round_number, 'status:', targetRound.status, 'id:', targetRound.id);

  // 2. Standings
  const standingsRes = await fetch(`https://api.riftbound.uvsgames.com/api/v2/tournament-rounds/${targetRound.id}/standings/`, { headers });
  const standingsData = await standingsRes.json();
  const rawList = standingsData.standings || [];

  const valid = rawList.filter(s => s.user_event_status?.deck_defining_card?.name);
  const totalPlayers = valid.length;
  console.log('Total valid players with decks:', totalPlayers);

  const aggregates = {};

  for (const s of valid) {
    const card = s.user_event_status.deck_defining_card;
    const legendName = card.name;
    const imageUrl = card.image_url;
    const rank = s.rank;
    const ues = s.user_event_status;
    const matchRecord = s.match_record || '';

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
        top32: 0,
        record20: 0,
        record11: 0,
        record02: 0
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

    if (ml === 0 && mw > 0) {
      agg.undefeated += 1;
      agg.record20 += 1;
    } else if (mw > 0 && ml > 0) {
      agg.record11 += 1;
    } else if (mw === 0 && ml > 0) {
      agg.record02 += 1;
      agg.noWins += 1;
    }
  }

  const data = Object.values(aggregates).map(agg => {
    agg.meta = (agg.players / totalPlayers) * 100;
    agg.winrate = agg.totalMatchesPlayed > 0 ? (agg.totalMatchWins / agg.totalMatchesPlayed) * 100 : 0;
    agg.avgRank = agg.players > 0 ? agg.rankSum / agg.players : 999999;
    agg.isOrigins = isOriginsLegend(agg.legend);
    agg.setName = agg.isOrigins ? 'Origins' : 'Set 2';
    return agg;
  });

  const payload = {
    eventName: 'Riftbound Showdown Series Germany (Speyer)',
    roundNumber: targetRound.round_number,
    totalRounds: totalRounds,
    status: targetRound.status,
    isComplete: targetRound.status === 'COMPLETE',
    totalPlayers: totalPlayers,
    updatedAt: new Date().toISOString(),
    data: data
  };

  fs.writeFileSync('speyer_data.json', JSON.stringify(payload, null, 2), 'utf8');
  console.log('Saved speyer_data.json with', data.length, 'legends!');
}

generateSpeyerJson().catch(console.error);

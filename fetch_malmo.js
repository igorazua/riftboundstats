const fs = require('fs');

const LEGEND_SETS = {
  // Set 1: Origins (OGN) / Proving Grounds
  'Annie': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Ahri': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Darius': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Garen': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Kai\'Sa': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Lee Sin': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Leona': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Lux': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Master Yi, Wuju Bladesman': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Miss Fortune': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Renata Glasc': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Sett': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Teemo': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Viktor': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Yasuo': { set: 'Origins', num: 'Set 1', code: 'OGN' },

  // Set 2: Spiritforged (SPF)
  'Azir': { set: 'Spiritforged', num: 'Set 2', code: 'SPF' },
  'Draven': { set: 'Spiritforged', num: 'Set 2', code: 'SPF' },
  'Ezreal': { set: 'Spiritforged', num: 'Set 2', code: 'SPF' },
  'Fiora': { set: 'Spiritforged', num: 'Set 2', code: 'SPF' },
  'Irelia': { set: 'Spiritforged', num: 'Set 2', code: 'SPF' },
  'Jax': { set: 'Spiritforged', num: 'Set 2', code: 'SPF' },
  'Lucian': { set: 'Spiritforged', num: 'Set 2', code: 'SPF' },
  'Ornn': { set: 'Spiritforged', num: 'Set 2', code: 'SPF' },
  'Rek\'Sai': { set: 'Spiritforged', num: 'Set 2', code: 'SPF' },
  'Rumble': { set: 'Spiritforged', num: 'Set 2', code: 'SPF' },
  'Sivir': { set: 'Spiritforged', num: 'Set 2', code: 'SPF' },
  'Volibear': { set: 'Spiritforged', num: 'Set 2', code: 'SPF' },

  // Set 3: Unleashed (UNL)
  'Diana': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Ivern': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Jhin': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Kha\'Zix': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'LeBlanc': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Lillia': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Master Yi, Wuju Master': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Poppy': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Pyke': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Rengar': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Vex': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },

  // Set 4: Vendetta (VDT)
  'Akali': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Ambessa': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Jayce': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Jinx': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Kennen': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Mel': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Nasus': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Renekton': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Shen': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Vi': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Zed': { set: 'Vendetta', num: 'Set 4', code: 'VDT' }
};

function cleanPlayerName(str) {
  if (!str) return 'Unknown Player';
  return str.toString()
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

function getLegendSet(fullName) {
  if (!fullName) return { set: 'Origins', num: 'Set 1', code: 'OGN' };
  if (LEGEND_SETS[fullName]) return LEGEND_SETS[fullName];
  const short = fullName.split(',')[0].trim();
  if (LEGEND_SETS[short]) return LEGEND_SETS[short];
  return { set: 'Origins', num: 'Set 1', code: 'OGN' };
}

async function run() {
  const eventId = '964781';
  const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };
  const oRes = await fetch('https://api.riftbound.uvsgames.com/api/magic-events/' + eventId + '/tournament_overview/', { headers });
  const overview = await oRes.json();
  
  let allRounds = [];
  let totalRounds = 12;
  let swissSum = 0;

  for (const phase of (overview.tournament_phases || [])) {
    if (phase.round_type === 'SWISS' && phase.number_of_rounds) {
      swissSum += phase.number_of_rounds;
    }
    for (const r of (phase.rounds || [])) {
      allRounds.push(r);
    }
  }
  if (swissSum > 0) totalRounds = swissSum;

  const activeRounds = allRounds.filter(r => r.status === 'COMPLETE' || r.status === 'IN_PROGRESS');
  console.log('Active rounds:', activeRounds.map(r => ({ round: r.round_number, status: r.status, id: r.id })));
  
  const roundStandingsMap = {};
  for (const r of activeRounds) {
    const sRes = await fetch('https://api.riftbound.uvsgames.com/api/v2/tournament-rounds/' + r.id + '/standings/', { headers });
    if (sRes.ok) {
      const sData = await sRes.json();
      roundStandingsMap[r.round_number] = sData.standings || [];
      console.log('Round', r.round_number, 'loaded standings:', (sData.standings || []).length);
    }
  }

  const latestRound = activeRounds[activeRounds.length - 1] || allRounds[0];
  const rawList = roundStandingsMap[latestRound?.round_number] || [];
  const valid = rawList.filter(s => s.user_event_status?.deck_defining_card?.name);
  console.log('Valid players with decks in latest round:', valid.length);
  
  const aggregates = {};
  for (const s of valid) {
    const card = s.user_event_status.deck_defining_card;
    const legendName = card.name;
    const imageUrl = card.image_url;
    const rank = s.rank;
    const ues = s.user_event_status;

    if (!aggregates[legendName]) {
      const setInfo = getLegendSet(legendName);
      aggregates[legendName] = {
        legend: legendName,
        image: imageUrl,
        set: setInfo.set,
        setNum: setInfo.num,
        setCode: setInfo.code,
        isOrigins: setInfo.set === 'Origins',
        players: 0,
        totalMatchWins: 0,
        totalMatchLosses: 0,
        totalMatchesPlayed: 0,
        undefeated: 0,
        recordUndefeated: 0,
        recordOneLoss: 0,
        recordNoWins: 0,
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

    if (ml === 0 && mw > 0) {
      agg.undefeated += 1;
      agg.recordUndefeated += 1;
    } else if (ml === 1) {
      agg.recordOneLoss += 1;
    } else if (mw === 0 && ml > 0) {
      agg.recordNoWins += 1;
    }
  }

  const metaData = Object.values(aggregates).map(agg => {
    agg.meta = (agg.players / valid.length) * 100;
    agg.winrate = agg.totalMatchesPlayed > 0 ? (agg.totalMatchWins / agg.totalMatchesPlayed) * 100 : 0;
    agg.avgRank = agg.players > 0 ? agg.rankSum / agg.players : 999999;
    agg.setName = agg.set + ' (' + agg.setNum + ')';
    return agg;
  });

  const playersList = valid.map(s => {
    const pId = s.player?.id || s.user_event_status?.user?.id || s.id;
    const rawName = s.user_event_status?.best_identifier || s.player?.best_identifier || 'Unknown Player';
    const pName = cleanPlayerName(rawName);
    const card = s.user_event_status?.deck_defining_card;
    const legendName = card?.name || 'Unknown';
    const setInfo = getLegendSet(legendName);
    const ues = s.user_event_status;

    const roundProgression = [];
    let prevPoints = 0;

    for (const r of activeRounds) {
      const rNum = r.round_number;
      const rStandings = roundStandingsMap[rNum] || [];
      const rPlayerStanding = rStandings.find(ps => (ps.player?.id || ps.id) === pId);
      
      if (rPlayerStanding) {
        const rUes = rPlayerStanding.user_event_status || {};
        const curPoints = rPlayerStanding.points ?? (rUes.points || 0);
        const ptsEarned = curPoints - prevPoints;
        let rResult = 'D';
        if (ptsEarned >= 3) rResult = 'W';
        else if (ptsEarned === 0) rResult = 'L';
        else rResult = 'D';

        roundProgression.push({
          round: rNum,
          rank: rPlayerStanding.rank,
          points: curPoints,
          result: rResult
        });
        prevPoints = curPoints;
      }
    }

    const mw = ues?.matches_won || 0;
    const ml = ues?.matches_lost || 0;
    const md = ues?.matches_drawn || 0;

    return {
      id: pId,
      rank: s.rank,
      name: pName,
      avatar: s.player?.avatar_url || s.user_event_status?.user?.avatar_url || '',
      legend: legendName,
      legendImage: card?.image_url || '',
      set: setInfo.set,
      setNum: setInfo.num,
      matchRecord: `${mw}-${ml}-${md}`,
      matchesWon: mw,
      matchesLost: ml,
      matchesDrawn: md,
      points: s.points ?? (ues?.points || 0),
      omw: parseFloat((s.opponent_match_win_percentage || ues?.omw || 0).toFixed(2)),
      gw: parseFloat((s.game_win_percentage || ues?.gw || 0).toFixed(2)),
      rounds: roundProgression
    };
  });

  const output = {
    tournamentId: eventId,
    tournamentName: overview.name || 'Riftbound Showdown Series @ Malmö Game Week',
    location: '🇸🇪 Malmö, Sweden (Malmö Mässan)',
    totalPlayers: valid.length,
    roundNumber: latestRound?.round_number || 1,
    totalRounds: totalRounds,
    status: latestRound?.status || 'IN_PROGRESS',
    data: metaData,
    players: playersList,
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync('malmo_data.json', JSON.stringify(output, null, 2));
  console.log('Saved malmo_data.json successfully! Total players:', valid.length);
}

run();

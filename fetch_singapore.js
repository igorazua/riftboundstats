const fs = require('fs');

const LEGEND_SETS = {
  'Annie': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Ahri': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Darius': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Garen': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Kai\'Sa': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Kennen': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Lee Sin': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Leona': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Lux': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Master Yi, Wuju Bladesman': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Miss Fortune': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Nasus': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Renekton': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Teemo': { set: 'Origins', num: 'Set 1', code: 'OGN' },
  'Yasuo': { set: 'Origins', num: 'Set 1', code: 'OGN' },
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
  'Diana': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Ivern': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Jhin': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Kha\'Zix': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'LeBlanc': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Lillia': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Poppy': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Pyke': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Rengar': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Vex': { set: 'Unleashed', num: 'Set 3', code: 'UNL' },
  'Akali': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Ambessa': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Jayce': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Jinx': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Master Yi, Wuju Master': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Mel': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Renata Glasc': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Sett': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Shen': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Vi': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Viktor': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
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
  const eventId = '889707';
  const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };
  const oRes = await fetch('https://api.riftbound.uvsgames.com/api/magic-events/' + eventId + '/tournament_overview/', { headers });
  const overview = await oRes.json();
  const swissPhase = overview.tournament_phases[0];
  const rounds = swissPhase.rounds || [];
  
  const activeRounds = rounds.filter(r => r.status === 'COMPLETE' || r.status === 'IN_PROGRESS');
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

  const latestRound = activeRounds[activeRounds.length - 1] || rounds[0];
  const rawList = roundStandingsMap[latestRound.round_number] || [];
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
        const pts = rPlayerStanding.points !== undefined ? rPlayerStanding.points : (rPlayerStanding.match_points || 0);
        const ptsGained = pts - prevPoints;

        if (r.status === 'IN_PROGRESS') {
          roundProgression.push({
            round: rNum,
            result: 'IN_PROGRESS',
            score: 'En juego',
            points: pts,
            rank: rPlayerStanding.rank,
            matchRecord: rPlayerStanding.match_record || `${rPlayerStanding.user_event_status?.matches_won || 0}-${rPlayerStanding.user_event_status?.matches_lost || 0}`
          });
        } else {
          let result = 'WIN';
          let score = '2-0';
          if (ptsGained === 0) {
            result = 'LOSS';
            score = '0-2';
          } else if (ptsGained === 1) {
            result = 'DRAW';
            score = '1-1';
          } else if (ptsGained === 3) {
            result = 'WIN';
            score = '2-0';
          }

          roundProgression.push({
            round: rNum,
            result: result,
            score: score,
            points: pts,
            rank: rPlayerStanding.rank,
            matchRecord: rPlayerStanding.match_record || `${rPlayerStanding.user_event_status?.matches_won || 0}-${rPlayerStanding.user_event_status?.matches_lost || 0}`
          });
          prevPoints = pts;
        }
      }
    }

    return {
      id: pId,
      name: pName,
      avatar: ues.full_profile_picture_url || null,
      legend: legendName,
      legendImage: card?.image_url || null,
      set: setInfo.set,
      setNum: setInfo.num,
      isOrigins: setInfo.set === 'Origins',
      rank: s.rank,
      matchRecord: s.match_record || `${ues.matches_won || 0}-${ues.matches_lost || 0}-${ues.matches_drawn || 0}`,
      points: s.points !== undefined ? s.points : (s.match_points || 0),
      matchesWon: ues.matches_won || 0,
      matchesLost: ues.matches_lost || 0,
      matchesDrawn: ues.matches_drawn || 0,
      omw: s.opponent_match_win_percentage ? (s.opponent_match_win_percentage * 100) : 0,
      gw: s.game_win_percentage ? (s.game_win_percentage * 100) : 0,
      rounds: roundProgression
    };
  });

  playersList.sort((a, b) => a.rank - b.rank);

  const payload = {
    tournamentId: '889707',
    tournamentName: '⚔️ Riftbound Pre-Regional Challenge - Singapore',
    location: '🇸🇬 Singapore (1 Expo Dr)',
    roundNumber: latestRound.round_number,
    totalRounds: 6,
    status: latestRound.status,
    totalPlayers: valid.length,
    updatedAt: new Date().toISOString(),
    data: metaData,
    players: playersList
  };

  fs.writeFileSync('singapore_pre_data.json', JSON.stringify(payload, null, 2), 'utf8');
  console.log('Saved updated singapore_pre_data.json successfully with', metaData.length, 'legends and', playersList.length, 'players!');
}

run().catch(console.error);

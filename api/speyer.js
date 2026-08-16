// Vercel Serverless Function for Live Speyer Tournament Data
const EVENT_ID = '835043';

const LEGEND_SETS = {
  // Set 1: Origins (OGN)
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
  'Teemo': { set: 'Origins', num: 'Set 1', code: 'OGN' },
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

  // Set 3: Unleashed (UNL)
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

  // Set 4: Vendetta (VDT)
  'Akali': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Ambessa': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Jayce': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Jinx': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Kennen': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Master Yi, Wuju Master': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Mel': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Nasus': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Renata Glasc': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
  'Renekton': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
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

export default async function handler(req, res) {
  // Enable CORS and caching (Cache for 30s, stale up to 60s)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Fetch tournament overview
    const overviewRes = await fetch(`https://api.riftbound.uvsgames.com/api/magic-events/${EVENT_ID}/tournament_overview/`);
    if (!overviewRes.ok) throw new Error(`Overview HTTP ${overviewRes.status}`);
    const overview = await overviewRes.json();

    const swissPhase = (overview.tournament_phases || []).find(p => p.round_type === 'SWISS') || overview.tournament_phases[0];
    const rounds = [...(swissPhase.rounds || [])].sort((a, b) => b.round_number - a.round_number);
    const targetRound = rounds.find(r => r.status === 'IN_PROGRESS') || rounds.find(r => r.status === 'COMPLETE') || rounds[0];

    if (!targetRound) throw new Error('No Swiss rounds found');

    // 2. Fetch all round standings in parallel to compute round-by-round progression
    const roundStandingsMap = {};
    const fetchPromises = [];

    for (let r = 1; r <= targetRound.round_number; r++) {
      const rObj = (swissPhase.rounds || []).find(x => x.round_number === r);
      if (rObj) {
        fetchPromises.push(
          fetch(`https://api.riftbound.uvsgames.com/api/v2/tournament-rounds/${rObj.id}/standings/`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data && data.standings) roundStandingsMap[r] = data.standings;
            })
            .catch(() => {})
        );
      }
    }
    await Promise.all(fetchPromises);

    // Latest round standings
    const latestStandings = roundStandingsMap[targetRound.round_number] || [];
    const valid = latestStandings.filter(s => s.user_event_status?.deck_defining_card?.name);
    const totalPlayers = valid.length || 605;

    // 3. Aggregate Meta by Legend
    const aggregates = {};
    for (const s of valid) {
      const card = s.user_event_status.deck_defining_card;
      const legendName = card.name;
      const imageUrl = card.image_url;
      const rank = s.rank;
      const ues = s.user_event_status;
      const setInfo = getLegendSet(legendName);

      if (!aggregates[legendName]) {
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
      agg.meta = (agg.players / totalPlayers) * 100;
      agg.winrate = agg.totalMatchesPlayed > 0 ? (agg.totalMatchWins / agg.totalMatchesPlayed) * 100 : 0;
      agg.avgRank = agg.players > 0 ? agg.rankSum / agg.players : 999999;
      agg.setName = `${agg.set} (${agg.setNum})`;
      return agg;
    });

    // 4. Build Player Standings with Progression
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

      for (let rNum = 1; rNum <= targetRound.round_number; rNum++) {
        const rStandings = roundStandingsMap[rNum] || [];
        const rPlayerStanding = rStandings.find(ps => (ps.player?.id || ps.id) === pId);
        
        if (rPlayerStanding) {
          const pts = rPlayerStanding.points !== undefined ? rPlayerStanding.points : (rPlayerStanding.match_points || 0);
          const ptsGained = pts - prevPoints;
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
        matchesWon: ues.matches_won || 0,
        matchesLost: ues.matches_lost || 0,
        matchesDrawn: ues.matches_drawn || 0,
        points: s.points !== undefined ? s.points : (s.match_points || 0),
        omw: (s.opponent_match_win_percentage || 0) * 100,
        gw: (s.game_win_percentage || 0) * 100,
        rounds: roundProgression
      };
    });

    const payload = {
      tournamentId: EVENT_ID,
      roundNumber: targetRound.round_number,
      status: targetRound.status,
      totalPlayers: totalPlayers,
      updatedAt: new Date().toISOString(),
      data: metaData,
      players: playersList
    };

    return res.status(200).json(payload);
  } catch (error) {
    console.error('Speyer API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

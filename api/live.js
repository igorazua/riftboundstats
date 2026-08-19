export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { eventId = '857452' } = req.query;

  const LEGEND_SETS = {
    // Set 1: Origins (OGN)
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
    'Master Yi, Wuju Master': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
    'Mel': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
    'Renata Glasc': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
    'Sett': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
    'Shen': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
    'Vi': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
    'Viktor': { set: 'Vendetta', num: 'Set 4', code: 'VDT' },
    'Zed': { set: 'Vendetta', num: 'Set 4', code: 'VDT' }
  };

  function getSetInfo(fullName) {
    if (!fullName) return { set: 'Origins', num: 'Set 1', code: 'OGN' };
    if (LEGEND_SETS[fullName]) return LEGEND_SETS[fullName];
    const short = fullName.split(',')[0].trim();
    if (LEGEND_SETS[short]) return LEGEND_SETS[short];
    return { set: 'Origins', num: 'Set 1', code: 'OGN' };
  }

  function cleanName(n) {
    if (!n) return 'Anonymous';
    return n.replace(/^[>"\s]+|[>"\s]+$/g, '').trim();
  }

  try {
    const overviewRes = await fetch(`https://api.riftbound.uvsgames.com/api/magic-events/${eventId}/tournament_overview/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
      }
    });

    if (!overviewRes.ok) {
      return res.status(overviewRes.status).json({ error: `UVS Games API returned ${overviewRes.status}` });
    }

    const overview = await overviewRes.json();

    // Scan for latest round
    let targetRound = null;
    let totalRounds = 8;
    for (const phase of (overview.tournament_phases || [])) {
      if (phase.number_of_rounds) totalRounds = Math.max(totalRounds, phase.number_of_rounds);
      for (const r of (phase.rounds || [])) {
        if (r.status === 'COMPLETE' || r.status === 'IN_PROGRESS') {
          targetRound = r;
        }
      }
    }

    if (!targetRound) {
      return res.status(200).json({
        upcoming: true,
        tournamentId: eventId,
        tournamentName: overview.name || 'Riftbound Regional Qualifier - Barcelona',
        location: '🇪🇸 Barcelona, Spain (Fira de Barcelona)',
        totalPlayers: 2208,
        roundNumber: 1,
        totalRounds: totalRounds,
        status: 'UPCOMING',
        data: [],
        players: [],
        updatedAt: new Date().toISOString()
      });
    }

    // Fetch Standings
    const standingsRes = await fetch(`https://api.riftbound.uvsgames.com/api/v2/tournament-rounds/${targetRound.id}/standings/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
      }
    });

    if (!standingsRes.ok) {
      return res.status(standingsRes.status).json({ error: `Standings API returned ${standingsRes.status}` });
    }

    const standingsData = await standingsRes.json();
    const rawStandings = standingsData.standings || [];

    const legendMap = {};
    const playersList = [];

    rawStandings.forEach((st, idx) => {
      const ues = st.user_event_status || {};
      const card = ues.deck_defining_card || {};
      const legendName = card.name || 'Unknown Legend';
      const legendImg = card.image_url || null;
      const playerName = cleanName(ues.best_identifier || st.player?.best_identifier || `Player #${st.rank || idx + 1}`);
      const avatar = ues.full_profile_picture_url || 'https://storage.googleapis.com/spicerack_media/game_images/3_riftbound/profile/7cc85539-e3b.png';
      const rank = st.rank || (idx + 1);
      const points = st.match_points !== undefined ? st.match_points : (st.points || 0);
      const record = st.match_record || st.record || `${ues.matches_won || 0}-${ues.matches_lost || 0}-${ues.matches_drawn || 0}`;

      const parts = record.split('-').map(Number);
      const mW = parts[0] || 0;
      const mL = parts[1] || 0;
      const mD = parts[2] || 0;

      const omw = (st.opponent_match_win_percentage || 0) * 100;
      const gw = (st.game_win_percentage || 0) * 100;

      const setInfo = getSetInfo(legendName);

      playersList.push({
        id: st.id || st.player?.id || idx,
        rank: rank,
        name: playerName,
        avatar: avatar,
        legend: legendName,
        legendImage: legendImg,
        set: setInfo.set,
        setNum: setInfo.num,
        matchRecord: record,
        matchesWon: mW,
        matchesLost: mL,
        matchesDrawn: mD,
        points: points,
        omw: omw,
        gw: gw
      });

      if (!legendMap[legendName]) {
        legendMap[legendName] = {
          legend: legendName,
          image: legendImg,
          set: setInfo.set,
          setNum: setInfo.num,
          setCode: setInfo.code,
          setName: `${setInfo.set} (${setInfo.num})`,
          isOrigins: setInfo.set === 'Origins',
          count: 0,
          totalWins: 0,
          totalLosses: 0,
          totalDraws: 0,
          ranks: [],
          bestRank: 999999,
          top32: 0,
          recordUndefeated: 0,
          recordOneLoss: 0,
          recordNoWins: 0
        };
      }

      const lm = legendMap[legendName];
      lm.count += 1;
      lm.totalWins += mW;
      lm.totalLosses += mL;
      lm.totalDraws += mD;
      lm.ranks.push(rank);
      if (rank < lm.bestRank) lm.bestRank = rank;
      if (rank <= 32) lm.top32 += 1;

      if (mL === 0 && mW > 0) lm.recordUndefeated += 1;
      else if (mL === 1) lm.recordOneLoss += 1;
      else if (mW === 0 && mL > 0) lm.recordNoWins += 1;
    });

    const totalPilots = playersList.length;
    const metaList = Object.values(legendMap).map(lm => {
      const totalM = lm.totalWins + lm.totalLosses + lm.totalDraws;
      const wr = totalM > 0 ? (lm.totalWins / totalM) * 100 : 50.0;
      const avgR = lm.ranks.reduce((a, b) => a + b, 0) / (lm.ranks.length || 1);
      return {
        legend: lm.legend,
        image: lm.image,
        set: lm.set,
        setNum: lm.setNum,
        setCode: lm.setCode,
        setName: lm.setName,
        isOrigins: lm.isOrigins,
        players: lm.count,
        meta: (lm.count / (totalPilots || 1)) * 100,
        winrate: wr,
        bestRank: lm.bestRank,
        avgRank: avgR,
        top32: lm.top32,
        recordUndefeated: lm.recordUndefeated,
        recordOneLoss: lm.recordOneLoss,
        recordNoWins: lm.recordNoWins
      };
    });

    return res.status(200).json({
      upcoming: false,
      tournamentId: eventId,
      tournamentName: overview.name || 'Riftbound Regional Qualifier - Barcelona',
      location: '🇪🇸 Barcelona, Spain (Fira de Barcelona)',
      roundNumber: targetRound.round_number || 1,
      totalRounds: totalRounds,
      status: targetRound.status || 'IN_PROGRESS',
      totalPlayers: totalPilots,
      updatedAt: new Date().toISOString(),
      data: metaList,
      players: playersList
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

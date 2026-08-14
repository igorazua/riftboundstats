// ==========================================
// CONSTANTS & CONFIGURATION
// ==========================================
const GUILD_ID = '1418575611840172139';
const CHANNEL_ID = '1445872336250343425';
const API_BASE = ''; // Proxied via server.js or vercel.json
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// ==========================================
// GLOBAL STATE
// ==========================================
let state = {
  players: [],        // All players in leaderboard sorted by MMR
  eloTable: {},       // playerId -> current MMR
  selectedPlayer: null,
  playerStats: {},    // Stats cache: playerId -> stats
  matchInfoCache: {}, // game_num -> match data with opponents
  chart: null,        // Chart.js instance
  backgroundQueue: [],
  showCount: 50       // Number of visible players
};

// ==========================================
// UTILITIES
// ==========================================

function escapeHTML(str) {
  if (!str) return '';
  return str.toString().replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag]));
}

function getWrClass(winrate) {
  if (winrate === null || isNaN(winrate)) return 'wr-na';
  if (winrate >= 65) return 'wr-high';
  if (winrate >= 50) return 'wr-mid';
  return 'wr-low';
}

function formatPercent(value) {
  if (value === null || isNaN(value)) return '-';
  return value.toFixed(1) + '%';
}

function getMmrTier(mmr) {
  if (mmr >= 1800) return { label: 'Challenger', class: 'badge--gold' };
  if (mmr >= 1600) return { label: 'Diamond', class: 'badge--diamond' };
  if (mmr >= 1400) return { label: 'Platinum', class: 'badge--platinum' };
  if (mmr >= 1200) return { label: 'Gold', class: 'badge--silver' };
  return { label: 'Silver', class: 'badge--bronze' };
}

function getRankDisplay(rank) {
  if (rank === 1) return '<span class="rank-medal rank-medal--1">1</span>';
  if (rank === 2) return '<span class="rank-medal rank-medal--2">2</span>';
  if (rank === 3) return '<span class="rank-medal rank-medal--3">3</span>';
  return `<span class="cell-rank">${rank}</span>`;
}

function defaultAvatar(url) {
  return url || 'https://cdn.discordapp.com/embed/avatars/0.png';
}

function calculateSegmentedWinrates(playerStats, eloTable, threshold) {
  if (!playerStats?.queues?.player_stats?.matchups) {
    return { wins: 0, losses: 0, total: 0, winrate: null };
  }

  const matchups = playerStats.queues.player_stats.matchups;
  let wins = 0, losses = 0;

  for (const [oppId, m] of Object.entries(matchups)) {
    if (eloTable[oppId] && eloTable[oppId] > threshold) {
      wins += m.wins_against;
      losses += m.losses_against;
    }
  }

  const total = wins + losses;
  return { wins, losses, total, winrate: total > 0 ? (wins / total) * 100 : null };
}

// ==========================================
// API LAYER
// ==========================================

async function fetchLeaderboard(retry = false) {
  try {
    const response = await fetch(
      `${API_BASE}/api/v2/leaderboard/${GUILD_ID}/${CHANNEL_ID}?sort=mmr&month=alltime&page=1`
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.months?.length > 0) {
      const allTimeData = data.months.find(m => m.month === 'alltime') || data.months[0];
      const rawPlayers = allTimeData.data || [];

      // Sort strictly by MMR descending to guarantee correct sequential rank 1, 2, 3, 4...
      state.players = rawPlayers.sort((a, b) => (b.stats?.mmr || 0) - (a.stats?.mmr || 0));

      // Build ELO lookup table
      state.eloTable = {};
      state.players.forEach(p => { state.eloTable[p.id] = p.stats.mmr; });

      document.getElementById('errorMessage').style.display = 'none';
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    if (!retry) {
      document.getElementById('errorMessage').style.display = 'block';
      setTimeout(() => fetchLeaderboard(true), 2000);
    }
    return false;
  }
}

async function fetchServerMatches() {
  try {
    const resLive = await fetch(`${API_BASE}/api/v1/matches/${GUILD_ID}`);
    if (resLive.ok) {
      const liveData = await resLive.json();
      if (typeof liveData === 'object' && liveData !== null) {
        Object.values(liveData).forEach(m => {
          if (m?.game_num) state.matchInfoCache[m.game_num] = m;
        });
      }
    }

    const resHist = await fetch(`${API_BASE}/api/v1/history/${GUILD_ID}?page=1&page_size=100&order=desc`);
    if (resHist.ok) {
      const histData = await resHist.json();
      if (histData?.data && Array.isArray(histData.data)) {
        histData.data.forEach(m => {
          if (m?.game_num) state.matchInfoCache[m.game_num] = m;
        });
      }
    }
  } catch (err) {
    console.warn('Could not fetch server matches/history:', err);
  }
}

async function fetchPlayerStats(playerId) {
  if (state.playerStats[playerId]) return state.playerStats[playerId];

  try {
    const response = await fetch(
      `${API_BASE}/api/v1/playerstats/${GUILD_ID}/${playerId}?include_games=True&include_matchups=True`
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.playerStats[playerId] = data;
    return data;
  } catch (error) {
    console.error(`Error fetching stats for ${playerId}:`, error);
    return null;
  }
}

// ==========================================
// LEADERBOARD RENDERING
// ==========================================

function renderLeaderboard() {
  const tbody = document.getElementById('leaderboardBody');
  tbody.innerHTML = '';

  const topPlayers = state.players.slice(0, state.showCount);

  topPlayers.forEach((player, index) => {
    const rank = index + 1; // Strict sequential ranking: 1, 2, 3, 4...
    const s = player.stats;
    const wr = s.winrate * 100;

    const tr = document.createElement('tr');
    tr.id = `row-${player.id}`;
    if (state.selectedPlayer?.id === player.id) tr.classList.add('active');
    tr.onclick = () => loadPlayerProfile(player.id);

    tr.innerHTML = `
      <td class="cell-rank-sticky">${getRankDisplay(rank)}</td>
      <td class="cell-player-sticky">
        <div class="cell-player">
          <img src="${defaultAvatar(player.avatar_url)}" alt="" style="width:28px;height:28px;border-radius:50%">
          <span>${escapeHTML(player.name)}</span>
        </div>
      </td>
      <td class="cell-mmr">${s.mmr.toFixed(1)}</td>
      <td class="cell-stat">${s.totalgames}</td>
      <td><span class="wr-badge ${getWrClass(wr)}">${wr.toFixed(1)}%</span></td>
      <td class="cell-stat" id="games-1300-${player.id}">
        <span class="loading" style="display:inline-block;width:36px;height:16px"></span>
      </td>
      <td id="wr-1300-${player.id}">
        <span class="loading" style="display:inline-block;width:48px;height:16px"></span>
      </td>
      <td class="cell-stat" id="games-1500-${player.id}">
        <span class="loading" style="display:inline-block;width:36px;height:16px"></span>
      </td>
      <td id="wr-1500-${player.id}">
        <span class="loading" style="display:inline-block;width:48px;height:16px"></span>
      </td>
    `;

    tbody.appendChild(tr);
  });

  updateTimestamp();
  startBackgroundLoading(topPlayers.slice(0, 30));
}

function updateTableRow(playerId, playerStats) {
  const stats1300 = calculateSegmentedWinrates(playerStats, state.eloTable, 1300);
  const stats1500 = calculateSegmentedWinrates(playerStats, state.eloTable, 1500);

  const elGames1300 = document.getElementById(`games-1300-${playerId}`);
  const elWr1300 = document.getElementById(`wr-1300-${playerId}`);
  const elGames1500 = document.getElementById(`games-1500-${playerId}`);
  const elWr1500 = document.getElementById(`wr-1500-${playerId}`);

  if (elGames1300) elGames1300.textContent = stats1300.total;
  if (elWr1300) {
    elWr1300.innerHTML = stats1300.winrate !== null
      ? `<span class="wr-badge ${getWrClass(stats1300.winrate)}">${formatPercent(stats1300.winrate)}</span>`
      : '<span class="wr-badge wr-na">-</span>';
  }
  if (elGames1500) elGames1500.textContent = stats1500.total;
  if (elWr1500) {
    elWr1500.innerHTML = stats1500.winrate !== null
      ? `<span class="wr-badge ${getWrClass(stats1500.winrate)}">${formatPercent(stats1500.winrate)}</span>`
      : '<span class="wr-badge wr-na">-</span>';
  }
}

// ==========================================
// BACKGROUND LOADING
// ==========================================

function startBackgroundLoading(playersToLoad) {
  state.backgroundQueue = playersToLoad.map(p => p.id);
  processBackgroundQueue();
}

function processBackgroundQueue() {
  if (state.backgroundQueue.length === 0) return;

  const playerId = state.backgroundQueue.shift();

  if (!state.playerStats[playerId]) {
    fetchPlayerStats(playerId).then(stats => {
      if (stats) updateTableRow(playerId, stats);
      setTimeout(processBackgroundQueue, 400);
    });
  } else {
    updateTableRow(playerId, state.playerStats[playerId]);
    setTimeout(processBackgroundQueue, 50);
  }
}

// ==========================================
// PLAYER PROFILE & NAVIGATION
// ==========================================

window.closeProfile = function() {
  const profilePanel = document.getElementById('profilePanel');
  if (profilePanel) profilePanel.classList.add('profile--hidden');
  document.body.classList.remove('profile-open-mobile');
  document.querySelectorAll('#leaderboardBody tr').forEach(tr => tr.classList.remove('active'));
  state.selectedPlayer = null;
};

async function loadPlayerProfile(playerId) {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return;

  const basePlayer = state.players[playerIndex];
  const playerRank = playerIndex + 1;
  state.selectedPlayer = basePlayer;

  // Highlight active row
  document.querySelectorAll('#leaderboardBody tr').forEach(tr => tr.classList.remove('active'));
  const activeRow = document.getElementById(`row-${playerId}`);
  if (activeRow) activeRow.classList.add('active');

  // Open profile (including mobile overlay)
  document.body.classList.add('profile-open-mobile');
  const profilePanel = document.getElementById('profilePanel');
  profilePanel.classList.remove('profile--hidden');

  profilePanel.innerHTML = `
    <div class="profile__top-bar">
      <button class="profile__back-btn" onclick="window.closeProfile()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back to Leaderboard</span>
      </button>
      <button class="profile__close-icon-btn" onclick="window.closeProfile()" title="Close Profile">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <div class="profile__header">
      <img class="profile__avatar" src="${defaultAvatar(basePlayer.avatar_url)}" alt="">
      <div class="profile__info">
        <div class="profile__name">${escapeHTML(basePlayer.name)}</div>
        <div style="color:var(--text-secondary);font-size:0.85rem">Loading player statistics...</div>
      </div>
    </div>
    <div class="profile__content" style="display:flex;align-items:center;justify-content:center;min-height:240px">
      <div class="loading" style="width:100%;height:220px;border-radius:8px"></div>
    </div>
  `;

  const detailedStats = await fetchPlayerStats(playerId);
  if (detailedStats) {
    renderProfile(basePlayer, detailedStats, playerRank);
    updateTableRow(playerId, detailedStats);
  } else {
    profilePanel.innerHTML = `
      <div class="profile__top-bar">
        <button class="profile__back-btn" onclick="window.closeProfile()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back to Leaderboard</span>
        </button>
      </div>
      <div class="profile__header">
        <img class="profile__avatar" src="${defaultAvatar(basePlayer.avatar_url)}" alt="">
        <div class="profile__info">
          <div class="profile__name">${escapeHTML(basePlayer.name)}</div>
          <div style="color:var(--negative-red)">Error loading profile data</div>
        </div>
      </div>
    `;
  }
}

function renderProfile(player, stats, playerRank) {
  const q = stats.queues.player_stats;
  const tier = getMmrTier(q.mmr);
  const totalWr = q.totalgames > 0 ? (q.wins / q.totalgames) * 100 : 0;
  const s1300 = calculateSegmentedWinrates(stats, state.eloTable, 1300);
  const s1500 = calculateSegmentedWinrates(stats, state.eloTable, 1500);
  const rankNumber = playerRank || (state.players.findIndex(p => p.id === player.id) + 1);

  const profilePanel = document.getElementById('profilePanel');
  profilePanel.innerHTML = `
    <div class="profile__top-bar">
      <button class="profile__back-btn" onclick="window.closeProfile()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back to Leaderboard</span>
      </button>
      <button class="profile__close-icon-btn" onclick="window.closeProfile()" title="Close Profile">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <div class="profile__header">
      <img class="profile__avatar" src="${defaultAvatar(stats.avatar_url)}" alt="">
      <div class="profile__info">
        <div class="profile__name">${escapeHTML(stats.name)}</div>
        <div class="profile__badges">
          <span class="badge ${tier.class}">${tier.label}</span>
          <span class="badge badge--silver">Rank #${rankNumber}</span>
          <span class="badge badge--diamond">${q.totalgames} Total Matches</span>
        </div>
        <div class="profile__record-summary">
          <div class="profile__record-text">
            <span style="color:var(--positive-emerald)">${q.wins} Wins (W)</span>
            <span style="color:var(--text-secondary)">-</span>
            <span style="color:var(--negative-red)">${q.losses} Losses (L)</span>
            <span style="font-size:0.85rem;color:var(--text-secondary);font-weight:500">(${totalWr.toFixed(1)}% WR)</span>
          </div>
          <div class="profile__record-bar">
            <div class="profile__record-bar-win" style="width:${totalWr}%"></div>
            <div class="profile__record-bar-loss" style="width:${100 - totalWr}%"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="profile__content fade-in">
      <!-- Stats Grid -->
      <div>
        <h3 class="profile__section-title">Main Statistics</h3>
        <div class="profile__stats-grid">
          <div class="profile__stat-card">
            <div class="profile__stat-label">Current MMR / Peak</div>
            <div class="profile__stat-value">
              <span style="color:var(--accent-cyan-light)">${q.mmr.toFixed(1)}</span>
              <span style="font-size:0.9rem;color:var(--text-secondary);font-weight:400">/ ${q.peak_mmr.toFixed(1)}</span>
            </div>
          </div>
          <div class="profile__stat-card">
            <div class="profile__stat-label">Wins - Losses (W - L)</div>
            <div class="profile__stat-value">
              <span style="color:var(--positive-emerald)">${q.wins}W</span>
              <span style="color:var(--text-secondary);font-size:1.2rem"> - </span>
              <span style="color:var(--negative-red)">${q.losses}L</span>
            </div>
          </div>
          <div class="profile__stat-card">
            <div class="profile__stat-label">Total Winrate</div>
            <div class="profile__stat-value ${getWrClass(totalWr)}">${totalWr.toFixed(1)}%
              <span style="font-size:0.875rem;color:var(--text-secondary);font-weight:400">(${q.totalgames} matches)</span>
            </div>
          </div>
          <div class="profile__stat-card">
            <div class="profile__stat-label">Streak / Peak Streak</div>
            <div class="profile__stat-value">${q.streak > 0 ? '+' : ''}${q.streak}
              <span style="font-size:0.875rem;color:var(--text-secondary);font-weight:400">/ ${q.peak_streak}</span>
            </div>
          </div>
          <div class="profile__stat-card">
            <div class="profile__stat-label">WR vs >1300 ELO</div>
            <div class="profile__stat-value">
              <span class="${getWrClass(s1300.winrate)}">${formatPercent(s1300.winrate)}</span>
              <span style="font-size:0.875rem;color:var(--text-secondary);font-weight:400">(${s1300.wins}W - ${s1300.losses}L)</span>
            </div>
          </div>
          <div class="profile__stat-card">
            <div class="profile__stat-label">WR vs >1500 ELO</div>
            <div class="profile__stat-value">
              <span class="${getWrClass(s1500.winrate)}">${formatPercent(s1500.winrate)}</span>
              <span style="font-size:0.875rem;color:var(--text-secondary);font-weight:400">(${s1500.wins}W - ${s1500.losses}L)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- MMR Chart -->
      <div>
        <h3 class="profile__section-title">MMR Evolution</h3>
        <div class="profile__chart-container" style="height:220px">
          <canvas id="mmrChart"></canvas>
        </div>
      </div>

      <!-- Recent Form -->
      <div>
        <h3 class="profile__section-title">Recent Form</h3>
        <div class="profile__recent-form" id="recentForm"></div>
      </div>

      <!-- Match History -->
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h3 class="profile__section-title" style="margin-bottom:0">Last Matches (By Date)</h3>
          <span style="font-size:0.8rem;color:var(--text-secondary)" id="matchesCountLabel"></span>
        </div>
        <div class="profile__match-history" id="matchHistoryList"></div>
      </div>

      <!-- Matchups -->
      <div class="profile__matchups">
        <h3 class="profile__section-title">Opponent Matchups</h3>
        <div class="profile__matchups-filters">
          <button class="filter-btn active" onclick="window.filterMatchups(0, this)">All</button>
          <button class="filter-btn" onclick="window.filterMatchups(1300, this)">>1300 ELO</button>
          <button class="filter-btn" onclick="window.filterMatchups(1500, this)">>1500 ELO</button>
        </div>
        <div style="overflow-x:auto">
          <table class="profile__matchups-table">
            <thead>
              <tr>
                <th onclick="window.sortMatchups('name')">Opponent ↕</th>
                <th onclick="window.sortMatchups('mmr')">MMR ↕</th>
                <th onclick="window.sortMatchups('total')">Matches ↕</th>
                <th onclick="window.sortMatchups('wins')">Record (W - L) ↕</th>
                <th onclick="window.sortMatchups('winrate')">Winrate ↕</th>
              </tr>
            </thead>
            <tbody id="matchupsBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  renderRecentForm(q.games);
  renderMatchHistory(q.games, stats.name, player.id);
  renderChart(q.games);

  window.currentMatchups = q.matchups;
  window.currentMatchupThreshold = 0;
  window.currentSortCol = 'total';
  window.currentSortDesc = true;
  renderMatchups(window.currentMatchups, 0);

  resolveMatchOpponents(q.matchups, player.id, stats.name, q.games);
}

// ==========================================
// OPPONENT RESOLUTION
// ==========================================

async function resolveMatchOpponents(matchups, playerId, playerName, games) {
  if (!matchups || typeof matchups !== 'object') return;
  const oppIds = Object.keys(matchups);
  if (oppIds.length === 0) return;

  const playerGameNums = new Set(games.map(g => g.game_num));

  const batchSize = 10;
  for (let i = 0; i < oppIds.length; i += batchSize) {
    const chunk = oppIds.slice(i, i + batchSize);
    let newMatchesFound = false;

    await Promise.all(chunk.map(async (oppId) => {
      if (oppId === playerId) return;

      try {
        const oppData = await fetchPlayerStats(oppId);
        const oppGames = oppData?.queues?.player_stats?.games || [];
        const oppMmr = oppData?.queues?.player_stats?.mmr || state.eloTable[oppId] || 0;
        const oppName = matchups[oppId]?.name || oppData?.name || 'Unknown';
        const oppAvatar = matchups[oppId]?.avatar_url || oppData?.avatar_url;

        for (const g of oppGames) {
          if (playerGameNums.has(g.game_num) && !state.matchInfoCache[g.game_num]) {
            state.matchInfoCache[g.game_num] = {
              opponent: {
                id: oppId,
                name: oppName,
                avatar_url: oppAvatar,
                mmr: oppMmr
              }
            };
            newMatchesFound = true;
          }
        }
      } catch (err) {
        console.warn(`Error resolving opponent ${oppId}:`, err);
      }
    }));

    if (newMatchesFound && state.selectedPlayer?.id === playerId) {
      renderMatchHistory(games, playerName, playerId);
    }
  }
}

function formatGameDate(timestamp) {
  if (!timestamp) return 'Unknown date';
  const d = new Date(timestamp.replace(' ', 'T'));
  if (isNaN(d.getTime())) return timestamp;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const hrs = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${month} ${day}, ${hrs}:${mins}`;
}

function renderMatchHistory(games, playerName, playerId) {
  const container = document.getElementById('matchHistoryList');
  const countLabel = document.getElementById('matchesCountLabel');
  if (!container) return;
  container.innerHTML = '';

  if (!games || games.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--text-secondary)">No match history</div>';
    return;
  }

  const sortedGames = [...games].sort((a, b) => {
    const dateA = new Date((a.timestamp || '').replace(' ', 'T')).getTime() || 0;
    const dateB = new Date((b.timestamp || '').replace(' ', 'T')).getTime() || 0;
    if (dateB !== dateA) return dateB - dateA;
    return (b.game_num || 0) - (a.game_num || 0);
  });

  const displayGames = sortedGames.slice(0, 30);
  if (countLabel) {
    countLabel.textContent = `Showing last ${displayGames.length} of ${games.length}`;
  }

  displayGames.forEach(g => {
    const isWin = (g.result || '').toLowerCase().includes('win');
    const changeVal = g.mmr_change != null ? g.mmr_change : 0;
    const changeFormatted = changeVal > 0 ? `+${changeVal.toFixed(1)}` : changeVal.toFixed(1);
    const dateFormatted = formatGameDate(g.timestamp);

    let opponentHtml = `<span style="font-size:0.85rem;color:var(--text-secondary)">Match #${g.game_num || '-'}</span>`;
    const cachedMatch = state.matchInfoCache[g.game_num];
    let opp = cachedMatch?.opponent;

    if (!opp && cachedMatch?.teams && cachedMatch.teams.length >= 2) {
      const team0 = cachedMatch.teams[0] || [];
      const team1 = cachedMatch.teams[1] || [];
      const inTeam0 = team0.some(p => p.id === playerId || p.name === playerName);
      const oppTeam = inTeam0 ? team1 : team0;
      if (oppTeam.length > 0 && oppTeam[0]?.name) {
        opp = oppTeam[0];
      }
    }

    if (opp?.name) {
      if (opp.id === playerId || opp.name === playerName) {
        opp = null;
      }
    }

    if (opp?.name) {
      const oppMmr = opp.mmr || state.eloTable[opp.id] || 0;
      const tier = getMmrTier(oppMmr);
      opponentHtml = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
          <span style="color:var(--text-secondary);font-size:0.8rem;font-weight:500">vs</span>
          <img src="${defaultAvatar(opp.avatar_url)}" style="width:22px;height:22px;border-radius:50%;border:1px solid var(--border-subtle)">
          <span style="font-weight:600;color:var(--text-primary);font-size:0.95rem">${escapeHTML(opp.name)}</span>
          <span class="badge ${tier.class}" style="font-size:0.7rem;padding:1px 6px">${oppMmr.toFixed(0)} MMR</span>
        </div>
      `;
    }

    const resultText = isWin ? 'Win' : 'Loss';
    const resultClass = isWin ? 'match-item__badge--win' : 'match-item__badge--loss';

    const div = document.createElement('div');
    div.className = `match-item ${isWin ? 'match-item--win' : 'match-item--loss'}`;
    div.innerHTML = `
      <div class="match-item__left">
        <span class="match-item__badge ${resultClass}">
          ${resultText}
        </span>
        <div>
          ${opponentHtml}
          <div class="match-item__time">${dateFormatted} · #${g.game_num}</div>
        </div>
      </div>
      <div class="match-item__right">
        <div class="match-item__change ${isWin ? 'match-item__change--win' : 'match-item__change--loss'}">
          ${changeFormatted}
        </div>
        <div class="match-item__mmr">
          ${(g.mmr || 0).toFixed(1)} <span style="font-size:0.75rem;color:var(--text-secondary)">MMR</span>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

// ==========================================
// RECENT FORM
// ==========================================

function renderRecentForm(games) {
  const container = document.getElementById('recentForm');
  if (!games || games.length === 0) {
    container.innerHTML = '<span style="color:var(--text-secondary)">No matches recorded</span>';
    return;
  }

  const sortedGames = [...games].sort((a, b) => {
    const dateA = new Date((a.timestamp || '').replace(' ', 'T')).getTime() || 0;
    const dateB = new Date((b.timestamp || '').replace(' ', 'T')).getTime() || 0;
    return dateB - dateA;
  });

  const last10 = sortedGames.slice(0, 10);

  last10.forEach(game => {
    const isWin = (game.result || '').toLowerCase().includes('win');
    const el = document.createElement('div');
    el.className = `match-node ${isWin ? 'win' : 'loss'}`;
    el.textContent = isWin ? 'W' : 'L';

    const mmrChange = game.mmr_change > 0 ? `+${game.mmr_change.toFixed(1)}` : game.mmr_change.toFixed(1);
    el.title = `${game.result} (${mmrChange})\n${game.timestamp}`;

    container.appendChild(el);
  });

  const last20 = sortedGames.slice(0, 20);
  const recent20wins = last20.filter(g => (g.result || '').toLowerCase().includes('win')).length;
  const recent20wr = last20.length > 0 ? (recent20wins / last20.length * 100) : 0;
  const historyCount = last20.length;

  const formLabel = document.createElement('span');
  formLabel.style.cssText = 'margin-left:12px;font-size:0.8rem;color:var(--text-secondary)';
  formLabel.innerHTML = `Last ${historyCount}: <span class="${getWrClass(recent20wr)}" style="font-weight:600">${recent20wr.toFixed(0)}% WR</span>`;
  container.appendChild(formLabel);
}

// ==========================================
// MMR CHART
// ==========================================

function renderChart(games) {
  if (!games || games.length === 0) return;

  const ctx = document.getElementById('mmrChart');
  if (!ctx) return;

  if (state.chart) state.chart.destroy();

  const sorted = [...games].sort((a, b) => {
    const dateA = new Date((a.timestamp || '').replace(' ', 'T')).getTime() || 0;
    const dateB = new Date((b.timestamp || '').replace(' ', 'T')).getTime() || 0;
    return dateA - dateB;
  });

  const labels = sorted.map(g => formatGameDate(g.timestamp));
  const data = sorted.map(g => g.mmr);

  state.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'MMR',
        data,
        borderColor: '#58a6ff',
        backgroundColor: (context) => {
          const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 220);
          gradient.addColorStop(0, 'rgba(88, 166, 255, 0.3)');
          gradient.addColorStop(1, 'rgba(88, 166, 255, 0.0)');
          return gradient;
        },
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#58a6ff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(22, 27, 34, 0.95)',
          titleColor: '#f0f6fc',
          bodyColor: '#8b949e',
          borderColor: '#30363d',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title: (ctx) => `Date: ${ctx[0].label}`,
            label: (ctx) => {
              const item = sorted[ctx.dataIndex];
              const change = item.mmr_change != null ? (item.mmr_change > 0 ? `+${item.mmr_change.toFixed(1)}` : item.mmr_change.toFixed(1)) : '';
              return ` MMR: ${ctx.parsed.y.toFixed(1)} (${change})`;
            }
          }
        }
      },
      scales: {
        x: { display: false },
        y: {
          grid: { color: 'rgba(48, 54, 61, 0.5)', drawBorder: false },
          ticks: { color: '#8b949e', maxTicksLimit: 5 }
        }
      },
      interaction: { mode: 'nearest', axis: 'x', intersect: false }
    }
  });
}

// ==========================================
// MATCHUPS
// ==========================================

function renderMatchups(matchups, eloThreshold) {
  const tbody = document.getElementById('matchupsBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const list = [];

  for (const [oppId, m] of Object.entries(matchups)) {
    const oppMmr = state.eloTable[oppId] || 0;
    if (eloThreshold === 0 || oppMmr > eloThreshold) {
      const wins = m.wins_against || 0;
      const losses = m.losses_against || 0;
      const total = wins + losses;
      if (total > 0) {
        list.push({
          name: m.name || 'Unknown',
          avatar: m.avatar_url,
          mmr: oppMmr,
          wins,
          losses,
          total,
          winrate: (wins / total) * 100
        });
      }
    }
  }

  list.sort((a, b) => {
    let va = a[window.currentSortCol];
    let vb = b[window.currentSortCol];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    return window.currentSortDesc ? (vb > va ? 1 : vb < va ? -1 : 0) : (va > vb ? 1 : va < vb ? -1 : 0);
  });

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-secondary)">No matchups found for this filter</td></tr>';
    return;
  }

  list.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="cell-player">
          <img src="${defaultAvatar(m.avatar)}" alt="" style="width:24px;height:24px;border-radius:50%">
          <span>${escapeHTML(m.name)}</span>
        </div>
      </td>
      <td class="cell-stat">${m.mmr ? m.mmr.toFixed(0) : '-'}</td>
      <td class="cell-stat">${m.total}</td>
      <td class="cell-stat">
        <span style="color:var(--positive-emerald);font-weight:700">${m.wins}W</span>
        <span style="color:var(--text-secondary)"> - </span>
        <span style="color:var(--negative-red);font-weight:700">${m.losses}L</span>
      </td>
      <td><span class="wr-badge ${getWrClass(m.winrate)}">${m.winrate.toFixed(1)}%</span></td>
    `;
    tbody.appendChild(tr);
  });
}

window.filterMatchups = function(threshold, btn) {
  document.querySelectorAll('.profile__matchups-filters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  window.currentMatchupThreshold = threshold;
  renderMatchups(window.currentMatchups, threshold);
};

window.sortMatchups = function(col) {
  if (window.currentSortCol === col) {
    window.currentSortDesc = !window.currentSortDesc;
  } else {
    window.currentSortCol = col;
    window.currentSortDesc = true;
  }
  renderMatchups(window.currentMatchups, window.currentMatchupThreshold);
};

// ==========================================
// SEARCH & INPUT
// ==========================================

function setupSearch() {
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');

  input.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (query.length < 2) {
      results.classList.remove('active');
      return;
    }

    const matches = state.players
      .filter(p => p.name.toLowerCase().includes(query))
      .slice(0, 8);

    results.innerHTML = '';

    if (matches.length > 0) {
      matches.forEach(p => {
        const rankNumber = state.players.findIndex(x => x.id === p.id) + 1;
        const tier = getMmrTier(p.stats.mmr);
        const div = document.createElement('div');
        div.className = 'topbar__search-results-item';
        div.innerHTML = `
          <img src="${defaultAvatar(p.avatar_url)}" style="width:32px;height:32px;border-radius:50%">
          <div style="flex:1">
            <div style="font-weight:600;color:var(--text-primary)">${escapeHTML(p.name)}</div>
            <div style="font-size:0.75rem;color:var(--text-secondary)">
              <span class="${tier.class}">${p.stats.mmr.toFixed(0)} MMR</span> · #${rankNumber}
            </div>
          </div>
        `;
        div.onclick = () => {
          input.value = '';
          results.classList.remove('active');
          loadPlayerProfile(p.id);
        };
        results.appendChild(div);
      });
      results.classList.add('active');
    } else {
      results.classList.remove('active');
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.topbar__search-container')) {
      results.classList.remove('active');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      results.classList.remove('active');
      input.blur();
      // If profile is open, close it with Escape key
      if (state.selectedPlayer) {
        window.closeProfile();
      }
    }
  });
}

// ==========================================
// AUTO-REFRESH & TIMESTAMP
// ==========================================

function updateTimestamp() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const el = document.getElementById('lastUpdate');
  if (el) el.textContent = timeStr;
}

async function fetchAndRenderAll() {
  fetchServerMatches();
  const success = await fetchLeaderboard();
  if (success) {
    renderLeaderboard();
    if (state.selectedPlayer) {
      const freshStats = await fetchPlayerStats(state.selectedPlayer.id);
      if (freshStats) {
        renderProfile(state.selectedPlayer, freshStats);
      }
    }
  }
}

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  setupSearch();

  const handleRefresh = () => {
    state.playerStats = {};
    fetchAndRenderAll();
  };

  const btnRefresh = document.getElementById('btnRefresh');
  if (btnRefresh) btnRefresh.addEventListener('click', handleRefresh);

  const btnRefreshMobile = document.getElementById('btnRefreshMobile');
  if (btnRefreshMobile) btnRefreshMobile.addEventListener('click', handleRefresh);

  fetchAndRenderAll();
  setInterval(fetchAndRenderAll, REFRESH_INTERVAL);
});

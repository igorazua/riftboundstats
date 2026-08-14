const translations = {
  es: {
    "leaderboard_title": "📊 Leaderboard Global",
    "search_placeholder": "Buscar jugador...",
    "btn_refresh": "Actualizar",
    "col_rank": "#",
    "col_player": "JUGADOR",
    "col_mmr": "MMR",
    "col_matches": "PARTIDAS",
    "col_winrate": "WINRATE",
    "col_matches_1300": "P. >1300",
    "col_wr_1300": "WR >1300",
    "col_matches_1500": "P. >1500",
    "col_wr_1500": "WR >1500",
    "prof_winrate": "WINRATE TOTAL",
    "prof_streak": "RACHA / PICO DE RACHA",
    "prof_wr_1300": "WR VS >1300 ELO",
    "prof_wr_1500": "WR VS >1500 ELO",
    "prof_chart": "EVOLUCIÓN DE MMR",
    "prof_recent": "RACHA RECIENTE",
    "prof_last_matches": "ÚLTIMAS PARTIDAS (POR FECHA)",
    "prof_matchups": "ENFRENTAMIENTOS POR RIVAL (MATCHUPS)",
    "btn_all": "Todos",
    "col_opponent": "Oponente ↕",
    "col_opp_mmr": "MMR ↕",
    "col_opp_matches": "Partidas ↕",
    "col_record": "Récord (V - D) ↕",
    "col_opp_winrate": "Winrate ↕",
    "error_api": "Error al conectar con la API. Reintentando...",
    "showing_last": "Mostrando últimas {0} de {1}",
    "no_history": "Sin historial de partidas",
    "last_20_wr": "Últimas 20: {0}% WR",
    "unknown_date": "Fecha desconocida",
    "match_tag": "Partida #{0}",
    "win": "Victoria",
    "loss": "Derrota"
  },
  en: {
    "leaderboard_title": "📊 Global Leaderboard",
    "search_placeholder": "Search player...",
    "btn_refresh": "Refresh",
    "col_rank": "#",
    "col_player": "PLAYER",
    "col_mmr": "MMR",
    "col_matches": "MATCHES",
    "col_winrate": "WINRATE",
    "col_matches_1300": "M. >1300",
    "col_wr_1300": "WR >1300",
    "col_matches_1500": "M. >1500",
    "col_wr_1500": "WR >1500",
    "prof_winrate": "TOTAL WINRATE",
    "prof_streak": "STREAK / PEAK STREAK",
    "prof_wr_1300": "WR VS >1300 ELO",
    "prof_wr_1500": "WR VS >1500 ELO",
    "prof_chart": "MMR EVOLUTION",
    "prof_recent": "RECENT FORM",
    "prof_last_matches": "LAST MATCHES (BY DATE)",
    "prof_matchups": "OPPONENT MATCHUPS",
    "btn_all": "All",
    "col_opponent": "Opponent ↕",
    "col_opp_mmr": "MMR ↕",
    "col_opp_matches": "Matches ↕",
    "col_record": "Record (W - L) ↕",
    "col_opp_winrate": "Winrate ↕",
    "error_api": "Error connecting to API. Retrying...",
    "showing_last": "Showing last {0} of {1}",
    "no_history": "No match history",
    "last_20_wr": "Last 20: {0}% WR",
    "unknown_date": "Unknown date",
    "match_tag": "Match #{0}",
    "win": "Win",
    "loss": "Loss"
  }
};

let currentLang = 'es';

function t(key, ...args) {
  let text = translations[currentLang][key] || key;
  args.forEach((arg, i) => {
    text = text.replace(`{${i}}`, arg);
  });
  return text;
}

function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  
  // Update buttons
  document.getElementById('langEs').classList.toggle('active', lang === 'es');
  document.getElementById('langEn').classList.toggle('active', lang === 'en');
  
  // Update static elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
      el.placeholder = t(key);
    } else {
      el.innerHTML = t(key);
    }
  });

  // Re-render JS dynamic components if a profile is open
  if (typeof renderLeaderboard === 'function' && typeof state !== 'undefined' && state.players && state.players.length > 0) {
    renderLeaderboard();
  }
  if (typeof loadPlayerProfile === 'function' && typeof state !== 'undefined' && state.selectedPlayer) {
    loadPlayerProfile(state.selectedPlayer.id);
  }
}

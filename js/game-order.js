/* TecnoMath — orden centralizado de juegos */
(function (global) {
  'use strict';

  const collator = new Intl.Collator('es', {
    sensitivity: 'base',
    ignorePunctuation: true,
    numeric: true
  });

  function getGameDisplayName(game) {
    if (!game || typeof game !== 'object') return '';
    const candidates = [game.name, game.title, game.nombre];
    const value = candidates.find(v => typeof v === 'string' && v.trim());
    return value ? value.trim().replace(/\\s+/g, ' ') : '';
  }

  function compareGameNames(a, b) {
    return collator.compare(getGameDisplayName(a), getGameDisplayName(b));
  }

  function sortGamesByName(games) {
    return Array.isArray(games) ? games.slice().sort(compareGameNames) : [];
  }

  function sortRanking(ranking) {
    return Array.isArray(ranking) ? ranking.slice().sort((a, b) => {
      const votesA = Number(a?.votes ?? a?.voteCount ?? a?.count ?? 0);
      const votesB = Number(b?.votes ?? b?.voteCount ?? b?.count ?? 0);
      return votesB - votesA || compareGameNames(a, b);
    }) : [];
  }

  global.TecnoMathGameOrder = Object.freeze({
    getGameDisplayName,
    compareGameNames,
    sortGamesByName,
    sortRanking
  });
})(window);

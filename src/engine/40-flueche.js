/* Magus – Regelkern (Teil 4): Flüche.
   Lähmung Stufe S legt 2·S Fluchkarten (C1) auf den Ablagestapel der Gegenseite. Fluchkarten belegen Handplätze, kosten beim Ausspielen oder
   Verteidigen so viel Mana wie ihre Stufe und wirken sonst nicht. Sie kommen erst auf die Hand, wenn der Ablagestapel in den Zugstapel gemischt wird;
   die Aktion „Nachziehen“ ersetzt erst die übrigen (nicht gesperrten) Karten und wirft danach alle Fluchkarten der Hand ab. Am Kampfende verschwinden alle.
   Der Todes-Fluch (Ultimate) liegt als Marker (1 Marker = 1 HP am Ende der eigenen Angriffsphase); Läuterung kann Marker entfernen. */

function inflictCurses(state, victim, level) {
  const n = 2 * Math.max(1, Math.min(3, level));   // Lähmung S = 2/4/6 Flüche
  for (let i = 0; i < n; i++) victim.deck.discard.push(mkCard(state, 'C1'));
  return n + ' Fluchkarte' + (n > 1 ? 'n' : '') + ' auf den Ablagestapel von ' + victim.name;
}
// Erschöpfung (beide Seiten ohne Mana): nur der Todes-Fluch zehrt weiter; wer zuerst auf 0 HP fällt, verliert.
// Liefert { winner: 'a' | 'b' | null } oder null, wenn nichts entschieden wird (dann Erschöpfung ohne Sieger).
function settleExhaustion(state, a, b) {
  let result = null, step = 0;
  while (!result && ((a.stats.death || 0) > 0 || (b.stats.death || 0) > 0)) {
    step++;
    [a, b].forEach(x => { if ((x.stats.death || 0) > 0) x.stats.hp = Math.max(0, x.stats.hp - x.stats.death); });
    log(state, 'Erschöpfung, Schritt ' + step + ': Todes-Fluch (' + a.name + ' ' + Math.max(0, a.stats.hp) + ' HP, ' + b.name + ' ' + Math.max(0, b.stats.hp) + ' HP).');
    const da = a.stats.hp <= 0, db = b.stats.hp <= 0;
    if (da || db) result = { winner: da && db ? null : da ? 'b' : 'a' };
  }
  return result;
}

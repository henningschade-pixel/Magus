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

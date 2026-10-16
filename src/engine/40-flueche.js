/* Magus – Regelkern (Teil 4): Fluchsysteme.
   Flüche sind austauschbar. Der Regelkern kennt nur diese Schnittstelle (CURSE_SYSTEMS[state.rules.curses]):

     inflict(state, victim, level)      Aggro-Kombo: ‚victim‘ (Seite mit stats, deck, name) wird verflucht. Liefert Protokolltext.
     relieve(state, side, level)        Lifeflow-Kombo: Flüche der Seite werden gelindert. Liefert Zusatztext oder ''.
     turnStart(state, pid, stats, inCombat, name)
                                        Beginn eines eigenen Zuges (Welt: nach dem Zugwechsel; Kampf: vor dem Angriffszug).
                                        Liefert true, wenn etwas geschah (Protokoll schreibt das System selbst).
     worldAction(state, a, ctx)         Zusätzliche Weltaktionen des Systems (z. B. Flüche abwerfen). Liefert Ergebnis oder undefined.
     settleExhaustion(state, a, b)      Beide Seiten ohne Mana: verbleibende Flüche werden gegen die HP verrechnet. Liefert { winner:'a'|'b'|null }
                                        oder null, wenn nichts entschieden wird (dann Erschöpfung ohne Sieger).
     cardCurses                         true, wenn Flüche als Karten im Deck liegen (für Oberfläche und KI).

   „markers“ ist das aktuelle System (Regelwerk v3/v4). „cards“ ist das ursprüngliche System der veröffentlichten Version v2:
   Aggro legt Fluchkarten (C1) auf den Ablagestapel des Gegners; sie belegen Handplätze, kosten beim Ausspielen oder Verteidigen
   1 Mana und werden beim Händler-Zug „Fluch abwerfen“ losgeworden. Beschreibung: docs/fluchkarten.md. */

const CURSE_SYSTEMS = {
  markers: {
    id: 'markers', cardCurses: false,
    inflict(state, victim, level) {
      const b = victim.stats.marks; victim.stats.marks = Math.min(MAX_MARKS, b + level);
      return '+' + (victim.stats.marks - b) + ' Fluchmarker für ' + victim.name;
    },
    relieve(state, side, level) {
      if (side.stats.marks <= 0) return '';
      const r = Math.min(level, side.stats.marks); side.stats.marks -= r;
      return ', -' + r + ' Marker';
    },
    // Zu Beginn des eigenen Zuges wird ein Marker gegen 1 HP getauscht (Pflicht).
    // Außerhalb des Kampfes sinkt die HP dabei nie unter 1; dann bleibt der Marker liegen.
    turnStart(state, pid, stats, inCombat, name) {
      if (stats.marks <= 0) return false;
      if (!inCombat && stats.hp <= 1) return false;
      stats.marks--; stats.hp = Math.max(0, stats.hp - 1);
      log(state, name + ' tauscht einen Fluchmarker gegen 1 HP.', pid);
      return true;
    },
    worldAction() { return undefined; },
    // Erschöpfung: Schritt für Schritt verliert jede Seite mit Marker gleichzeitig 1 HP und 1 Marker.
    // Wer zuerst auf 0 HP fällt, verliert; fallen beide im selben Schritt, gibt es keinen Sieger. Übrige Marker verfallen.
    settleExhaustion(state, a, b) {
      let result = null, step = 0;
      while (!result && (a.stats.marks > 0 || b.stats.marks > 0)) {
        step++;
        const parts = [];
        [a, b].forEach(s => { if (s.stats.marks > 0) { s.stats.marks--; s.stats.hp = Math.max(0, s.stats.hp - 1); parts.push(s.name + ' ' + Math.max(0, s.stats.hp) + ' HP'); } });
        log(state, 'Erschöpfung, Schritt ' + step + ': Marker gegen HP (' + parts.join(', ') + ').');
        const da = a.stats.hp <= 0, db = b.stats.hp <= 0;
        if (da || db) result = { winner: da && db ? null : da ? 'b' : 'a' };
      }
      a.stats.marks = 0; b.stats.marks = 0;   // übrige Flüche verfallen
      return result;
    },
  },
  // „weak“ (Regelstand v5): Fluchmarker sind Schwäche. Wer mindestens 1 Marker trägt, erleidet doppelten Schaden (der Rückwurf des Spiegels bleibt einfach).
  // Am Ende des eigenen Angriffszuges des Betroffenen fällt ein Marker weg. Marker gelten nur bis Kampfende. Todes-Fluch (Ultimate): stats.death HP am Ende der eigenen Angriffsphase.
  weak: {
    id: 'weak', cardCurses: false, weakDouble: true, deferInflict: true, inflictBonus: 1,
    inflict(state, victim, level) {
      const b = victim.stats.marks; victim.stats.marks = Math.min(MAX_MARKS, b + level);
      return '+' + (victim.stats.marks - b) + ' Schwäche-Marker für ' + victim.name;
    },
    relieve(state, side, level) {
      if (side.stats.marks <= 0) return '';
      const r = Math.min(level, side.stats.marks); side.stats.marks -= r;
      return ', -' + r + ' Marker';
    },
    endTurn(state, side) { if (side.stats.marks > 0) side.stats.marks--; },
    turnStart() { return false; },   // der Todes-Fluch wirkt am Ende der eigenen Angriffsphase (deathTick), nicht zu Beginn des Zuges
    worldAction() { return undefined; },
    // Erschöpfung: nur der Todes-Fluch zehrt weiter; wer zuerst auf 0 HP fällt, verliert.
    settleExhaustion(state, a, b) {
      let result = null, step = 0;
      while (!result && ((a.stats.death || 0) > 0 || (b.stats.death || 0) > 0)) {
        step++;
        [a, b].forEach(x => { if ((x.stats.death || 0) > 0) x.stats.hp = Math.max(0, x.stats.hp - x.stats.death); });
        log(state, 'Erschöpfung, Schritt ' + step + ': Todes-Fluch (' + a.name + ' ' + Math.max(0, a.stats.hp) + ' HP, ' + b.name + ' ' + Math.max(0, b.stats.hp) + ' HP).');
        const da = a.stats.hp <= 0, db = b.stats.hp <= 0;
        if (da || db) result = { winner: da && db ? null : da ? 'b' : 'a' };
      }
      return result;
    },
  },
  // „deathcards“ (Regelstand v6): keine Schwäche. Aggro Stufe S legt S Fluchkarten (C1) auf den Ablagestapel der Gegenseite.
  // Fluchkarten belegen Handplätze, kosten beim Ausspielen oder Verteidigen so viel Mana wie ihre Stufe und wirken sonst nicht. Die Aktion „Nachziehen“
  // ersetzt erst die übrigen (nicht gesperrten) Karten und wirft danach alle Fluchkarten der Hand ab. Am Kampfende verschwinden alle Fluchkarten.
  // Der Todes-Fluch (Ultimate) liegt als Marker (1 Marker = 1 HP am Ende der eigenen Angriffsphase); Lifeflow kann Marker entfernen.
  deathcards: {
    id: 'deathcards', cardCurses: false, curseCards: true,
    inflict(state, victim, level) {
      const n = state.rules.comboMode === 'ordered' ? 2 * Math.max(1, Math.min(3, level)) : Math.max(1, Math.min(3, level));   // geordnete Kombos: Aggro S = 2/4/6 Flüche
      for (let i = 0; i < n; i++) victim.deck.discard.push(mkCard(state, 'C1'));
      return n + ' Fluchkarte' + (n > 1 ? 'n' : '') + ' auf den Ablagestapel von ' + victim.name;
    },
    relieve() { return ''; },
    turnStart() { return false; },   // der Todes-Fluch wirkt am Ende der eigenen Angriffsphase (deathTick), nicht zu Beginn des Zuges
    worldAction() { return undefined; },
    settleExhaustion(state, a, b) { return CURSE_SYSTEMS.weak.settleExhaustion(state, a, b); },
  },
  cards: {
    id: 'cards', cardCurses: true, discardAction: true,
    inflict(state, victim, level) {
      for (let i = 0; i < level; i++) victim.deck.discard.push(mkCard(state, 'C1'));
      return level + ' Fluch' + (level > 1 ? 'e' : '') + ' für ' + victim.name;
    },
    relieve() { return ''; },
    turnStart() { return false; },
    settleExhaustion() { return null; },
    worldAction(state, a, ctx) {
      if (a.type !== 'discardCurses') return undefined;
      const { p, pid, d } = ctx;
      if (state.camp) return fail('In der Erholungsphase nicht erlaubt.');
      const idx = d.marks.filter(i => d.hand[i] && parseCard(d.hand[i].id).curse);
      if (!idx.length) return fail('Markiere zuerst mindestens einen Fluch.');
      idx.forEach(i => d.discard.push(removeFromHand(d, i)));
      log(state, p.name + ' wirft ' + idx.length + ' Fluch' + (idx.length > 1 ? 'e' : '') + ' ab.', pid);
      endTurn(state, pid, 'discard'); return { ok: true };
    },
  },
};
function curses(state) { return CURSE_SYSTEMS[state.rules.curses]; }

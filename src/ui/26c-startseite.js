/* ---------- Menüs, Einstellungen (Regeln, erlaubte Aktionen) und Startseite (showStart), seit 0.13.1 aus 26a-darstellung.js ausgelagert ---------- */
let menuView = null;   // zeichnet das gerade offene Menü neu (Ton-Schalter, Regler)
function menuRedraw() {   // Menü neu zeichnen und die Scrollposition behalten (seit 0.9.9.8)
  if (!menuView) return;
  const b = overlay.querySelector('.box'), t = b ? b.scrollTop : 0;
  menuView();
  const n = overlay.querySelector('.box'); if (n) n.scrollTop = t;
}
const menuBtn = (act, txt, extra, cls) => '<button class="btn' + (cls ? ' ' + cls : '') + '" data-act="' + act + '"' + (extra || '') + '>' + txt + '</button>';
const menuTo = (pg, txt, cls) => menuBtn('menu', txt, ' data-p="' + pg + '"', cls);
// Spieleinstellungen (seit 0.8.1): Runden bis zum Erschöpfungsschaden und Siegpunktvorsprung für das vorzeitige Spielende (0 = aus); gelten für neue Partien, im Browser gespeichert
const RULE_OPTS = [
  { k: 'exhaustRounds', name: 'Runden bis Erschöpfung', min: 0, max: 30, tip: 'Nach so vielen Kampfrunden steigt die Erschöpfung um 1 (danach alle so viele Runden wieder): Beide Seiten verlieren am Ende ihres Angriffszugs entsprechend viele HP. Derselbe Wert gilt für die Zermürbung in der Weltphase: Nach so vielen Runden ohne Monsterkampf schenkt jeder, der seinen Zug ohne Monsterangriff beendet, dem Gegner Gold in Höhe der Spielstufe. 0 = beides aus.' },
  { k: 'winLead', name: 'Siegpunkt-Vorsprung', min: 0, max: 10, tip: 'Hat ein Spieler nach einem Showdown mindestens so viele Siegpunkte Vorsprung, gewinnt er das Spiel sofort. 0 = das Spiel läuft immer bis zum dritten Showdown.' }
];
// Erlaubte Aktionen je Phase (seit 0.9.9.5): Schalter an/aus; Erholen oder Passen bleibt immer erlaubt (die Engine gibt Passen frei, wenn beide aus sind)
const PHASE_OPTS = [
  { ph: 'allowAtk', name: 'Angriffsphase', acts: [['attack', 'Angreifen', 'Magie als Angriff ausspielen'], ['recover', 'Erholen', 'Mana gewinnen statt anzugreifen'], ['draw', 'Nachziehen', 'Hand tauschen statt anzugreifen'], ['pass', 'Passen', 'Zug aussetzen'], ['echo', 'Echo setzen', 'Die Primärmagie des Angriffs hinterlässt ein Echo, das den nächsten Kombo verstärkt'], ['combo', 'Kombo wirken', 'Karten einer zweiten Farbe lösen einen Kombo aus (aus: nur Karten einer Farbe)']] },
  { ph: 'allowDef', name: 'Verteidigungsphase', acts: [['defend', 'Verteidigen', 'Den eingehenden Schaden mit Magie blocken'], ['recover', 'Erholen', 'Mana gewinnen; der Schaden wird ohne Block hingenommen'], ['draw', 'Nachziehen', 'Hand tauschen; der Schaden wird ohne Block hingenommen'], ['pass', 'Passen', 'Den Schaden ohne Verteidigung hinnehmen'], ['echo', 'Echo setzen', 'Die Primärmagie der Verteidigung hinterlässt ein Echo'], ['combo', 'Kombo wirken', 'Karten einer zweiten Farbe lösen in der Verteidigung einen Kombo aus (aus: nur Karten einer Farbe)']] }
];
function phaseRules() {
  let sv = {}; try { sv = JSON.parse(localStorage.getItem('magus_rules') || '{}') || {}; } catch (e) { sv = {}; }
  const out = {};
  PHASE_OPTS.forEach(po => { const o = {}; po.acts.forEach(([k]) => { const v = sv[po.ph] && sv[po.ph][k]; o[k] = v === undefined || v === null ? M.DEFAULT_RULES[po.ph][k] : (po.ph === 'allowDef' && [2, 3].includes(+v) ? +v : (+v ? 1 : 0)); }); out[po.ph] = o; });
  return out;
}
function setPhaseRule(ph, k) {   // schaltet eine Aktion um; Erholen und Passen dürfen nicht gemeinsam ausgeschaltet werden
  let sv = {}; try { sv = JSON.parse(localStorage.getItem('magus_rules') || '{}') || {}; } catch (e) { sv = {}; }
  const pr = phaseRules(), o = pr[ph]; if (!o || o[k] === undefined) return;
  let nv = o[k];
  if (ph === 'allowDef') { const seq = [1, 0, 2, 3]; nv = seq[(seq.indexOf(nv) + 1) % 4]; }   // an, aus, nach Angriff, ohne Angriff
  else nv = nv ? 0 : 1;
  o[k] = nv; PHASE_OPTS.forEach(po => { sv[po.ph] = pr[po.ph]; });
  try { localStorage.setItem('magus_rules', JSON.stringify(sv)); } catch (e) {}
}
function resetPhaseRules() { let sv = {}; try { sv = JSON.parse(localStorage.getItem('magus_rules') || '{}') || {}; } catch (e) { sv = {}; } PHASE_OPTS.forEach(po => { delete sv[po.ph]; }); try { localStorage.setItem('magus_rules', JSON.stringify(sv)); } catch (e) {} }
function gameRules() {
  let sv = {}; try { sv = JSON.parse(localStorage.getItem('magus_rules') || '{}') || {}; } catch (e) { sv = {}; }
  const r = Object.assign({}, phaseRules());
  RULE_OPTS.forEach(o => { const v = Math.round(+sv[o.k]); r[o.k] = isFinite(v) && sv[o.k] !== undefined && sv[o.k] !== null ? Math.min(o.max, Math.max(o.min, v)) : M.DEFAULT_RULES[o.k]; });
  return r;
}
function setGameRule(k, d) {
  const o = RULE_OPTS.find(x => x.k === k); if (!o) return;
  const r = gameRules(); r[k] = d === 'def' ? M.DEFAULT_RULES[k] : Math.min(o.max, Math.max(o.min, r[k] + (+d || 0)));
  const sv = (() => { try { return JSON.parse(localStorage.getItem('magus_rules') || '{}') || {}; } catch (e) { return {}; } })(); RULE_OPTS.forEach(x => { sv[x.k] = r[x.k]; });
  try { localStorage.setItem('magus_rules', JSON.stringify(sv)); } catch (e) {}
}
function rulesHTML() {
  const r = gameRules(), std = RULE_OPTS.every(o => r[o.k] === M.DEFAULT_RULES[o.k]) && PHASE_OPTS.every(po => po.acts.every(([k]) => r[po.ph][k] === M.DEFAULT_RULES[po.ph][k]));
  const row = o => '<div class="rulerow" title="' + o.tip + '"><span>' + o.name + '</span><div class="stepper"><button class="btn" data-act="rule" data-k="' + o.k + '" data-d="-1" aria-label="weniger"' + (r[o.k] <= o.min ? ' disabled' : '') + '>−</button><output>' + (r[o.k] === 0 ? 'aus' : r[o.k]) + '</output><button class="btn" data-act="rule" data-k="' + o.k + '" data-d="1" aria-label="mehr"' + (r[o.k] >= o.max ? ' disabled' : '') + '>+</button></div></div>';
  return '<section class="setgrp"><div class="sethead"><h3>Spiel</h3>' + menuBtn('rule', 'Standardwerte', ' data-k="all" data-d="def" title="Beide Werte auf den Standard setzen (10 Runden, 4 Siegpunkte)"' + (std ? ' disabled' : ''), 'small') + '</div>' +
    '<div class="setbox">' + RULE_OPTS.map(row).join('') + '</div><p class="sethint">0 schaltet die Regel ab. Gilt für neue Spiele.</p></section>' +
    '<section class="setgrp"><div class="sethead"><h3>Erlaubte Aktionen</h3></div>' + PHASE_OPTS.map(po => '<div class="setbox"><div class="phasehead">' + po.name + '</div>' + po.acts.map(([k, nm, tip]) => '<div class="rulerow" title="' + tip + '"><span>' + nm + '</span><button class="btn small tgl' + (r[po.ph][k] ? ' on' : '') + '" data-act="rulephase" data-ph="' + po.ph + '" data-k="' + k + '"' + (po.ph === 'allowDef' ? ' title="an: immer · aus: nie · nach Angriff: nur wenn ein Angriff vorausging · ohne Angriff: nur wenn kein Angriff vorausging"' : '') + '>' + ['aus', 'an', 'nach Angriff', 'ohne Angriff'][r[po.ph][k]] + '</button></div>').join('') + '</div>').join('') + '<p class="sethint">Sind Erholen und Passen beide aus, bleibt Passen als Notausgang erlaubt. In der Verteidigungsphase schaltet ein Klick weiter: an, aus, nach Angriff (Reaktion auf einen Angriff mit Schaden), ohne Angriff (Reaktion nach einer Aktion ohne Angriff). Gilt für neue Spiele.</p></section>';
}
function settingsHTML() {   // Einstellungen (Hauptmenü und Spielmenü): Gruppe Ton (Schalter, zwei Regler) und Gruppe Spiel (seit 0.8.1.1; Aufbau seit 0.8.4)
  const si = Snd.info();
  return '<section class="setgrp"><div class="sethead"><h3>Ton</h3>' + menuBtn('sndtoggle', si.on ? '🔊 an' : '🔇 aus', ' title="Ton an oder aus"', 'small') + '</div>' + volHTML() + '</section>' + rulesHTML();
}
function showStart(pg) {
  pg = pg || 'main'; setCursor('human');
  overlay.style.display = 'flex'; overlay.className = 'overlay';
  menuView = () => showStart(pg);
  const run = G && !G.over && !MP && started;
  const mpsv = MP ? null : mpSaved();   // unterbrochene Mehrspieler-Partie auf diesem Gerät
  const back = menuTo('main', 'Zurück');
  let h = '<div class="box start"><h1>Magus</h1>';
  if (pg === 'main') {
    h += '<img class="logo" alt="" src="assets/img/logo.webp"><div class="menulist">' +
      (run ? menuBtn('resume', 'Spiel fortsetzen', '', 'primary') : '') +
      (mpsv ? menuBtn('mpresume', 'Partie fortsetzen (Raum ' + mpsv.code.toUpperCase() + ')', ' title="Setzt die unterbrochene Mehrspieler-Partie fort"', run ? '' : 'primary') : '') +
      menuTo('single', 'Einzelspieler', run || mpsv ? '' : 'primary') + menuTo('multi', 'Mehrspieler') + menuTo('settings', 'Einstellungen') + menuTo('credits', 'Credits') + menuBtn('quit', 'Beenden') + '</div>' +
      '<div class="menufoot">' + menuTo('about', 'Neu in Version ' + MAGUS_VERSION, 'link') + '</div>';
  } else if (pg === 'single') {
    h += '<h2>Einzelspieler</h2><div class="menulist">' +
      menuBtn('newgame', run ? 'Neues Spiel gegen den Computer' : 'Gegen den Computer spielen', '', run ? '' : 'primary') +
      menuBtn('newspec', 'Zwei Computern zuschauen', ' title="Zwei Computerspieler spielen gegeneinander, du schaust zu (für Spielablauf und Statistik)"') + back + '</div>';
  } else if (pg === 'multi') {
    offerTries = 0;
    h += '<h2>Mehrspieler</h2><p class="note" style="text-align:center">Zwei Geräte, ein Raum</p><div class="menulist">' +
      '<p id="mpna" class="note" style="text-align:center">Verbindung wird geprüft …</p>' +
      '<div id="mpbox" class="mpbox" style="display:none"><div class="mprow">' + menuBtn('mphost', 'Raum erstellen') + '<input id="mpcode" maxlength="5" placeholder="Code" autocomplete="off" spellcheck="false">' + menuBtn('mpjoin', 'Beitreten') + '</div><div id="mpmsg" class="note"></div></div>' + back + '</div>';
  } else if (pg === 'settings') {
    h += '<h2>Einstellungen</h2><div class="menulist setpage">' + settingsHTML() + back + '</div>';
  } else if (pg === 'about') {
    h += '<p class="note intro" style="margin-top:-2px"><b>Danke, dass du Magus testest!</b> ' + versionenHTML() + '</p><div class="menulist">' + back + '</div>';
  } else if (pg === 'credits') {
    h += '<h2>Credits</h2><p class="note" style="text-align:center">Danke fürs Testspielen an</p><div class="menulist"><p class="note" style="text-align:center;font-size:21px;line-height:1.7"><b>DarkParladin</b><br><b>Deekixx</b><br><b>H5</b><br><b>Leon aka Tim</b><br><b>Zockerboy</b></p>' + back + '</div>';
  } else if (pg === 'quit') {
    h += '<p class="note" style="text-align:center;font-size:19px">Danke fürs Spielen!<br>Ein Browser-Tab lässt sich vom Spiel aus nicht immer schließen. Schließe diesen Tab oder dieses Fenster einfach selbst.</p><div class="menulist">' + back + '</div>';
  }
  overlay.innerHTML = h + '</div>';
  if (pg === 'multi') mpOffer();
}

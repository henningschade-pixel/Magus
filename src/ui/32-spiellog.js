/* ---------- Spiellog-Export (jederzeit, auch am Spielende) ---------- */
function buildExport() {
  if (!G) return null;
  return {
    format: 'magus-spiellog', version: 1, exportiert: new Date().toISOString(),
    hinweis: 'actions = jede ausgeführte Aktion mit Zustand davor (before), Akteur und den zugehörigen Logzeilen (logFrom..logTo, Nummern aus log). Die KI-Spieler sind mit ai=true markiert. Mit seed + rules + first lässt sich die Partie über die Aktionsfolge nachspielen.',
    modus: MP ? 'mehrspieler' : 'gegen-computer', mein_platz: ME,
    seed: G.seed, rules: G.rules, first: MP ? MP.first : 0,
    spieler: G.players.map((p, i) => ({ platz: i, name: p.name, ai: !!p.ai, siegpunkte: p.sp, endwerte: M.prim(p.stats) })),
    beendet: !!G.over, sieger: G.winner, abschnitt: G.stage, showdowns: G.showdown,
    actions: G.rec || [],
    log: G.log.map(e => ({ n: e.n, pid: e.pid, text: e.txt }))
  };
}
// Der Export-Knopf sitzt in der Kopfzeile des Logs (siehe render in 26-erde.js)
logEl.addEventListener('click', e => { if (e.target.closest('.logdl')) { e.stopPropagation(); exportLog(e); } });
async function exportLog(e) {
  const d = buildExport(); if (!d) { toast('Noch keine Partie.'); return; }
  const txt = JSON.stringify(d, null, 1);
  const fn = 'magus-log-' + d.seed + '-' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '') + '.json';
  if (e.altKey) { try { await navigator.clipboard.writeText(txt); toast('Spiellog kopiert.'); } catch (x) { toast('Kopieren nicht möglich.'); } return; }
  let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (x) { dl = null; }
  if (dl) { try { await dl.save({ filename: fn, data: txt }); toast('Spiellog exportiert (' + d.actions.length + ' Aktionen).'); } catch (x) { if (!x || x.code !== 'declined') toast('Export nicht möglich.'); } return; }
  try {   // Online-Fassung (GitHub Pages): normaler Browser-Download
    const a = document.createElement('a'), u = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
    a.href = u; a.download = fn; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    toast('Spiellog exportiert (' + d.actions.length + ' Aktionen).');
  } catch (x) { toast('Export nicht möglich.'); }
}
window.__magus = { snd: () => Snd.info(), get mp() { return MP && { n: MP.log.length, started: MP.started, seat: MP.seat }; }, get state() { return G; }, act, newGame, pump };
showStart();
mpRestore();
})();
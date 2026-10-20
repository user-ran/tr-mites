/* Catálogo interactivo de trámites · Registro Agrario Nacional */
(() => {
  'use strict';
  const DATA = (window.TRAMITES || []).slice();
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const tok = s => norm(s).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  const stem = w => (w.length > 5 && w.endsWith('es')) ? w.slice(0, -2) : (w.length > 3 && w.endsWith('s')) ? w.slice(0, -1) : w;
  const safe = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }
  };

  /* ------------------------------------------------------------------
     Índice de búsqueda
  ------------------------------------------------------------------ */
  const STOP = new Set('de la el los las para en y o un una unos unas mi mis su sus del al que como quiero necesito se por con a lo es son ser tengo hacer tramite tramites'.split(' '));
  const SYN = {
    vender: ['enajenacion'], venta: ['enajenacion'], vendo: ['enajenacion'], comprar: ['enajenacion'], compraventa: ['enajenacion'],
    heredar: ['sucesion', 'sucesores'], herencia: ['sucesion', 'sucesores', 'transmision'], heredero: ['sucesion', 'sucesores'], testamento: ['sucesion', 'sucesores'], fallecio: ['sucesion'], muerte: ['sucesion'],
    ceder: ['cesion'], regalar: ['cesion', 'transmision'], donar: ['cesion', 'transmision'],
    perdi: ['reposicion'], perdida: ['reposicion'], extravio: ['reposicion'], robo: ['reposicion'], reponer: ['reposicion'], repuesto: ['reposicion'],
    corregir: ['rectificacion'], error: ['rectificacion'], rectificar: ['rectificacion'], correccion: ['rectificacion'],
    copia: ['copias', 'certificadas'], copias: ['certificadas'], certificada: ['certificadas'],
    titulo: ['titulos', 'propiedad', 'dominio'], escritura: ['escrituras', 'titulos'],
    sociedad: ['mercantiles', 'civiles'], empresa: ['sociedades', 'mercantiles'], asociacion: ['asociaciones', 'figuras'],
    comisariado: ['organos', 'representacion'], eleccion: ['organos', 'representacion', 'remocion'], elecciones: ['eleccion', 'organos'], autoridades: ['organos', 'representacion'],
    dividir: ['division', 'fusion'], fusionar: ['fusion', 'division'], unir: ['fusion'], separar: ['division', 'separacion'],
    colono: ['colonos', 'colonia'], vecino: ['avecindados'], avecindado: ['avecindados', 'reconocimiento'],
    posesion: ['posesionarios'], posesionario: ['posesionarios', 'regularizacion'], regularizar: ['regularizacion'],
    constancia: ['certificado', 'constancias'], vigente: ['vigencia', 'vigentes'], vigencia: ['vigentes'],
    costo: ['pago', 'derechos', 'monto'], precio: ['pago', 'monto', 'costo'], pagar: ['pago', 'monto'], cuanto: ['costo', 'monto'], cuesta: ['costo', 'monto'],
    mapa: ['plano', 'croquis'], ubicacion: ['croquis', 'localizacion'], coordenadas: ['utm', 'croquis', 'plano'],
    terreno: ['predio', 'parcela', 'tierras'], predio: ['tierras', 'parcela'], parcela: ['parcelario', 'parcelas', 'parcelarios'],
    ejido: ['ejidal', 'ejidatarios', 'ejidales'], ejidatario: ['ejidatarios', 'ejidal'], comunero: ['comuneros', 'comunal'], comunidad: ['comunidades', 'comunal'],
    reglamento: ['estatuto', 'estatutos'], estatuto: ['reglamento', 'estatutos'],
    reserva: ['crecimiento'], urbano: ['asentamiento', 'crecimiento'], solar: ['solares'],
    ine: ['identificacion'], credencial: ['identificacion'], pasaporte: ['identificacion'], identificacion: ['ine'],
    contrato: ['contratos'], acta: ['actas'], dominio: ['pleno'], pleno: ['dominio'],
    avaluo: ['avaluo'], liquidar: ['liquidacion'], disolver: ['disolucion'], cancelar: ['cancelacion'], terminar: ['terminacion']
  };
  const FIELDS = [['id', 10], ['titulo', 6], ['cat', 3], ['descripcion', 2], ['reqn', 2], ['reqd', 1], ['nota', 1], ['quien', 0.6], ['formatos', 1.2], ['extra', 1]];

  DATA.forEach(t => {
    t.tiempo = /inmediat/i.test(t.tiempo) ? 'Inmediato' : /^no aplica$/i.test(t.tiempo) ? 'No especificado' : t.tiempo;
    const text = {
      id: [t.id].concat(t.abs || []).join(' '), titulo: t.titulo, cat: t.cat, descripcion: t.descripcion,
      reqn: t.req.map(r => r.n).join(' '), reqd: t.req.map(r => r.d).join(' '),
      nota: t.nota || '', quien: t.quien.map(q => q.roles.join(' ') + ' ' + q.d).join(' '),
      formatos: t.formatos.join(' '), extra: [t.costo, t.tiempo, t.modalidad, t.simp ? 'tramite simplificado simplificacion DOF ' + t.simp.dof : ''].join(' ')
    };
    t._tok = {};
    FIELDS.forEach(([f]) => { t._tok[f] = tok(text[f]).map(w => [w, stem(w)]); });
    t._compact = norm(t.id).replace(/[^a-z0-9]/g, '');
    t._abs = (t.abs || []).map(a => norm(a).replace(/[^a-z0-9]/g, ''));
    t._time = parseTime(t.tiempo);
    t._lc = norm(t.titulo);
  });
  const VOCAB = new Map();
  DATA.forEach(t => ['titulo', 'reqn', 'cat'].forEach(f => t._tok[f].forEach(([w]) => { if (w.length > 3 && !/^\d+$/.test(w)) VOCAB.set(w, (VOCAB.get(w) || 0) + 1); })));

  function parseTime(s) {
    const m = /(\d+)\s*(d[ií]as?\s*(h[aá]biles|naturales)?|mes(es)?)/i.exec(s || '');
    if (/inmediat/i.test(s || '')) return 0;
    if (!m) return 9999;
    let n = +m[1];
    if (/mes/i.test(m[2])) n *= 30;
    else if (/h[aá]biles/i.test(m[2])) n *= 1.4;
    return n;
  }
  function within(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return false;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let min = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < min) min = cur[j];
      }
      if (min > max) return false;
      prev = cur;
    }
    return prev[b.length] <= max;
  }
  function tokScore(q, qs, list) {
    let best = 0;
    for (const [w, ws] of list) {
      let s = 0;
      if (w === q || ws === qs) s = 1;
      else if (q.length >= 3 && (w.startsWith(q) || ws.startsWith(qs))) s = .8;
      else if (q.length >= 4 && w.includes(q)) s = .45;
      else if (q.length >= 4 && within(q, w, q.length >= 7 ? 2 : 1)) s = .4;
      if (s > best) { best = s; if (s === 1) break; }
    }
    return best;
  }
  function parseQuery(q) {
    return tok(q).filter(w => !STOP.has(w) && (w.length > 1 || /\d/.test(w)));
  }
  function search(q) {
    const qt = parseQuery(q);
    if (!qt.length) return { list: DATA.map(t => ({ t, s: 0 })), approx: false, qt };
    const compact = norm(q).replace(/[^a-z0-9]/g, '');
    const PRIMARY = new Set(['id', 'titulo', 'cat', 'descripcion', 'formatos']);
    const scored = DATA.map(t => {
      let total = 0, hit = 0, hitP = 0, titleAll = true;
      for (const w of qt) {
        const ws = stem(w);
        const alts = [[w, ws, 1], ...(SYN[w] || []).map(a => [a, stem(a), .7])];
        let best = 0, bestP = 0, bonus = 0, inTitle = 0;
        for (const [f, wt] of FIELDS) {
          let fs = 0;
          for (const [a, as, k] of alts) fs = Math.max(fs, tokScore(a, as, t._tok[f]) * k);
          if (f === 'titulo') inTitle = fs;
          const v = fs * wt;
          if (PRIMARY.has(f) && v > bestP) bestP = v;
          if (v > best) { bonus += best * .1; best = v; } else bonus += v * .1;
        }
        if (best > 0) hit++;
        if (bestP > 0) hitP++;
        if (inTitle < .4) titleAll = false;
        total += best + bonus;
      }
      if (compact.length >= 5 && (t._compact.includes(compact) || t._abs.some(a => a.includes(compact)))) total += 100;
      if (titleAll) total += 5;
      return { t, s: total, hit, all: hit === qt.length, allP: hitP === qt.length };
    });
    // Primero coincidencias en nombre, descripción y categoría; los requisitos solo si no hay ninguna.
    let list = scored.filter(x => x.allP);
    if (!list.length) list = scored.filter(x => x.all);
    let approx = false;
    if (!list.length) { list = scored.filter(x => x.hit > 0); approx = list.length > 0; }
    list.sort((a, b) => b.s - a.s || a.t.id.localeCompare(b.t.id));
    return { list, approx, qt };
  }
  function didYouMean(q) {
    const out = [];
    let changed = false;
    for (const w of tok(q)) {
      if (STOP.has(w) || w.length < 4 || VOCAB.has(w)) { out.push(w); continue; }
      let best = null, bd = 9;
      for (const [v, n] of VOCAB) {
        if (Math.abs(v.length - w.length) > 2) continue;
        for (let d = 1; d <= 2 && d < bd; d++) if (within(w, v, d)) { best = v; bd = d; break; }
        if (best === v && bd === 1) break;
      }
      if (best) { out.push(best); changed = true; } else out.push(w);
    }
    return changed ? out.join(' ') : '';
  }
  function hl(text, qt) {
    const src = String(text ?? '');
    if (!qt || !qt.length) return esc(src);
    const n = [...src].map(c => { const b = c.normalize('NFD').replace(/[̀-ͯ]/g, ''); return (b.length === 1 ? b : c).toLowerCase(); }).join('');
    if (n.length !== src.length) return esc(src);
    const parts = qt.map(w => stem(w)).filter(w => w.length >= 2).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!parts.length) return esc(src);
    const re = new RegExp('(?<![a-z0-9])(' + parts.join('|') + ')', 'g');
    let out = '', last = 0, m;
    while ((m = re.exec(n))) {
      out += esc(src.slice(last, m.index)) + '<mark>' + esc(src.slice(m.index, m.index + m[1].length)) + '</mark>';
      last = m.index + m[1].length;
      if (!m[1].length) re.lastIndex++;
    }
    return out + esc(src.slice(last));
  }

  /* ------------------------------------------------------------------
     Utilidades de presentación
  ------------------------------------------------------------------ */
  const ICON = {
    clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    coin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.6-.8-1.5-1.2-2.5-1.2-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.3 5 3.9 0 1.1-1.1 2-2.5 2-1.1 0-2-.5-2.6-1.3M12 6v2m0 8v2"/></svg>',
    list: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    chev: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    doc: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>'
  };
  function fmtCosto(t) {
    if (!t.costo) return { main: 'No indicado', sub: 'La ficha oficial no publica el costo', none: true };
    const m = /^(Monto\s+\S+)\s+(.*)$/i.exec(t.costo);
    const clean = s => s.replace(/\$\s+/g, '$').replace(/\s*-\s*/g, ' – ');
    return m ? { main: clean(m[2]), sub: m[1] } : { main: clean(t.costo), sub: '' };
  }
  const KEEP = { 'registro agrario nacional': 'Registro Agrario Nacional', 'ine': 'INE', 'utm': 'UTM', 'curp': 'CURP', 'ran': 'RAN', 'ley agraria': 'Ley Agraria', 'procuraduría agraria': 'Procuraduría Agraria' };
  function sentence(s) {
    s = String(s || '').trim();
    const L = [...s].filter(c => /\p{L}/u.test(c));
    if (L.length > 8 && L.filter(c => c === c.toUpperCase()).length / L.length > .6) {
      s = s.toLowerCase().replace(/(^|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
      Object.entries(KEEP).forEach(([k, v]) => { s = s.replace(new RegExp('(?<![\\p{L}])' + k + '(?![\\p{L}])', 'giu'), v); });
    }
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const cleanStep = p => sentence(String(p).replace(/^\s*\d+\.\s*(\d+\s*[-–.]\s*)?/, '').replace(/^\d+\s*[-–]\s*/, '')).replace(/oficina (de )?representaci[oó]n/i, 'oficina de representación');
  /* Estado del plazo legal de adecuaciones internas del RAN (se calcula con la fecha actual).
     Indica solo el plazo legal, no el avance real de implementación. */
  const ADEC = {
    /* 12/11/2025: el cómputo oficial de los 120 días hábiles depende de los días inhábiles aplicables y no está validado
       institucionalmente, por lo que NO se muestra fecha de término. `umbral` es solo un límite interno, posterior a todos los
       cómputos razonables (12/05 a 22/06/2026), para decidir el estado "transcurrido". */
    '12/11/2025': { vigor: '13/11/2025', plazo: '120 días hábiles', umbral: new Date(2026, 5, 30), nota: '', url: 'https://sidof.segob.gob.mx/notas/docFuente/5772715' },
    '19/02/2026': { vigor: '20/02/2026', plazo: 'un año', umbral: new Date(2027, 1, 20), aniversario: '20/02/2027', nota: 'fecha aniversario: 20/02/2027', url: 'https://sidof.segob.gob.mx/notas/docFuente/5780488' }
  };
  function estadoAdec(t) {
    const a = ADEC[t.simp.dof], hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const trans = hoy >= a.umbral;
    return { a, trans, label: trans ? 'Plazo de adecuación transcurrido' : 'Dentro del plazo de adecuación' };
  }
  const SEAL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.4 1.8 3-.2 1 2.8 2.5 1.7-.9 2.9.9 2.9-2.5 1.7-1 2.8-3-.2L12 21l-2.4-1.8-3 .2-1-2.8-2.5-1.7.9-2.9-.9-2.9 2.5-1.7 1-2.8 3 .2z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>';
  const badgeSimp = (t, cls = '') => t.simp ? `<span class="simp-badge ${cls}">${SEAL}<span><b>Trámite simplificado</b><small>DOF: ${t.simp.dof}</small></span></span>` : '';
  const NOTE_TAG = { elim: 'Ya no se pide', cond: 'Solo en algunos casos', post: 'No se pide al ingresar el trámite', unif: 'Unificación', plazo: 'Plazo', info: 'Importante' };
  const reqCount = t => t.req.length + (t.req.length === 1 ? ' requisito' : ' requisitos');
  let toastT;
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch { /* nada */ }
      ta.remove(); return ok;
    }
  }

  /* ------------------------------------------------------------------
     Estado y filtros
  ------------------------------------------------------------------ */
  const REQ_GROUPS = [
    ['Formato de solicitud FF-RAN-01', /ff-?ran-?01|formato de solicitud|formato ff/i],
    ['Identificación oficial vigente (INE o pasaporte)', /identificaci/i],
    ['Acta de Asamblea', /acta de asamblea/i],
    ['Convocatoria o acta de no verificativo', /convocatoria/i],
    ['Plano con coordenadas UTM', /plano|croquis/i],
    ['Comprobante de pago de derechos', /comprobante de pago/i]
  ];
  const state = { q: '', cat: '', costo: '', quien: '', orden: 'rel', req: '', simp: '' };
  const simpOk = t => !state.simp || (state.simp === 'si' ? !!t.simp : !t.simp);
  const CATS = [...new Set(DATA.map(t => t.cat))].sort((a, b) => DATA.filter(t => t.cat === b).length - DATA.filter(t => t.cat === a).length);

  function readUrl() {
    const p = new URLSearchParams(location.search);
    state.q = p.get('q') || ''; state.cat = CATS.includes(p.get('cat')) ? p.get('cat') : '';
    state.costo = ['con', 'sin'].includes(p.get('costo')) ? p.get('costo') : '';
    state.quien = p.get('quien') || ''; { const r = p.get('req'); state.req = (r !== null && /^\d+$/.test(r) && REQ_GROUPS[+r]) ? r : ''; } state.orden = ['rel', 'az', 'tiempo', 'req'].includes(p.get('orden')) ? p.get('orden') : 'rel';
    state.simp = ['si', 'no'].includes(p.get('simp')) ? p.get('simp') : '';
  }
  function writeUrl() {
    const p = new URLSearchParams();
    Object.entries(state).forEach(([k, v]) => { if (v !== '' && !(k === 'orden' && v === 'rel')) p.set(k, v); });
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }
  function applyFilters() {
    const r = search(state.q);
    let list = r.list.filter(({ t }) =>
      (!state.cat || t.cat === state.cat) && simpOk(t) &&
      (!state.costo || (state.costo === 'con' ? !!t.costo : !t.costo)) &&
      (!state.quien || t.quien.some(g => g.roles.includes(state.quien))) &&
      (state.req === '' || t.req.some(r => REQ_GROUPS[+state.req][1].test(r.n))));
    const o = state.orden;
    if (o === 'az') list.sort((a, b) => a.t.titulo.localeCompare(b.t.titulo, 'es'));
    else if (o === 'tiempo') list.sort((a, b) => a.t._time - b.t._time || a.t.id.localeCompare(b.t.id));
    else if (o === 'req') list.sort((a, b) => a.t.req.length - b.t.req.length || a.t.id.localeCompare(b.t.id));
    else if (!r.qt.length) list.sort((a, b) => a.t.id.localeCompare(b.t.id));
    return { list, approx: r.approx, qt: r.qt };
  }

  /* ------------------------------------------------------------------
     Render: chips, tarjetas
  ------------------------------------------------------------------ */
  function renderChips() {
    const base = search(state.q).list.filter(({ t }) => simpOk(t) &&
      (!state.costo || (state.costo === 'con' ? !!t.costo : !t.costo)) &&
      (!state.quien || t.quien.some(g => g.roles.includes(state.quien))) &&
      (state.req === '' || t.req.some(r => REQ_GROUPS[+state.req][1].test(r.n))));
    const count = c => base.filter(({ t }) => !c || t.cat === c).length;
    $('#catChips').innerHTML = ['', ...CATS].map(c =>
      `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${state.cat === c}">${esc(c || 'Todas')} <b>${count(c)}</b></button>`).join('');
  }
  function absHit(t) {
    const q = norm(state.q).replace(/[^a-z0-9]/g, '');
    if (q.length < 8 || !t.abs) return '';
    const h = t.abs.find(a => norm(a).replace(/[^a-z0-9]/g, '').includes(q));
    return h ? `<p class="card__abs">La homoclave anterior ${esc(h)} se unificó en este trámite.</p>` : '';
  }
  function cardHTML(t, qt, i) {
    const c = fmtCosto(t);
    return `<article class="card" style="animation-delay:${Math.min(i, 12) * 35}ms">
      <div class="card__top"><span class="pill">${hl(t.id, qt)}</span><span class="card__cat">${esc(t.cat)}</span></div>
      ${badgeSimp(t)}${absHit(t)}
      <h3><button type="button" data-open="${esc(t.id)}" aria-label="${esc(t.titulo)}. Ver ficha">${hl(t.titulo, qt)}</button></h3>
      <p class="card__desc">${hl(t.descripcion, qt)}</p>
      <div class="meta">
        <span title="Tiempo de respuesta">${ICON.clock}${esc(t.tiempo)}</span>
        <span title="Costo">${ICON.coin}${c.none ? 'Costo no indicado' : esc(c.main)}</span>
        <span title="Requisitos">${ICON.list}${reqCount(t)}</span>
      </div>
      <div class="card__go"><span>Ver requisitos</span><span aria-hidden="true">›</span></div>
    </article>`;
  }
  function render() {
    const { list, approx, qt } = applyFilters();
    renderChips();
    $('#grid').innerHTML = list.map(({ t }, i) => cardHTML(t, qt, i)).join('');
    const empty = !list.length;
    $('#empty').hidden = !empty; $('#grid').hidden = empty;
    const active = state.q || state.cat || state.costo || state.quien || state.req !== '' || state.simp;
    $('#clearBtn').hidden = !active;
    let msg = `Mostrando <strong>${list.length}</strong> de ${DATA.length} trámites`;
    if (state.q) msg += ` para «${esc(state.q)}»`;
    if (state.req !== '') msg += ` que piden «${esc(REQ_GROUPS[+state.req][0])}»`;
    if (state.simp) msg += state.simp === 'si' ? ' · solo trámites simplificados' : ' · sin cambios por los acuerdos de simplificación';
    if (approx && !empty) msg += ' · <em>resultados aproximados</em>';
    $('#count').innerHTML = msg;
    if (empty) {
      const dm = didYouMean(state.q);
      $('#didYou').innerHTML = dm
        ? `¿Quisiste decir <button type="button" data-search="${esc(dm)}">${esc(dm)}</button>?`
        : 'Prueba con otras palabras, una homoclave (por ejemplo RAN-04-014) o quita algún filtro.';
    }
    $('#q').value !== state.q && ($('#q').value = state.q);
    $('#fCosto').value = state.costo; $('#fQuien').value = state.quien; $('#fOrden').value = state.orden; $('#fSimp').value = state.simp;
    writeUrl();
  }
  function setState(patch, scroll) {
    Object.assign(state, patch); render();
    if (scroll) $('#catalogo').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  /* ------------------------------------------------------------------
     Buscador con sugerencias (combobox)
  ------------------------------------------------------------------ */
  const qi = $('#q'), sg = $('#sugg');
  let sel = -1, sItems = [];
  function showSugg() {
    const q = qi.value.trim();
    if (q.length < 2) return hideSugg();
    const r = search(q);
    sItems = r.list.slice(0, 6).map(x => x.t);
    let html = `<li role="option" id="sg-all" data-act="all" class="s-all">Buscar «${esc(q)}» en el catálogo · ${r.list.length} resultado${r.list.length === 1 ? '' : 's'}</li>`;
    html += sItems.map((t, i) => `<li role="option" id="sg-${i}" data-id="${esc(t.id)}"><span class="pill">${esc(t.id)}</span><span class="s-title">${hl(t.titulo, r.qt)}<span class="s-cat">${esc(t.cat)}${t.simp ? ' · Trámite simplificado · DOF ' + t.simp.dof : ''}</span></span></li>`).join('');
    sg.innerHTML = html; sg.hidden = false; qi.setAttribute('aria-expanded', 'true'); sel = -1;
  }
  function hideSugg() { sg.hidden = true; qi.setAttribute('aria-expanded', 'false'); qi.removeAttribute('aria-activedescendant'); sel = -1; }
  function moveSel(d) {
    const items = $$('li', sg); if (!items.length) return;
    sel = (sel + d + items.length) % items.length;
    items.forEach((el, i) => el.setAttribute('aria-selected', i === sel));
    qi.setAttribute('aria-activedescendant', items[sel].id);
    items[sel].scrollIntoView({ block: 'nearest' });
  }
  let debounce;
  qi.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.q = qi.value.trim(); render(); }, 140);
    showSugg();
  });
  qi.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (sg.hidden) showSugg(); moveSel(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
    else if (e.key === 'Escape') { if (!sg.hidden) { e.preventDefault(); hideSugg(); } }
    else if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); activateSugg($$('li', sg)[sel]); }
  });
  qi.addEventListener('focus', () => { if (qi.value.trim().length >= 2) showSugg(); });
  document.addEventListener('click', e => { if (!e.target.closest('.search')) hideSugg(); });
  sg.addEventListener('mousedown', e => e.preventDefault());
  sg.addEventListener('click', e => { const li = e.target.closest('li'); if (li) activateSugg(li); });
  function activateSugg(li) {
    hideSugg();
    if (li.dataset.id) openFicha(li.dataset.id);
    else setState({ q: qi.value.trim(), req: '' }, true);
  }
  $('#searchForm').addEventListener('submit', e => {
    e.preventDefault(); clearTimeout(debounce); hideSugg();
    setState({ q: qi.value.trim(), req: '' }, true);
  });
  function runSearch(q) { qi.value = q; hideSugg(); setState({ q, cat: '', req: '' }, true); }

  /* ------------------------------------------------------------------
     Página: accesos rápidos y eventos
  ------------------------------------------------------------------ */
  const TOP10 = ['RAN-04-051', 'RAN-04-016', 'RAN-04-048', 'RAN-04-011', 'RAN-04-020', 'RAN-04-049', 'RAN-04-057', 'RAN-04-015', 'RAN-04-019', 'RAN-04-045'];
  function initHome() {
    $('#topList').innerHTML = TOP10.map(id => DATA.find(t => t.id === id)).filter(Boolean).map((t, i) => {
      const c = fmtCosto(t);
      return `<li><button type="button" class="top__item" data-open="${esc(t.id)}">
        <span class="top__rank" aria-hidden="true">${i + 1}</span>
        <span class="top__txt"><span class="top__id">${esc(t.id)}${t.simp ? `<span class="mini-simp">Trámite simplificado · DOF ${t.simp.dof}</span>` : ''}</span><span class="top__name">${esc(t.titulo)}</span>
        <span class="top__meta">${esc(t.tiempo)} · ${c.none ? 'Costo no indicado' : esc(c.main)}</span></span>
        <span class="top__go" aria-hidden="true">›</span></button></li>`;
    }).join('');
    $('#nAll').textContent = DATA.length;
    $('#nCost').textContent = DATA.filter(t => t.costo).length;
    $('#relevList').innerHTML = REQ_GROUPS.map(([l, re], i) => {
      const n = DATA.filter(t => t.req.some(r => re.test(r.n))).length;
      return `<li><button type="button" data-req="${i}"><span>${esc(l)}</span><small>${n} trámites</small></button></li>`;
    }).join('');
  }
  document.addEventListener('click', e => {
    const s = e.target.closest('[data-search]'); if (s) { runSearch(s.dataset.search); return; }
    const rq = e.target.closest('[data-req]'); if (rq) { qi.value = ''; setState({ q: '', cat: '', req: rq.dataset.req }, true); return; }
    const o = e.target.closest('[data-open]'); if (o) { openFicha(o.dataset.open); return; }
    const c = e.target.closest('.chip'); if (c) { setState({ cat: c.dataset.cat }); return; }
  });
  $('#tileAll').addEventListener('click', () => { qi.value = ''; setState({ q: '', cat: '', costo: '', quien: '', req: '' }, true); });
  $('#tileCost').addEventListener('click', () => { qi.value = ''; setState({ q: '', cat: '', costo: 'con', quien: '', req: '' }, true); });
  $('#fCosto').addEventListener('change', e => setState({ costo: e.target.value }));
  $('#fQuien').addEventListener('change', e => setState({ quien: e.target.value }));
  $('#fOrden').addEventListener('change', e => setState({ orden: e.target.value }));
  $('#fSimp').addEventListener('change', e => setState({ simp: e.target.value }));
  const clearAll = () => { qi.value = ''; setState({ q: '', cat: '', costo: '', quien: '', orden: 'rel', req: '', simp: '' }); };
  $('#clearBtn').addEventListener('click', clearAll);
  $('#emptyClear').addEventListener('click', clearAll);
  $('#navSearch').addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); qi.focus({ preventScroll: true }); });
  const menuBtn = $('#menuBtn'), nav = $('#nav');
  menuBtn.addEventListener('click', () => { const o = nav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', o); });
  nav.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); } });

  /* ------------------------------------------------------------------
     Ficha del trámite
  ------------------------------------------------------------------ */
  const dlg = $('#ficha');
  let cur = null, opener = null;

  function openFicha(id, fromHash) {
    const t = DATA.find(x => x.id === id); if (!t) return;
    cur = t; opener = document.activeElement;
    $('#fId').textContent = t.id; $('#fCat').textContent = t.cat;
    $('#fTitle').textContent = t.titulo; $('#fDesc').textContent = t.descripcion;
    const est = t.simp ? estadoAdec(t) : null;
    $('#fBadges').innerHTML = t.simp ? badgeSimp(t, 'simp-badge--head') + `<span class="adec ${est.trans ? 'adec--done' : 'adec--run'}">${esc(est.label)}</span>` : '';
    $('#fBadges').hidden = !t.simp;
    const c = fmtCosto(t);
    $('#sCosto').innerHTML = c.none ? 'No indicado' : esc(c.main) + (c.sub ? `<br><small style="font-weight:600;font-size:.8rem;opacity:.85">${esc(c.sub)}</small>` : '') + (t.aviso ? '<br><small class="s-warn">Tarifa por verificar</small>' : '');
    $('#sVig').textContent = t.vigencia; $('#sTiempo').textContent = t.tiempo; $('#sMod').textContent = t.modalidad;
    $('#sOficial').href = t.url; $('#sUnit').textContent = t.unidad;
    renderReqs(); renderPasos(); renderPago(); renderInfo(); renderSimp();
    selectTab('req', false);
    if (!dlg.open) { dlg.showModal(); document.body.classList.add('lock'); }
    $('.ficha__body', dlg).scrollTop = 0;
    if (!fromHash) history.replaceState(null, '', location.pathname + location.search + '#/' + id);
  }
  function closeFicha() { if (dlg.open) dlg.close(); }
  dlg.addEventListener('close', () => {
    document.body.classList.remove('lock'); cur = null;
    history.replaceState(null, '', location.pathname + location.search);
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
  });
  dlg.addEventListener('click', e => { if (e.target === dlg) closeFicha(); });
  $('#fClose').addEventListener('click', closeFicha);

  function selectTab(name, focus) {
    $$('[role=tab]', dlg).forEach(b => {
      const on = b.id === 'tab-' + name;
      b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1;
      $('#' + b.getAttribute('aria-controls')).hidden = !on;
      if (on && focus) b.focus();
    });
  }
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('[role=tab]'); if (b) selectTab(b.id.slice(4), false); });
  $('#tabs').addEventListener('keydown', e => {
    const tabs = $$('[role=tab]', dlg); let i = tabs.findIndex(b => b.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowRight') i = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') i = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') i = 0; else if (e.key === 'End') i = tabs.length - 1; else return;
    e.preventDefault(); selectTab(tabs[i].id.slice(4), true);
  });

  /* --- Requisitos --- */
  function renderReqs() {
    const t = cur, n = t.req.length;
    const gen = t.req.map((r, i) => i).filter(i => !t.req[i].cond), con = t.req.map((r, i) => i).filter(i => t.req[i].cond);
    const pos = {}; gen.concat(con).forEach((i, k) => { pos[i] = k + 1; });
    const build = (r, i) => {
      const entrega = r.t ? (r.t === 'cotejo' ? 'Para cotejo' : 'Entregar') : '';
      const cond = r.cond ? '<span class="badge badge--k">En su caso</span>' : '';
      const orig = r.o === 'Sí' ? '<span class="badge badge--o">Original</span>' : '';
      const cop = /^\d+$/.test(r.c) ? `<span class="badge badge--c">${r.c} copia${r.c === '1' ? '' : 's'}</span>` : '';
      const showDet = r.d && norm(r.d).replace(/\W/g, '') !== norm(r.n).replace(/\W/g, '');
      return `<li class="req">
        <span class="req__num" aria-hidden="true">${pos[i]}</span>
        <div class="req__main">
          <div class="req__name"><span class="sr">Requisito ${pos[i]}: </span>${esc(sentence(r.n))}</div>
          ${(orig || cop || entrega || cond) ? `<div class="badges">${cond}${orig}${cop}${entrega ? `<span class="badge">${entrega}</span>` : ''}</div>` : ''}
          ${showDet ? `<button type="button" class="req__more" aria-expanded="false" aria-controls="det-${i}">Ver detalle ${ICON.chev}</button><div class="req__det" id="det-${i}" hidden>${esc(sentence(r.d))}</div>` : ''}
        </div>
      </li>`;
    };
    const list = ids => `<ol class="reqs">${ids.map(i => build(t.req[i], i)).join('')}</ol>`;
    if (!con.length) {
      $('#p-req').innerHTML = `<h3>${n} ${n === 1 ? 'documento que debes presentar' : 'documentos que debes presentar'}</h3>${list(gen)}`;
    } else {
      const g = gen.length, c = con.length;
      $('#p-req').innerHTML = `
        <h3>${g} ${g === 1 ? 'documento general' : 'documentos generales'} y ${c} ${c === 1 ? 'que aplica' : 'que aplican'} solo en su caso</h3>
        ${list(gen)}
        <h4 class="reqs-sub">Solo si aplican a tu caso</h4>
        <p class="muted reqs-note">Estos documentos no se piden en todos los casos. Depende del tipo de organización o del acto que vas a inscribir; consulta cada detalle.</p>
        ${list(con)}`;
    }
  }
  $('#p-req').addEventListener('click', e => {
    const more = e.target.closest('.req__more'); if (!more) return;
    const open = more.getAttribute('aria-expanded') === 'true';
    more.setAttribute('aria-expanded', !open); $('#' + more.getAttribute('aria-controls')).hidden = open;
  });

  /* --- Pasos --- */
  function renderPasos() {
    const t = cur;
    let html = `<h3>Modalidad: ${esc(t.modalidad)}</h3>`;
    if (t.pasos.length) {
      html += `<ol class="steps">` +
        t.pasos.map(cleanStep).map((p, i) => `<li class="step"><span class="step__n" aria-hidden="true">${i + 1}</span><span class="step__t"><span class="sr">Paso ${i + 1}: </span>${esc(p)}</span></li>`).join('') + '</ol>';
    } else html += '<p class="note">La ficha oficial de este trámite no enumera los pasos. Consulta la ficha en gob.mx o acude a la oficina de representación del Registro Agrario Nacional.</p>';
    $('#p-pasos').innerHTML = html;
  }

  /* --- Costo y pago --- */
  function renderPago() {
    const t = cur, c = fmtCosto(t), p = t.pago;
    let html = c.none
      ? '<h3>Costo</h3><p class="note">La ficha oficial no muestra el costo de este trámite. Confírmalo en la oficina de representación o en la ficha de gob.mx.</p>'
      : `<div class="amount"><small>${esc(c.sub || 'Costo del trámite')}</small>${esc(c.main)}</div>`;
    if (t.aviso) html += `<p class="warn" role="note"><strong>Verifica la tarifa.</strong> ${esc(t.aviso)}</p>`;
    if (p) {
      const rows = [];
      if (p['El monto es']) rows.push(['Tipo de monto', p['El monto es']]);
      if (p['Monto inicial']) rows.push(['Monto inicial', p['Monto inicial'] + ' MXN']);
      if (p['Monto final']) rows.push(['Monto final', p['Monto final'] + ' MXN']);
      if (p['Fórmula con la que se calcula el pago']) rows.push(['Cómo se calcula', p['Fórmula con la que se calcula el pago'].replace(/\s+-\s+/g, '\n• ').replace(/^-\s*/, '• ').replace(/(Constancias|Listado)/g, (m, g, off, s) => off ? '\n' + g : g)]);
      if (p['Momento en el que se debe realizar el pago']) rows.push(['¿Cuándo pagar?', p['Momento en el que se debe realizar el pago']]);
      if (p['Realiza tu pago en']) rows.push(['¿Dónde pagar?', p['Realiza tu pago en']]);
      if (rows.length) html += `<dl class="kv">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
    }
    html += `<p class="muted">Vigencia del documento o resolución: <strong>${esc(t.vigencia)}</strong></p>`;
    $('#p-pago').innerHTML = html;
  }

  /* --- Más información --- */
  function renderInfo() {
    const t = cur; let html = '';
    if (t.nota) html += `<p class="note">${esc(t.nota)}</p>`;
    if (t.quien.length) {
      html += '<h3>¿Quién puede solicitarlo?</h3>' + t.quien.map(g =>
        `<div class="who"><div class="roles">${g.roles.map(r => `<span class="role">${esc(r)}</span>`).join('')}</div><p>${esc(g.d)}</p></div>`).join('');
    }
    if (t.formatos.length) html += '<h3>Formatos</h3><div class="roles">' + t.formatos.map(f => `<span class="fmt">${ICON.doc}${esc(f)}</span>`).join('') + '</div><p class="muted">Descarga el formato desde la ficha oficial.</p>';
    html += `<h3>Dependencia</h3><dl class="kv"><div><dt>Registro Agrario Nacional</dt><dd>${esc(t.unidad)}</dd></div><div><dt>Homoclave</dt><dd>${esc(t.id)}</dd></div></dl>`;
    $('#p-info').innerHTML = html;
  }

  /* --- Información importante sobre la simplificación --- */
  function renderSimp() {
    const t = cur, sec = $('#simpSec');
    if (!t.simp) { sec.hidden = true; sec.innerHTML = ''; return; }
    const e = estadoAdec(t), s = t.simp;
    const notes = s.notas.map(n => `<li class="sn sn--${n.k}"><span class="sn__tag">${esc(NOTE_TAG[n.k] || 'Importante')}</span><p>${esc(n.t)}</p></li>`).join('');
    const abs = t.abs ? `<div class="sn-abs"><b>Homoclaves anteriores unificadas en este trámite:</b> ${t.abs.map(esc).join(', ')}. Sus servicios continúan disponibles en esta ficha.</div>` : '';
    sec.innerHTML = `
      <h3>Información importante sobre la simplificación</h3>
      <ul class="sn-list">${notes}</ul>
      ${abs}
      <details class="adec-box">
        <summary>Estado del plazo de adecuaciones internas del RAN <span class="adec ${e.trans ? 'adec--done' : 'adec--run'}">${esc(e.label)}</span></summary>
        <dl class="kv">
          <div><dt>Acuerdo publicado en el DOF</dt><dd>${esc(s.dof)} · <a href="${e.a.url}" target="_blank" rel="noopener">Ver acuerdo<span class="sr"> (se abre en otra pestaña)</span></a></dd></div>
          <div><dt>Entrada en vigor</dt><dd>${esc(e.a.vigor)}</dd></div>
          <div><dt>Plazo para adecuaciones internas</dt><dd>${esc(e.a.plazo)}${e.a.nota ? ' (' + esc(e.a.nota) + ')' : ''}</dd></div>
        </dl>
        <p class="muted">${e.a.aniversario ? '' : 'El acuerdo cuenta el plazo desde su entrada en vigor; esta ficha no publica una fecha exacta de término. '}Este indicador se refiere solo al plazo legal que el acuerdo da al RAN para sus adecuaciones internas; no mide el avance real de su implementación. Las simplificaciones están en vigor desde la fecha indicada.</p>
      </details>
      <p class="muted">Las solicitudes presentadas antes de la publicación del acuerdo se rigen por la norma vigente al momento de presentarse. El RAN no debe solicitar copias simples ni documentos que ya obren en sus archivos, salvo los anexos expresamente previstos.</p>`;
    sec.hidden = false;
  }

  /* --- Acciones laterales --- */
  function listText() {
    const t = cur;
    const L = [`${t.id} — ${t.titulo}`, `Registro Agrario Nacional · ${t.unidad}`, '', 'REQUISITOS'];
    t.req.forEach((r, i) => {
      const tg = [r.cond ? 'en su caso' : '', r.o === 'Sí' ? 'original' : '', /^\d+$/.test(r.c || '') ? r.c + ' copia' + (r.c === '1' ? '' : 's') : '', r.t === 'cotejo' ? 'para cotejo' : ''].filter(Boolean).join(', ');
      L.push(`${i + 1}. ${sentence(r.n)}${tg ? '  (' + tg + ')' : ''}`);
    });
    if (t.pasos.length) { L.push('', 'PASOS'); t.pasos.map(cleanStep).forEach((p, i) => L.push(`${i + 1}. ${p}`)); }
    const c = fmtCosto(t);
    L.push('', `Costo: ${c.none ? 'no indicado en la ficha' : c.main}`, `Tiempo de respuesta: ${t.tiempo}`, `Ficha oficial: ${t.url}`);
    return L.join('\n');
  }
  function waText() {
    const t = cur, c = fmtCosto(t), cp = r => /^\d+$/.test(r.c || '') ? `${r.c} copia${r.c === '1' ? '' : 's'}` : '';
    const L = [`📋 *Requisitos: ${t.titulo}*`, `_${t.id} · Registro Agrario Nacional${t.simp ? ' · Trámite simplificado (DOF ' + t.simp.dof + ')' : ''}_`, '', (t.req.some(r => r.cond) ? '*Documentos generales y los que aplican en su caso:*' : '*Documentos que debes llevar:*'), ''];
    t.req.forEach((r, i) => {
      const tags = [r.cond ? 'En su caso' : '', r.o === 'Sí' ? 'Original' : '', cp(r), r.t === 'cotejo' ? 'Para cotejo' : ''].filter(Boolean).join(' · ');
      L.push(`⬜ *${i + 1}.* ${sentence(r.n)}${tags ? ` _(${tags})_` : ''}`);
      if (r.d && norm(r.d).replace(/\W/g, '') !== norm(r.n).replace(/\W/g, '')) L.push(`      ${sentence(r.d)}`);
    });
    const imp = t.simp ? t.simp.notas.filter(n => n.k === 'cond' || n.k === 'post') : [];
    if (imp.length) { L.push('', '*Importante:*'); imp.forEach(n => L.push(`ℹ️ ${n.t}`)); }
    if (t.pasos.length) { L.push('', '*Cómo realizarlo:*', ''); t.pasos.map(cleanStep).forEach((p, i) => L.push(`${i + 1}️⃣ ${p}`)); }
    L.push('', `💰 *Costo:* ${c.none ? 'No indicado en la ficha' : c.main + (c.sub ? ' (' + c.sub.toLowerCase() + ')' : '')}`, `⏱️ *Tiempo de respuesta:* ${t.tiempo}`);
    if (t.nota) L.push('', `⚠️ ${sentence(t.nota)}`);
    if (t.aviso) L.push('', `⚠️ ${t.aviso}`);
    L.push('', `🔗 Ficha oficial: ${t.url}`);
    return L.join('\n');
  }
  const INF = { 'reúne': 'Reunir', 'reune': 'Reunir', 'acude': 'Acudir', 'llena': 'Llenar', 'recibe': 'Recibir', 'entrega': 'Entregar', 'presenta': 'Presentar', 'realiza': 'Realizar' };
  const formal = s => String(s).replace(/\bTe (permite|sirve)\b/g, (m, v) => 'Permite').replace(/\btu\b/gi, m => m[0] === 'T' ? 'Su' : 'su').replace(/\btus\b/gi, 'sus')
    .replace(/\bLlenar la el\b/i, 'Llenar el').replace(/\bsu solicitud\b/g, 'la solicitud').replace(/\bsu número\b/g, 'el número').replace(/^(\p{L}+)/u, (w) => INF[w.toLowerCase()] || w)
    .replace(/(\s|^)y (llena|entrega)\b/g, (m, a, v) => a + 'y ' + (INF[v] || v).toLowerCase());
  function resumenText() {
    const t = cur, c = fmtCosto(t);
    const tiempo = /inmediat/i.test(t.tiempo) ? 'inmediato' : /no especificado/i.test(t.tiempo) ? '' : t.tiempo.toLowerCase();
    const parts = [];
    if (!c.none) parts.push(`un costo de ${c.main}${t.aviso ? ' (tarifa sujeta a confirmación en la oficina)' : ''}`);
    if (tiempo) parts.push(`un tiempo de respuesta de referencia ${tiempo === 'inmediato' ? 'inmediato' : 'de ' + tiempo}`);
    const extra = parts.length ? ', con ' + parts.join(' y ') : '';
    const simp = t.simp ? `Es un trámite simplificado (DOF ${t.simp.dof}).${t.req.some(r => r.cond) ? ' Algunos documentos aplican solo en ciertos casos.' : ''} ` : '';
    return `Buen día. El trámite «${t.titulo.replace(/\.$/, '')}» (${t.id}) se realiza de manera ${t.modalidad.toLowerCase()} en la oficina de representación del Registro Agrario Nacional${extra}. ${simp}Los requisitos y plazos pueden variar según cada caso.\n\nMás información en: ${t.url}`;
  }
  $('#sResumen').addEventListener('click', async () => {
    if (cur) toast((await copy(resumenText())) ? 'Resumen copiado. Pégalo en tu respuesta' : 'No se pudo copiar');
  });
  $('#sWa').addEventListener('click', async () => {
    if (cur) toast((await copy(waText())) ? 'Requisitos copiados. Pégalos en WhatsApp o en tus notas' : 'No se pudo copiar');
  });
  $('#sDown').addEventListener('click', () => {
    if (!cur) return;
    const blob = new Blob([listText()], { type: 'text/plain;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `requisitos-${cur.id}.txt` });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Lista descargada');
  });
  $('#sShare').addEventListener('click', async () => {
    if (!cur) return;
    const url = location.origin + location.pathname + '#/' + cur.id;
    if (navigator.share) { try { await navigator.share({ title: cur.titulo, text: `${cur.id} · ${cur.titulo}`, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    toast((await copy(url)) ? 'Enlace copiado' : 'No se pudo copiar el enlace');
  });
  $('#sPrint').addEventListener('click', () => window.print());

  /* ------------------------------------------------------------------
     Arranque
  ------------------------------------------------------------------ */
  const ABS_MAP = {};
  DATA.forEach(t => (t.abs || []).forEach(a => { ABS_MAP[a] = t.id; }));
  function routeHash() {
    const m = /^#\/(RAN-\d\d-\d{3}(?:-[A-C])?)$/i.exec(location.hash);
    if (m) {
      const id = m[1].toUpperCase(), target = ABS_MAP[id];
      if (target) { history.replaceState(null, '', location.pathname + location.search + '#/' + target); openFicha(target, true); toast(`La homoclave ${id} se unificó en ${target}`); }
      else openFicha(id, true);
    } else if (dlg.open) closeFicha();
  }
  window.addEventListener('hashchange', routeHash);
  const toTop = $('#toTop');
  const onScroll = () => toTop.classList.toggle('show', window.scrollY > 500);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' }));
  readUrl(); initHome(); render(); routeHash();
  if (state.q && !location.hash) { /* búsqueda compartida por enlace */ }
})();

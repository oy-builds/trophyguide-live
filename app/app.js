/* Leonida Legend — trophy guide & tracker.
   Vanilla JS, no libraries, no network beyond this app's own data file.
   Progress lives in localStorage and can be exported / imported as JSON. */
'use strict';

var STORAGE_KEY = 'leonida-legend-progress-v1';

var GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
var GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

var STAGES = [
  { n: 1, title: 'Opening Hours', blurb: 'The prologue and Chapter 1. Learn the controls, take the quiet Ocean Beach moment early, and let the first story trophies land.' },
  { n: 2, title: 'Building the Story', blurb: 'Chapters 2 and 3 plus the campaign missions they carry. Sample every activity type once while the map is still opening up.' },
  { n: 3, title: 'The Long Middle', blurb: 'Chapter 4, the later missions and every stranger strand. This is where the choice-, partner- and moment-sensitive trophies live — clear them before the finale.' },
  { n: 4, title: 'The Finale', blurb: 'The final mission, and nothing else. Everything that a point of no return could lock away should already be done.' },
  { n: 5, title: 'The Cleanup', blurb: 'Free-roam Leonida: collectibles, stunt and race counters, robberies, spending and exploration, the 100% completion push, and finally the platinum itself.' }
];

var state = loadState();
var trophies = [];
var selectedId = null;
var activeView = 'checklist';
var kindFilter = 'all';
var gradeFilter = 'all';

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          earned: parsed.earned || {},
          counts: parsed.counts || {},
          spoilers: !!parsed.spoilers
        };
      }
    }
  } catch (err) { /* corrupted storage falls through to a fresh state */ }
  return { earned: {}, counts: {}, spoilers: false };
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (err) { /* storage full/blocked: app keeps working in memory */ }
}

function el(id) { return document.getElementById(id); }

function isEarned(t) { return !!state.earned[t.id]; }

function isShielded(t) {
  /* Spoiler shield: a hidden trophy stays behind the shield until the user
     turns spoilers on or the trophy itself has been earned. */
  return t.hidden && !state.spoilers && !isEarned(t);
}

function kindMatches(t) {
  if (kindFilter === 'all') return true;
  if (kindFilter === 'missable') return !!t.missable;
  return t.kind === kindFilter;
}

function gradeMatches(t) {
  return gradeFilter === 'all' || t.grade === gradeFilter;
}

function searchMatches(t) {
  var q = el('search').value.trim().toLowerCase();
  if (!q) return true;
  return t.name.toLowerCase().indexOf(q) !== -1 || t.description.toLowerCase().indexOf(q) !== -1;
}

function visibleTrophies() {
  return trophies.filter(function (t) { return kindMatches(t) && gradeMatches(t) && searchMatches(t); });
}

function gradeTotals() {
  var totals = {};
  GRADE_ORDER.forEach(function (g) { totals[g] = { earned: 0, total: 0 }; });
  trophies.forEach(function (t) {
    totals[t.grade].total += 1;
    if (isEarned(t)) totals[t.grade].earned += 1;
  });
  return totals;
}

function renderProgress() {
  var earned = trophies.filter(isEarned).length;
  var pct = trophies.length ? Math.round((earned / trophies.length) * 100) : 0;
  el('progress-pct').textContent = pct + '%';
  el('progress-count').textContent = earned + ' / ' + trophies.length + ' earned';
  el('progress-bar').style.width = pct + '%';
  var totals = gradeTotals();
  el('grade-counts').innerHTML = GRADE_ORDER.map(function (g) {
    return '<span>' + GRADE_LABEL[g] + ' <b>' + totals[g].earned + '/' + totals[g].total + '</b></span>';
  }).join('');
}

function tagsHtml(t) {
  var tags = '<span class="tag kind">' + t.kind + '</span>' +
    '<span class="tag">' + GRADE_LABEL[t.grade] + '</span>' +
    '<span class="tag stage">Stage ' + t.stage + '</span>';
  if (t.countLabel) tags += '<span class="tag">' + t.countLabel + '</span>';
  if (t.missable) tags += '<span class="tag missable">Missable?</span>';
  if (t.hidden) tags += '<span class="tag">Hidden</span>';
  return tags;
}

function tagRow(t) {
  return '<div class="meta">' + tagsHtml(t) + '</div>';
}

function counterRow(t) {
  if (typeof t.count !== 'number') return '';
  var now = state.counts[t.id] || 0;
  return '<label class="count-row">Progress ' +
    '<input type="number" min="0" max="' + t.count + '" step="1" value="' + now + '" data-count-for="' + t.id + '" aria-label="Progress count for ' + t.name + '">' +
    ' / ' + t.count.toLocaleString('en-US') + '</label>';
}

function cardHtml(t) {
  var shielded = isShielded(t);
  var name = shielded ? 'Hidden Trophy' : t.name;
  var desc = shielded ? 'This trophy is hidden on PlayStation. Reveal hidden trophies or earn it to see its name and description.' : t.description;
  var html = '<article class="card grade-' + t.grade + (isEarned(t) ? ' is-earned' : '') + (selectedId === t.id ? ' is-selected' : '') + (shielded ? ' shielded' : '') + '" data-open="' + t.id + '" tabindex="0" role="button" aria-label="Open guide for ' + name + '">';
  html += '<div class="card-top"><span class="diamond" aria-hidden="true"></span><div>' +
    '<h3>' + name + '</h3>' +
    '<p class="desc">' + desc + '</p></div></div>';
  html += tagRow(t);
  if (shielded) html += '<p class="shield-note">Behind the spoiler shield.</p>';
  html += '<label class="earned-toggle"><input type="checkbox" data-earned-for="' + t.id + '"' + (isEarned(t) ? ' checked' : '') + '> Earned</label>';
  html += counterRow(t);
  html += '</article>';
  return html;
}

function renderChecklist() {
  var list = visibleTrophies();
  el('cards').innerHTML = list.map(cardHtml).join('');
  el('result-line').textContent = 'Showing ' + list.length + ' of ' + trophies.length + ' trophies.';
  var empty = el('empty-line');
  if (list.length === 0) {
    empty.hidden = false;
    empty.textContent = kindFilter === 'online'
      ? 'The official PlayStation 5 list for this game contains no online trophies, so this filter is empty by design.'
      : 'No trophies match the current search and filters.';
  } else {
    empty.hidden = true;
  }
}

function renderRoadmap() {
  el('stages').innerHTML = STAGES.map(function (stage) {
    var inStage = trophies.filter(function (t) { return t.stage === stage.n; });
    var done = inStage.filter(isEarned).length;
    var items = inStage.map(function (t) {
      var label = isShielded(t) ? 'Hidden Trophy (' + GRADE_LABEL[t.grade] + ')' : t.name;
      return '<li class="' + (isEarned(t) ? 'done' : '') + '" data-open="' + t.id + '">' + label + ' — ' + GRADE_LABEL[t.grade] + (t.missable ? ' · missable?' : '') + '</li>';
    }).join('');
    return '<section class="stage-block"><h3><span class="stage-no">Stage ' + stage.n + '</span> · ' + stage.title +
      ' <span class="stage-progress">' + done + '/' + inStage.length + ' earned</span></h3>' +
      '<p class="stage-blurb">' + stage.blurb + '</p><ul>' + items + '</ul></section>';
  }).join('');
}

function renderMissables() {
  var flagged = trophies.filter(function (t) { return t.missable; });
  el('missable-cards').innerHTML = flagged.map(cardHtml).join('');
  el('missable-badge').textContent = flagged.length;
}

function renderGuide(t) {
  var panel = el('guide-panel');
  if (!t) {
    panel.innerHTML = '<p class="guide-hint">Select a trophy to read its guide. Every guide is written from the official description and names its sources.</p>';
    return;
  }
  if (isShielded(t)) {
    panel.innerHTML = '<h2>Hidden Trophy</h2><p class="official-desc">Behind the spoiler shield.</p>' +
      '<p>This trophy is hidden on PlayStation until earned. Turn on <strong>Reveal hidden trophies</strong> above, or mark it earned, to read its guide.</p>' +
      '<h4>Grade</h4><p>' + GRADE_LABEL[t.grade] + ' · Roadmap stage ' + t.stage + '</p>';
    return;
  }
  var html = '<h2>' + t.name + '</h2><p class="official-desc">“' + t.description + '”</p>';
  html += '<div class="meta">' + tagsHtml(t) + '</div>';
  html += '<h4>Guide</h4><p>' + t.guide + '</p>';
  if (t.missable && t.missableNote) html += '<h4>Missable?</h4><p class="missable-note">' + t.missableNote + '</p>';
  if (t.countLabel) html += '<h4>Target</h4><p>' + t.countLabel + (typeof t.count === 'number' ? ' — track your count on the trophy card.' : '.') + '</p>';
  html += '<h4>Sources</h4><ul class="sources">' + t.sources.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>';
  html += '<h4>Roadmap</h4><p>Stage ' + t.stage + ' — ' + STAGES[t.stage - 1].title + '</p>';
  panel.innerHTML = html;
}

function renderAll() {
  renderProgress();
  renderChecklist();
  renderRoadmap();
  renderMissables();
  var selected = trophies.filter(function (t) { return t.id === selectedId; })[0] || null;
  renderGuide(selected);
}

function setEarned(id, value) {
  if (value) state.earned[id] = true; else delete state.earned[id];
  saveState();
  renderAll();
}

function setCount(id, value, target) {
  var n = Math.max(0, Math.floor(Number(value) || 0));
  state.counts[id] = n;
  if (typeof target === 'number' && target > 0) {
    if (n >= target) state.earned[id] = true;
    else if (state.earned[id] && n < target) delete state.earned[id];
  }
  saveState();
  renderAll();
}

function openGuide(id) {
  selectedId = id;
  renderAll();
  el('guide-panel').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function switchView(name) {
  activeView = name;
  ['checklist', 'roadmap', 'missables'].forEach(function (v) {
    el('view-' + v).hidden = v !== name;
  });
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.classList.toggle('is-active', tab.getAttribute('data-view') === name);
  });
}

function exportProgress() {
  var payload = JSON.stringify({ app: 'leonida-legend', version: 1, earned: state.earned, counts: state.counts, spoilers: state.spoilers }, null, 2);
  var blob = new Blob([payload], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'leonida-legend-progress.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 500);
}

function importProgress(file) {
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var parsed = JSON.parse(String(reader.result));
      if (!parsed || typeof parsed !== 'object' || typeof parsed.earned !== 'object') throw new Error('shape');
      state = { earned: parsed.earned || {}, counts: parsed.counts || {}, spoilers: !!parsed.spoilers };
      el('spoilers').checked = state.spoilers;
      saveState();
      renderAll();
    } catch (err) {
      el('result-line').textContent = 'That file is not a Leonida Legend progress export — nothing was imported.';
    }
  };
  reader.readAsText(file);
}

function wireEvents() {
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () { switchView(tab.getAttribute('data-view')); });
  });
  el('kind-chips').addEventListener('click', function (ev) {
    var chip = ev.target.closest('[data-kind]');
    if (!chip) return;
    kindFilter = chip.getAttribute('data-kind');
    document.querySelectorAll('#kind-chips .chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
    if (activeView !== 'checklist') switchView('checklist');
    renderChecklist();
  });
  el('grade-chips').addEventListener('click', function (ev) {
    var chip = ev.target.closest('[data-grade]');
    if (!chip) return;
    gradeFilter = chip.getAttribute('data-grade');
    document.querySelectorAll('#grade-chips .chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
    if (activeView !== 'checklist') switchView('checklist');
    renderChecklist();
  });
  el('search').addEventListener('input', function () {
    if (activeView !== 'checklist') switchView('checklist');
    renderChecklist();
  });
  el('spoilers').addEventListener('change', function () {
    state.spoilers = el('spoilers').checked;
    saveState();
    renderAll();
  });
  el('export-btn').addEventListener('click', exportProgress);
  el('import-btn').addEventListener('click', function () { el('import-file').click(); });
  el('import-file').addEventListener('change', function () {
    if (el('import-file').files.length) importProgress(el('import-file').files[0]);
    el('import-file').value = '';
  });
  document.addEventListener('click', function (ev) {
    var earnedBox = ev.target.closest('[data-earned-for]');
    if (earnedBox) { setEarned(Number(earnedBox.getAttribute('data-earned-for')), earnedBox.checked); return; }
    if (ev.target.closest('[data-count-for]')) return;
    var opener = ev.target.closest('[data-open]');
    if (opener) openGuide(Number(opener.getAttribute('data-open')));
  });
  document.addEventListener('change', function (ev) {
    var counter = ev.target.closest('[data-count-for]');
    if (!counter) return;
    var id = Number(counter.getAttribute('data-count-for'));
    var t = trophies.filter(function (x) { return x.id === id; })[0];
    if (t) setCount(id, counter.value, t.count);
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && ev.target.matches && ev.target.matches('[data-open]')) {
      openGuide(Number(ev.target.getAttribute('data-open')));
    }
  });
}

function init() {
  el('spoilers').checked = state.spoilers;
  wireEvents();
  fetch('data/trophies.json')
    .then(function (res) { if (!res.ok) throw new Error('load'); return res.json(); })
    .then(function (data) {
      trophies = Array.isArray(data) ? data : data.trophies;
      renderAll();
    })
    .catch(function () {
      el('result-line').textContent = 'The trophy data file could not be loaded. Serve the app folder over HTTP (for example with the kit’s serve script) rather than opening the page as a file.';
    });
}

document.addEventListener('DOMContentLoaded', init);

/* helpers.dom.js
   DOM/state helpers + kleine UI bouwstenen.
*/

function setByPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = value;
}

function getByPath(obj, path) {
  return path.split(".").reduce((acc, k) => acc?.[k], obj);
}

function showSuggestions(el, html) {
  el.innerHTML = html;
  el.classList.remove("hidden");
}

function hideSuggestions(el) {
  el.classList.add("hidden");
}

function buildHaystack(row, fields) {
  return fields.map((f) => normalize(row[f])).join(" | ");
}

function searchRows(data, query, fields, primaryBoostField = null) {
  const q = normalize(query);
  if (!q || q.length < 2 || !data.length) return [];

  const results = [];
  for (const row of data) {
    const hay = buildHaystack(row, fields);
    let score = 0;

    if (primaryBoostField) {
      const primary = normalize(row[primaryBoostField]);
      if (primary.includes(q)) score += 50;
    }
    if (hay.includes(q)) score += 10;

    // small boosts for exact-ish
    for (const f of fields) {
      if (normalize(row[f]).startsWith(q)) score += 2;
    }

    if (score > 0) results.push({ row, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 12).map((x) => x.row);
}

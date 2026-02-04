/* app.js
   Hoofdbestand
*/

// -----------------------------
// State (YAML keys blijven hetzelfde)
// -----------------------------
const state = {
  customer: "",
  customerRef: "",
  customerContact: "",
  product: "",
  totalParts: 0,
  totalWeightKg: 0,
  totalVolumeCbm: 0,
  goods: [
    {
      parts: 1,
      packing: "",
      weightKg: 0,
      volumeCbm: 0,
      dimsLcm: 0,
      dimsWcm: 0,
      dimsHcm: 0,
      notes: "",
    },
  ],
  pickup: {
    name: "",
    street: "",
    number: "",
    postalCode: "",
    place: "",
    countryCode: "",
    premise: "",
    contactName: "",
    phone: "",
    email: "",
    dateFrom: "",
    dateTo: "",
    instructions: "",
  },
  delivery: {
    name: "",
    street: "",
    number: "",
    postalCode: "",
    place: "",
    countryCode: "",
    premise: "",
    contactName: "",
    phone: "",
    email: "",
    dateFrom: "",
    dateTo: "",
    instructions: "",
  },
};

// -----------------------------
// Data stores
// -----------------------------
let klanten = [];
let producten = [];
let verpakkingen = [];

const klantenStatus = document.getElementById("klantenStatus");
const productenStatus = document.getElementById("productenStatus");
const verpakkingenStatus = document.getElementById("verpakkingenStatus");
const autoLoadStatus = document.getElementById("autoLoadStatus");

// -----------------------------
// Business helpers
// -----------------------------

// Volume: cm^3 -> m^3
function calcVolumeFromDims(l, w, h) {
  const L = Number(l) || 0,
    W = Number(w) || 0,
    H = Number(h) || 0;
  return Number(((L * W * H) / 1_000_000).toFixed(5));
}

function recalcTotals() {
  state.totalParts = state.goods.reduce(
    (s, g) => s + (Number(g.parts) || 0),
    0,
  );
  state.totalWeightKg = Number(
    state.goods.reduce((s, g) => s + (Number(g.weightKg) || 0), 0).toFixed(2),
  );
  state.totalVolumeCbm = Number(
    state.goods.reduce((s, g) => s + (Number(g.volumeCbm) || 0), 0).toFixed(5),
  );

  document.querySelector('[data-path="totalParts"]').value = state.totalParts;
  document.querySelector('[data-path="totalWeightKg"]').value =
    state.totalWeightKg;
  document.querySelector('[data-path="totalVolumeCbm"]').value =
    state.totalVolumeCbm;
}

function buildYamlObject() {
  const obj = JSON.parse(JSON.stringify(state));
  obj.totalParts = Number(obj.totalParts) || 0;
  obj.totalWeightKg = Number(obj.totalWeightKg) || 0;
  obj.totalVolumeCbm = Number(obj.totalVolumeCbm) || 0;

  obj.goods = obj.goods.map((g) => ({
    parts: Number(g.parts) || 0,
    packing: g.packing || "",
    weightKg: Number(g.weightKg) || 0,
    volumeCbm: Number(g.volumeCbm) || 0,
    dimsLcm: Number(g.dimsLcm) || 0,
    dimsWcm: Number(g.dimsWcm) || 0,
    dimsHcm: Number(g.dimsHcm) || 0,
    notes: g.notes || "",
  }));
  return obj;
}

function renderYamlPreview() {
  recalcTotals();
  const yamlText = dumpYaml(buildYamlObject());
  document.getElementById("yamlPreview").value = yamlText;
}

function setDtField(path, yyyymmdd, hhmm) {
  // store in YAML format "YYYY-MM-DD HH:MM"
  const val = `${yyyymmdd} ${hhmm}`;
  setByPath(state, path, val);

  // push to datetime-local input
  const el = document.querySelector(`[data-dt-path="${path}"]`);
  if (el) el.value = yamlToDtLocal(val);
}

// -----------------------------
// CSV load (auto via fetch) — zit erin voor compatibiliteit, maar de init gebruikt dit nu niet.
// -----------------------------
async function loadCsvAuto(filename, requiredCols = null) {
  const res = await fetch(filename, { cache: "no-store" });
  if (!res.ok) throw new Error(`Kan ${filename} niet laden (${res.status})`);
  const text = await res.text();

  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = (parsed.data || []).filter(Boolean);
  const cols = parsed.meta?.fields || [];

  if (requiredCols?.length) {
    const missing = requiredCols.filter((c) => !cols.includes(c));
    if (missing.length)
      throw new Error(`${filename} mist kolommen: ${missing.join(", ")}`);
  }

  return rows;
}

// Manual upload parse
function parseCsvFile(file, requiredCols = null) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        const rows = (parsed.data || []).filter(Boolean);
        const cols = parsed.meta?.fields || [];
        if (requiredCols?.length) {
          const missing = requiredCols.filter((c) => !cols.includes(c));
          if (missing.length)
            return reject(new Error(`Mist kolommen: ${missing.join(", ")}`));
        }
        resolve(rows);
      },
      error: (err) => reject(err),
    });
  });
}

function showAutoLoadNote(msg) {
  autoLoadStatus.classList.remove("hidden");
  autoLoadStatus.innerHTML = `
      <div class="font-semibold text-amber-700">Automatisch laden lukte niet</div>
      <div class="text-slate-700 mt-1">${escapeHtml(msg)}</div>
      <div class="text-xs text-slate-500 mt-2">
        Open via <code>http://localhost</code> (bv. <code>python -m http.server</code>) óf gebruik de fallback uploads.
      </div>
    `;
}

// -----------------------------
// Relatie search UI
// -----------------------------
const relatieSearch = document.getElementById("relatieSearch");
const relatieSuggestions = document.getElementById("relatieSuggestions");
const selectedRelatieCard = document.getElementById("selectedRelatieCard");

const REL_SEARCH_FIELDS = [
  "ComName",
  "ComPerson",
  "ComStreet",
  "ComZip",
  "ComCity",
  "ComCountry",
  "Number",
];

function formatRelSuggestion(row, q) {
  const name = row.ComName || "";
  const city = row.ComCity || "";
  const zip = row.ComZip || "";
  const person = row.ComPerson || "";
  const street = row.ComStreet || "";
  const country = row.ComCountry || "";
  const number = row.Number || "";
  const clientNo = row.ClientNo || "";

  return `
      <button type="button" data-clientno="${escapeHtml(clientNo)}"
        class="w-full text-left px-4 py-4 hover:bg-slate-50 focus:bg-slate-50 outline-none border-b last:border-b-0">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="text-base font-semibold truncate">${highlight(name, q)}</div>
            <div class="text-sm text-slate-700 truncate mt-1">
              ${highlight(zip, q)} ${highlight(city, q)} • ${highlight(street, q)} • ${highlight(country, q)}
            </div>
            <div class="text-sm text-slate-500 truncate mt-1">
              Contact: ${highlight(person, q)} • Nr: ${highlight(number, q)}
            </div>
          </div>
          <div class="shrink-0 text-xs font-semibold text-slate-700 bg-slate-100 border rounded-lg px-2 py-1">
            ClientNo: ${escapeHtml(clientNo)}
          </div>
        </div>
      </button>
    `;
}

function setSelectedRelatie(row) {
  // Relatie = ClientNo
  state.customer = (row.ClientNo ?? "").toString().trim();
  document.querySelector('[data-path="customer"]').value = state.customer;

  // Persoon (contactpersoon klant) = ComPerson
  const person = (row.ComPerson ?? "").toString().trim();
  state.customerContact = person;
  document.querySelector('[data-path="customerContact"]').value = person;

  // visual card
  selectedRelatieCard.innerHTML = `
      <div class="font-semibold">${escapeHtml(row.ComName || "")}</div>
      <div class="text-sm text-slate-700 mt-1">${escapeHtml(row.ComZip || "")} ${escapeHtml(row.ComCity || "")} • ${escapeHtml(row.ComStreet || "")}</div>
      <div class="text-sm text-slate-500 mt-1">Contact: ${escapeHtml(row.ComPerson || "")} • Land: ${escapeHtml(row.ComCountry || "")}</div>
      <div class="mt-2 text-xs font-semibold inline-block bg-slate-100 border rounded-lg px-2 py-1">ClientNo: ${escapeHtml(row.ClientNo || "")}</div>
    `;

  // --- klanten.csv Task... -> pickup (Laden) invullen ---
  state.pickup.name = (row.TaskName ?? "").toString().trim();
  state.pickup.contactName = (row.TaskPerson ?? "").toString().trim();
  state.pickup.premise = (row.TaskLocation ?? "").toString().trim();
  state.pickup.street = (row.TaskStreetOnly ?? "").toString().trim();
  state.pickup.number = (row.TaskStreetNumber ?? "").toString().trim();
  state.pickup.postalCode = (row.TaskZip ?? "").toString().trim();
  state.pickup.place = (row.TaskCity ?? "").toString().trim();
  state.pickup.countryCode = (row.TaskCountry ?? "").toString().trim();

  // push ook direct naar de inputs (zodat je het meteen ziet)
  document.querySelector('[data-path="pickup.name"]').value = state.pickup.name;
  document.querySelector('[data-path="pickup.contactName"]').value =
    state.pickup.contactName;
  document.querySelector('[data-path="pickup.premise"]').value =
    state.pickup.premise;
  document.querySelector('[data-path="pickup.street"]').value =
    state.pickup.street;
  document.querySelector('[data-path="pickup.number"]').value =
    state.pickup.number;
  document.querySelector('[data-path="pickup.postalCode"]').value =
    state.pickup.postalCode;
  document.querySelector('[data-path="pickup.place"]').value =
    state.pickup.place;
  document.querySelector('[data-path="pickup.countryCode"]').value =
    state.pickup.countryCode;

  relatieSearch.value = row.ComName || "";
  hideSuggestions(relatieSuggestions);
  renderYamlPreview();
}

document.addEventListener("click", (e) => {
  if (!relatieSuggestions.contains(e.target) && e.target !== relatieSearch)
    hideSuggestions(relatieSuggestions);
  if (!productSuggestions.contains(e.target) && e.target !== productSearch)
    hideSuggestions(productSuggestions);
});

relatieSearch.addEventListener("input", () => {
  const q = relatieSearch.value;
  if (!klanten.length) {
    showSuggestions(
      relatieSuggestions,
      `<div class="px-4 py-3 text-sm text-slate-600">Klanten CSV is nog niet geladen.</div>`,
    );
    return;
  }
  if (!q || q.trim().length < 2) {
    hideSuggestions(relatieSuggestions);
    return;
  }

  const rows = searchRows(klanten, q, REL_SEARCH_FIELDS, "ComName");
  if (!rows.length) {
    showSuggestions(
      relatieSuggestions,
      `<div class="px-4 py-3 text-sm text-slate-600">Geen resultaten.</div>`,
    );
    return;
  }
  showSuggestions(
    relatieSuggestions,
    rows.map((r) => formatRelSuggestion(r, q)).join(""),
  );
});

relatieSuggestions.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-clientno]");
  if (!btn) return;
  const clientNo = btn.getAttribute("data-clientno");
  const row = klanten.find(
    (k) => (k.ClientNo ?? "").toString().trim() === clientNo,
  );
  if (row) setSelectedRelatie(row);
});

// -----------------------------
// Product search UI
// -----------------------------
const productSearch = document.getElementById("productSearch");
const productSuggestions = document.getElementById("productSuggestions");
const selectedProductCard = document.getElementById("selectedProductCard");

const PROD_SEARCH_FIELDS = ["ProductCode", "ProductDescription"];

function formatProdSuggestion(row, q) {
  const code = row.ProductCode || "";
  const desc = row.ProductDescription || "";
  const id = row.ProductId || "";

  return `
      <button type="button" data-productid="${escapeHtml(id)}"
        class="w-full text-left px-4 py-4 hover:bg-slate-50 focus:bg-slate-50 outline-none border-b last:border-b-0">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="text-base font-semibold truncate">${highlight(code, q)} <span class="text-slate-400 font-normal">—</span> ${highlight(desc, q)}</div>
            <div class="text-sm text-slate-500 mt-1 truncate">ProductId: ${escapeHtml(id)}</div>
          </div>
          <div class="shrink-0 text-xs font-semibold text-slate-700 bg-slate-100 border rounded-lg px-2 py-1">
            ${escapeHtml(code)}
          </div>
        </div>
      </button>
    `;
}

function setSelectedProduct(row) {
  // Product = ProductId
  const pid = (row.ProductId ?? "").toString().trim();
  state.product = pid;
  document.querySelector('[data-path="product"]').value = pid;

  // Visual card
  selectedProductCard.innerHTML = `
      <div class="font-semibold">${escapeHtml(row.ProductCode || "")}</div>
      <div class="text-sm text-slate-700 mt-1">${escapeHtml(row.ProductDescription || "")}</div>
      <div class="mt-2 text-xs font-semibold inline-block bg-slate-100 border rounded-lg px-2 py-1">ProductId: ${escapeHtml(pid)}</div>
    `;

  // Auto fill gewenste tijden op basis van product CSV tijden
  const today = new Date();
  const todayYMD = ymd(today);
  const nextBD = nextBusinessDay(today);
  const nextYMD = ymd(nextBD);

  const bringFrom = parseTimeHHMM(row.TaskMomentRTABring);
  const bringTo = parseTimeHHMM(row.TaskMomentRTDBring);
  const getFrom = parseTimeHHMM(row.TaskMomentRTAGet);
  const getTo = parseTimeHHMM(row.TaskMomentRTDGet);

  // Laden: vandaag + bring times
  setDtField("pickup.dateFrom", todayYMD, bringFrom);
  setDtField("pickup.dateTo", todayYMD, bringTo);

  // Lossen: eerstvolgende werkdag + get times
  setDtField("delivery.dateFrom", nextYMD, getFrom);
  setDtField("delivery.dateTo", nextYMD, getTo);

  productSearch.value =
    `${row.ProductCode || ""} ${row.ProductDescription || ""}`.trim();
  hideSuggestions(productSuggestions);
  renderYamlPreview();
}

productSearch.addEventListener("input", () => {
  const q = productSearch.value;
  if (!producten.length) {
    showSuggestions(
      productSuggestions,
      `<div class="px-4 py-3 text-sm text-slate-600">Producten CSV is nog niet geladen.</div>`,
    );
    return;
  }
  if (!q || q.trim().length < 2) {
    hideSuggestions(productSuggestions);
    return;
  }

  const rows = searchRows(producten, q, PROD_SEARCH_FIELDS, "ProductCode");
  if (!rows.length) {
    showSuggestions(
      productSuggestions,
      `<div class="px-4 py-3 text-sm text-slate-600">Geen resultaten.</div>`,
    );
    return;
  }
  showSuggestions(
    productSuggestions,
    rows.map((r) => formatProdSuggestion(r, q)).join(""),
  );
});

productSuggestions.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-productid]");
  if (!btn) return;
  const id = btn.getAttribute("data-productid");
  const row = producten.find(
    (p) => (p.ProductId ?? "").toString().trim() === id,
  );
  if (row) setSelectedProduct(row);
});

// -----------------------------
// Goods UI
// -----------------------------
const goodsContainer = document.getElementById("goodsContainer");

function formatPackagingSuggestion(row, q) {
  const name = (row.Name_NL ?? "").toString();

  return `
    <button type="button"
      class="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-b-0">
      <div class="text-base font-semibold">
        ${highlight(name, q)}
      </div>
    </button>
  `;
}

goodsContainer.addEventListener("input", (e) => {
  const input = e.target.closest("[data-packing-search]");
  if (!input) return;

  const wrapper = input.closest(".relative");
  const suggestionBox = wrapper.querySelector("[data-packing-suggestions]");
  const q = input.value.trim();

  if (!verpakkingen.length || q.length < 1) {
    suggestionBox.classList.add("hidden");
    return;
  }

  const matches = verpakkingen
    .filter((v) => normalize(v.Name_NL).includes(normalize(q)))
    .slice(0, 10);

  if (!matches.length) {
    suggestionBox.innerHTML = `<div class="px-4 py-3 text-sm text-slate-500">Geen resultaten</div>`;
    suggestionBox.classList.remove("hidden");
    return;
  }

  suggestionBox.innerHTML = matches
    .map((v) => formatPackagingSuggestion(v, q))
    .join("");
  suggestionBox.classList.remove("hidden");
});

function goodsRowTemplate(index) {
  const g = state.goods[index];
  return `
  <div class="border rounded-2xl p-5 bg-white">
    <div class="flex items-center justify-between mb-4">
      <div class="font-semibold text-base">Collo #${index + 1}</div>
      <button data-remove-goods="${index}" class="text-sm font-semibold text-rose-600 hover:text-rose-700">
        Verwijder
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- parts -->
      <div>
        <label class="block text-sm font-medium mb-1">Totaal colli (regel)</label>
        <input type="number" class="w-full border rounded-lg p-3"
          data-goods="${index}" data-field="parts" value="${g.parts}">
      </div>

      <!-- packing (fancy search) -->
      <div>
        <label class="block text-sm font-medium mb-1">Verpakking</label>
        <div class="relative">
          <input type="text"
            class="w-full border rounded-lg p-3"
            data-goods="${index}"
            data-field="packing"
            data-packing-search
            placeholder="Selecteer verpakking…"
            value="${escapeHtml(g.packing)}"
            autocomplete="off" />

          <div
            class="hidden absolute z-30 mt-2 w-full rounded-xl border bg-white shadow-lg overflow-hidden
                   max-h-64 overflow-y-auto"
            data-packing-suggestions>
          </div>
        </div>
      </div>

      <!-- weight -->
      <div>
        <label class="block text-sm font-medium mb-1">Gewicht (kg)</label>
        <input type="number" step="0.01" class="w-full border rounded-lg p-3"
          data-goods="${index}" data-field="weightKg" value="${g.weightKg}">
      </div>

      <!-- volume -->
      <div>
        <label class="block text-sm font-medium mb-1">Volume (m2)</label>
        <input type="number" step="0.00001" class="w-full border rounded-lg p-3"
          data-goods="${index}" data-field="volumeCbm" value="${g.volumeCbm}">
        <p class="text-xs text-slate-500 mt-1">Auto op basis van L×B×H (cm), maar aanpasbaar</p>
      </div>

      <!-- notes -->
      <div class="md:col-span-2">
        <label class="block text-sm font-medium mb-1">Diversen (colli regel)</label>
        <input type="text" class="w-full border rounded-lg p-3"
          data-goods="${index}" data-field="notes"
          value="${escapeHtml(g.notes)}" placeholder="Bijv. Pas op breekbaar">
      </div>

      <!-- dims -->
      <div>
        <label class="block text-sm font-medium mb-1">Lengte (cm)</label>
        <input type="number" class="w-full border rounded-lg p-3"
          data-goods="${index}" data-field="dimsLcm" value="${g.dimsLcm}">
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Breedte (cm)</label>
        <input type="number" class="w-full border rounded-lg p-3"
          data-goods="${index}" data-field="dimsWcm" value="${g.dimsWcm}">
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Hoogte (cm)</label>
        <input type="number" class="w-full border rounded-lg p-3"
          data-goods="${index}" data-field="dimsHcm" value="${g.dimsHcm}">
      </div>
    </div>
  </div>
`;
}

function renderGoods() {
  goodsContainer.innerHTML = state.goods
    .map((_, i) => goodsRowTemplate(i))
    .join("");
}

function addGoodsRow() {
  state.goods.push({
    parts: 1,
    packing: "",
    weightKg: 0,
    volumeCbm: 0,
    dimsLcm: 0,
    dimsWcm: 0,
    dimsHcm: 0,
    notes: "",
  });
  renderGoods();
  renderYamlPreview();
}

function removeGoodsRow(index) {
  if (state.goods.length <= 1) return;
  state.goods.splice(index, 1);
  renderGoods();
  renderYamlPreview();
}

function updateVolumeFromDims(i) {
  const g = state.goods[i];
  const autoVol = calcVolumeFromDims(g.dimsLcm, g.dimsWcm, g.dimsHcm);
  g.volumeCbm = autoVol;
  const volInput = goodsContainer.querySelector(
    `input[data-goods="${i}"][data-field="volumeCbm"]`,
  );
  if (volInput) volInput.value = autoVol;
}

// -----------------------------
// Bindings
// -----------------------------
function bindFormInputs() {
  // data-path fields (except totals and customer/product which are readonly)
  document.querySelectorAll("[data-path]").forEach((el) => {
    const path = el.getAttribute("data-path");
    el.value = getByPath(state, path) ?? "";

    el.addEventListener("input", () => {
      if (
        [
          "totalParts",
          "totalWeightKg",
          "totalVolumeCbm",
          "customer",
          "product",
        ].includes(path)
      )
        return;
      const val =
        el.type === "number" ? Number(el.value) || 0 : (el.value ?? "");
      setByPath(state, path, val);
      renderYamlPreview();
    });
  });

  // datetime fields
  document.querySelectorAll("[data-dt-path]").forEach((el) => {
    const path = el.getAttribute("data-dt-path");
    el.value = yamlToDtLocal(getByPath(state, path) ?? "");
    el.addEventListener("input", () => {
      setByPath(state, path, dtLocalToYaml(el.value));
      renderYamlPreview();
    });
  });

  // goods: click op suggestie
  goodsContainer.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-packing-suggestions] button");
    if (!btn) return;

    const wrapper = btn.closest(".relative");
    const input = wrapper.querySelector("[data-packing-search]");
    const suggestionBox = wrapper.querySelector("[data-packing-suggestions]");

    const value = btn.innerText.trim();
    input.value = value;

    // schrijf naar state.goods[…].packing
    const idx = input.getAttribute("data-goods");
    if (idx !== null && state.goods[idx]) {
      state.goods[idx].packing = value;
    }

    suggestionBox.classList.add("hidden");
    renderYamlPreview();
  });

  // goods: verwijderen
  goodsContainer.addEventListener("click", (e) => {
    const rm = e.target.closest("[data-remove-goods]");
    if (rm) {
      const idx = Number(rm.getAttribute("data-remove-goods"));
      removeGoodsRow(idx);
      return;
    }
  });

  // goods: inputs -> state + totals/volume recalculations
  goodsContainer.addEventListener("input", (e) => {
    const el = e.target.closest("input[data-goods][data-field]");
    if (!el) return;

    const i = Number(el.getAttribute("data-goods"));
    const field = el.getAttribute("data-field");
    if (!Number.isFinite(i) || !field || !state.goods[i]) return;

    const val =
      el.type === "number"
        ? Number(el.value) || 0
        : (el.value ?? "").toString();
    state.goods[i][field] = val;

    // auto volume when dims change
    if (field === "dimsLcm" || field === "dimsWcm" || field === "dimsHcm") {
      updateVolumeFromDims(i);
    }

    renderYamlPreview();
  });

  // packing dropdowns sluiten bij klik buiten
  document.addEventListener("click", (e) => {
    document.querySelectorAll("[data-packing-suggestions]").forEach((box) => {
      if (
        !box.contains(e.target) &&
        !box.previousElementSibling?.contains(e.target)
      ) {
        box.classList.add("hidden");
      }
    });
  });

  // clear buttons
  const clearPickupBtn = document.getElementById("clearPickupBtn");
  if (clearPickupBtn) {
    clearPickupBtn.addEventListener("click", () => clearSection("pickup"));
  }

  const clearDeliveryBtn = document.getElementById("clearDeliveryBtn");
  if (clearDeliveryBtn) {
    clearDeliveryBtn.addEventListener("click", () => clearSection("delivery"));
  }
}

function clearSection(prefix) {
  // prefix is "pickup" of "delivery"
  const base = state[prefix];
  if (!base) return;

  // keys leegmaken in state
  Object.keys(base).forEach((k) => {
    base[k] = "";
  });

  // inputs (data-path) leegmaken
  document.querySelectorAll(`[data-path^="${prefix}."]`).forEach((el) => {
    el.value = "";
  });

  // datetime-local inputs (data-dt-path) leegmaken + state (die is al leeg)
  document.querySelectorAll(`[data-dt-path^="${prefix}."]`).forEach((el) => {
    el.value = "";
  });

  renderYamlPreview();
}

function resetAfterDownload() {
  // --- EML leegmaken (EML wél resetten) ---
  const emlFile = document.getElementById("emlFile");
  const emlSubject = document.getElementById("emlSubject");
  const fileName = document.getElementById("fileName");

  if (emlFile) emlFile.value = "";
  if (emlSubject) emlSubject.value = "";
  if (fileName) fileName.value = "voorbeeld.yaml";

  // --- Relatie & Product zoekvelden leeg ---
  if (typeof relatieSearch !== "undefined") relatieSearch.value = "";
  if (typeof productSearch !== "undefined") productSearch.value = "";

  if (typeof relatieSuggestions !== "undefined")
    hideSuggestions(relatieSuggestions);
  if (typeof productSuggestions !== "undefined")
    hideSuggestions(productSuggestions);

  // cards reset (visual)
  if (typeof selectedRelatieCard !== "undefined") {
    selectedRelatieCard.innerHTML = `<div class="text-sm text-slate-500">Nog geen relatie geselecteerd.</div>`;
  }
  if (typeof selectedProductCard !== "undefined") {
    selectedProductCard.innerHTML = `<div class="text-sm text-slate-500">Nog geen product geselecteerd.</div>`;
  }

  // --- State reset (maar CSV arrays blijven staan: klanten/producten/verpakkingen NIET leegmaken) ---
  state.customer = "";
  state.customerRef = "";
  state.customerContact = "";
  state.product = "";

  // readonly inputs ook leeg tonen
  const customerEl = document.querySelector('[data-path="customer"]');
  const customerContactEl = document.querySelector(
    '[data-path="customerContact"]',
  );
  const productEl = document.querySelector('[data-path="product"]');

  if (customerEl) customerEl.value = "";
  if (customerContactEl) customerContactEl.value = "";
  if (productEl) productEl.value = "";

  // goods reset naar 1 lege regel
  state.goods = [
    {
      parts: 1,
      packing: "",
      weightKg: 0,
      volumeCbm: 0,
      dimsLcm: 0,
      dimsWcm: 0,
      dimsHcm: 0,
      notes: "",
    },
  ];
  renderGoods();

  // pickup & delivery leegmaken via bestaande helper (leegt ook inputs)
  clearSection("pickup");
  clearSection("delivery");

  // YAML preview opnieuw renderen (en totalen)
  renderYamlPreview();
}

// -----------------------------
// EML handlers
// -----------------------------
document.getElementById("emlFile").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const subject = extractSubjectFromEml(text);
  document.getElementById("emlSubject").value = subject;
  document.getElementById("fileName").value = slugifyFileName(subject);
});

document.getElementById("emlSubject").addEventListener("input", (e) => {
  document.getElementById("fileName").value = slugifyFileName(e.target.value);
});

// -----------------------------
// Download / Copy
// -----------------------------
document.getElementById("downloadBtn").addEventListener("click", () => {
  const yamlText = document.getElementById("yamlPreview").value;
  const fileName = (
    document.getElementById("fileName").value || "voorbeeld.yaml"
  ).trim();
  const blob = new Blob([yamlText], { type: "text/yaml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".yaml") ? fileName : fileName + ".yaml";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  resetAfterDownload();
});

document.getElementById("copyBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(
      document.getElementById("yamlPreview").value,
    );
    const btn = document.getElementById("copyBtn");
    const old = btn.textContent;
    btn.textContent = "Gekopieerd ✓";
    setTimeout(() => (btn.textContent = old), 900);
  } catch {
    alert("Kopiëren lukt niet. Selecteer de tekst en kopieer handmatig.");
  }
});

document
  .getElementById("addGoods")
  .addEventListener("click", () => addGoodsRow());

// -----------------------------
// Manual upload fallback
// -----------------------------
document
  .getElementById("csvKlantenUpload")
  .addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const rows = await parseCsvFile(f);
      klanten = rows;
      klantenStatus.innerHTML = `<span class="text-emerald-700 font-semibold">Geladen:</span> ${klanten.length} relaties (upload).`;
    } catch (err) {
      klantenStatus.innerHTML = `<span class="text-rose-600 font-semibold">Fout:</span> ${escapeHtml(err.message || String(err))}`;
    }
  });

document
  .getElementById("csvProductenUpload")
  .addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const rows = await parseCsvFile(f);
      producten = rows;
      productenStatus.innerHTML = `<span class="text-emerald-700 font-semibold">Geladen:</span> ${producten.length} producten (upload).`;
    } catch (err) {
      productenStatus.innerHTML = `<span class="text-rose-600 font-semibold">Fout:</span> ${escapeHtml(err.message || String(err))}`;
    }
  });

document
  .getElementById("csvVerpakkingenUpload")
  .addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const rows = await parseCsvFile(f);
      verpakkingen = rows;
      verpakkingenStatus.innerHTML = `<span class="text-emerald-700 font-semibold">Geladen:</span> ${verpakkingen.length} verpakkingen (upload).`;
    } catch (err) {
      verpakkingenStatus.innerHTML = `<span class="text-rose-600 font-semibold">Fout:</span> ${escapeHtml(err.message || String(err))}`;
    }
  });

// -----------------------------
// Init
// -----------------------------
function init() {
  renderGoods();
  bindFormInputs();
  document.getElementById("fileName").value = "voorbeeld.yaml";
  renderYamlPreview();
}
init();

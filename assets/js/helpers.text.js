/* helpers.text.js
   Tekst/strings helpers die op meerdere plekken gebruikt worden.
*/

function escapeHtml(str) {
  return (str ?? "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(s) {
  return (s ?? "").toString().toLowerCase().trim();
}

function slugifyFileName(subject) {
  const base = (subject || "voorbeeld")
    .replace(/^(re|fw|fwd)\s*:\s*/i, "")
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return (base || "voorbeeld") + ".yaml";
}

// MIME Subject decode (B/Q)
function decodeMimeEncodedWords(str) {
  if (!str) return str;
  return str.replace(
    /=\?([^?]+)\?(B|Q)\?([^?]+)\?=/gi,
    (m, charset, enc, text) => {
      try {
        if (enc.toUpperCase() === "B") {
          const bin = atob(text.replace(/\s/g, ""));
          const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
          return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        } else {
          const q = text
            .replace(/_/g, " ")
            .replace(/=([A-Fa-f0-9]{2})/g, (_, h) =>
              String.fromCharCode(parseInt(h, 16)),
            );
          const bytes = Uint8Array.from(q, (c) => c.charCodeAt(0));
          return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        }
      } catch {
        return m;
      }
    },
  );
}

function extractSubjectFromEml(emlText) {
  const split = emlText.split(/\r?\n\r?\n/);
  const headers = split[0] || "";
  const unfolded = headers.replace(/\r?\n([ \t]+)/g, " ");
  const match = unfolded.match(/^Subject:\s*(.*)$/im);
  if (!match) return "";
  return decodeMimeEncodedWords(match[1].trim());
}

function highlight(text, q) {
  const t = (text ?? "").toString();
  if (!q) return escapeHtml(t);
  const idx = t.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return escapeHtml(t);
  const a = escapeHtml(t.slice(0, idx));
  const b = escapeHtml(t.slice(idx, idx + q.length));
  const c = escapeHtml(t.slice(idx + q.length));
  return `${a}<mark class="bg-amber-200 rounded px-0.5">${b}</mark>${c}`;
}

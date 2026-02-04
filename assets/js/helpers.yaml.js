/* helpers.yaml.js
   YAML-dump helpers
*/

function yamlEscapeDoubleQuoted(str) {
  // YAML double-quoted scalar escaping
  return str
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\n", "\\n");
}

function isPlainNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

function dumpYaml(value, indent = 0) {
  const sp = "  ".repeat(indent);

  // null/undefined -> empty string quoted (zoals voorbeeld "")
  if (value === null || value === undefined) {
    return `"\"\""`.slice(1, -1); // just ""
  }

  // numbers as-is
  if (isPlainNumber(value)) {
    return String(value);
  }

  // booleans as-is
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  // strings always double quoted
  if (typeof value === "string") {
    return `"${yamlEscapeDoubleQuoted(value)}"`;
  }

  // arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value
      .map((item) => {
        // objects in array: "- key: ..."
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const lines = [];
          const entries = Object.entries(item);
          if (entries.length === 0) return `${sp}- {}`;
          lines.push(
            `${sp}- ${formatObjectInlineOrMultiline(item, indent + 1, true)}`,
          );
          return lines.join("\n");
        }
        // scalar in array
        return `${sp}- ${dumpYaml(item, 0)}`;
      })
      .join("\n");
  }

  // objects
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    return entries
      .map(([k, v]) => {
        // nested object/array -> new line + indent
        if (v && typeof v === "object") {
          if (Array.isArray(v)) {
            const arrDump = dumpYaml(v, indent + 1);
            // if [] keep inline
            if (arrDump === "[]") return `${sp}${k}: []`;
            return `${sp}${k}:\n${arrDump}`;
          } else {
            return `${sp}${k}:\n${dumpYaml(v, indent + 1)}`;
          }
        }
        return `${sp}${k}: ${dumpYaml(v, 0)}`;
      })
      .join("\n");
  }

  // fallback
  return `"${yamlEscapeDoubleQuoted(String(value))}"`;
}

function formatObjectInlineOrMultiline(obj, indent, isArrayItem = false) {
  // For array item object, we want:
  // - parts: 1
  //   packing: "..."
  // etc.
  const sp = "  ".repeat(indent);
  const entries = Object.entries(obj);

  // first line: first key inline after "- "
  const [firstK, firstV] = entries[0];
  let out = `${firstK}: ${dumpYaml(firstV, 0)}`;

  // remaining lines: indented
  for (let i = 1; i < entries.length; i++) {
    const [k, v] = entries[i];
    if (v && typeof v === "object") {
      if (Array.isArray(v)) {
        const arrDump = dumpYaml(v, indent + 1);
        out += `\n${sp}${k}:\n${arrDump}`;
      } else {
        out += `\n${sp}${k}:\n${dumpYaml(v, indent + 1)}`;
      }
    } else {
      out += `\n${sp}${k}: ${dumpYaml(v, 0)}`;
    }
  }
  return out;
}

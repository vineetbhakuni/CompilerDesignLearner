const OP_META = {
  compiler: { title: "Compiler", endpoint: "/api/compiler" },
  lexer: { title: "Lexical Analyzer", endpoint: "/api/lexer" },
  parser: { title: "Parse Tree Generator", endpoint: "/api/parser" },
  semantic: { title: "Symbol Table", endpoint: "/api/semantic" },
  intermediate: { title: "Intermediate Code", endpoint: "/api/intermediate" },
  codegen: { title: "Code Generation", endpoint: "/api/codegen" },
};

const SAMPLE = `sadanumber x = 5;
sadanumber y = 10;
sadanumber z;

agar (x < y) {
  z = x + y;
  dikhao(z);
} warna {
  z = y - x;
  dikhao(z);
}

jabtak (z < 20) {
  z = z + 1;
}

binduwalanumber pi = 3.14;
dikhao(pi);
dikhao("done");`;

const tabOrder = ["compiler", "lexer", "parser", "semantic", "intermediate", "codegen"];
const opQuery = new URLSearchParams(window.location.search).get("op");
const opFromPath = window.location.pathname.split("/").pop();
const opKey = (opQuery || opFromPath || "compiler").toLowerCase();
const current = OP_META[opKey] || OP_META.compiler;

const opTitle = document.getElementById("opTitle");
const outputRoot = document.getElementById("outputRoot");
const statusText = document.getElementById("statusText");
const runBtn = document.getElementById("runBtn");
const tabs = document.getElementById("operationTabs");

let editor;

function makeTabs() {
  tabs.innerHTML = "";
  for (const key of tabOrder) {
    const a = document.createElement("a");
    a.href = `/operations.html?op=${key}`;
    a.textContent = OP_META[key].title;
    a.className = `tab-link ${key === opKey ? "active" : ""}`;
    tabs.appendChild(a);
  }
}

function clearOutput() {
  outputRoot.innerHTML = "";
}

function createTable(headers, rows) {
  const table = document.createElement("table");
  table.className = "result-table";

  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  for (const head of headers) {
    const th = document.createElement("th");
    th.textContent = head;
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const cell of row) {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

function addPreBlock(value, title = "") {
  if (title) {
    const h = document.createElement("h3");
    h.className = "mini-title";
    h.textContent = title;
    outputRoot.appendChild(h);
  }
  const pre = document.createElement("pre");
  pre.className = "code-block";
  pre.textContent = value || "(no output)";
  outputRoot.appendChild(pre);
}

function renderCompiler(data) {
  clearOutput();
  addPreBlock(data.output || "(no output)");
}

function renderLexer(data) {
  clearOutput();
  const tokens = Array.isArray(data.tokens) ? data.tokens : [];
  const rows = tokens.map((t) => [String(t.line), t.lexeme, t.type]);
  outputRoot.appendChild(createTable(["Line", "Lexeme", "Type"], rows));
}

function layoutTree(root) {
  const levelGapY = 80;
  const nodeGapX = 34;
  let leafIndex = 0;

  function walk(node, depth) {
    const viewNode = {
      label: node.label,
      children: (node.children || []).map((child) => walk(child, depth + 1)),
      depth,
      x: 0,
      y: depth * levelGapY,
    };

    if (viewNode.children.length === 0) {
      viewNode.x = leafIndex * nodeGapX;
      leafIndex += 1;
    } else {
      const first = viewNode.children[0];
      const last = viewNode.children[viewNode.children.length - 1];
      viewNode.x = (first.x + last.x) / 2;
    }

    return viewNode;
  }

  function collect(node, nodes, links) {
    nodes.push(node);
    for (const child of node.children) {
      links.push([node, child]);
      collect(child, nodes, links);
    }
  }

  const tree = walk(root, 0);
  const nodes = [];
  const links = [];
  collect(tree, nodes, links);

  const minX = nodes.reduce((acc, n) => Math.min(acc, n.x), 0);
  const maxX = nodes.reduce((acc, n) => Math.max(acc, n.x), 0);
  const maxY = nodes.reduce((acc, n) => Math.max(acc, n.y), 0);

  return {
    nodes,
    links,
    width: Math.max(800, maxX - minX + 280),
    height: Math.max(500, maxY + 140),
  };
}

function applyTreeTransform(group, state) {
  group.setAttribute("transform", `translate(${state.tx}, ${state.ty}) scale(${state.scale})`);
}

function attachTreeZoom(controls, svg, group) {
  const state = { scale: 1, tx: 60, ty: 50, dragging: false, startX: 0, startY: 0 };
  applyTreeTransform(group, state);

  function zoomBy(factor) {
    state.scale = Math.max(0.2, Math.min(3.5, state.scale * factor));
    applyTreeTransform(group, state);
  }

  controls.querySelector("[data-zoom='in']").addEventListener("click", () => zoomBy(1.15));
  controls.querySelector("[data-zoom='out']").addEventListener("click", () => zoomBy(0.85));
  controls.querySelector("[data-zoom='reset']").addEventListener("click", () => {
    state.scale = 1;
    state.tx = 60;
    state.ty = 50;
    applyTreeTransform(group, state);
  });

  svg.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    zoomBy(ev.deltaY < 0 ? 1.12 : 0.88);
  });

  svg.addEventListener("mousedown", (ev) => {
    state.dragging = true;
    state.startX = ev.clientX;
    state.startY = ev.clientY;
  });

  window.addEventListener("mouseup", () => {
    state.dragging = false;
  });

  window.addEventListener("mousemove", (ev) => {
    if (!state.dragging) {
      return;
    }
    const dx = ev.clientX - state.startX;
    const dy = ev.clientY - state.startY;
    state.startX = ev.clientX;
    state.startY = ev.clientY;
    state.tx += dx;
    state.ty += dy;
    applyTreeTransform(group, state);
  });
}

function renderParseTree(data) {
  clearOutput();

  if (!data.tree) {
    addPreBlock("No tree generated.");
    return;
  }

  const { nodes, links, width, height } = layoutTree(data.tree);

  const controls = document.createElement("div");
  controls.className = "tree-controls";
  controls.innerHTML =
    '<button type="button" data-zoom="in">+</button><button type="button" data-zoom="out">-</button><button type="button" data-zoom="reset">Reset</button>';

  const viewport = document.createElement("div");
  viewport.className = "tree-viewport";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "tree-svg");

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

  for (const [src, dst] of links) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const x1 = src.x + 60;
    const y1 = src.y + 30;
    const x2 = dst.x + 60;
    const y2 = dst.y + 6;
    const midY = (y1 + y2) / 2;
    line.setAttribute("d", `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`);
    line.setAttribute("class", "tree-link");
    group.appendChild(line);
  }

  for (const node of nodes) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(node.x + 60));
    text.setAttribute("y", String(node.y + 22));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "tree-text");
    text.textContent = node.label;
    group.appendChild(text);
  }

  svg.appendChild(group);
  viewport.appendChild(svg);
  outputRoot.appendChild(controls);
  outputRoot.appendChild(viewport);
  attachTreeZoom(controls, svg, group);
}

function renderSemantic(data) {
  clearOutput();
  const symbols = Array.isArray(data.symbols) ? data.symbols : [];
  const rows = symbols.map((s) => [s.name, s.type, s.scope]);
  outputRoot.appendChild(createTable(["Name", "Type", "Scope"], rows));

  const errors = Array.isArray(data.errors) ? data.errors : [];
  if (errors.length > 0) {
    const list = document.createElement("ul");
    list.className = "error-list";
    for (const err of errors) {
      const li = document.createElement("li");
      li.textContent = err;
      list.appendChild(li);
    }
    outputRoot.appendChild(list);
  }
}

function renderIntermediate(data) {
  clearOutput();
  addPreBlock(data.ir || "(none)", "IR");
  addPreBlock(data.optimized || "(none)", "Optimized");
}

function renderCodegen(data) {
  clearOutput();
  addPreBlock(data.code || "(none)");
}

function renderError(msg, details) {
  clearOutput();
  const section = document.createElement("section");
  section.className = "result-section error";
  const p = document.createElement("p");
  p.textContent = msg;
  section.appendChild(p);

  if (Array.isArray(details) && details.length > 0) {
    const ul = document.createElement("ul");
    ul.className = "error-list";
    for (const d of details) {
      const li = document.createElement("li");
      li.textContent = d;
      ul.appendChild(li);
    }
    section.appendChild(ul);
  }

  outputRoot.appendChild(section);
}

async function runOperation() {
  statusText.textContent = "Running";
  runBtn.disabled = true;

  try {
    const response = await fetch(current.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: editor.getValue() }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      statusText.textContent = "Failed";
      renderError(data.error || "Operation failed", data.details || data.semanticErrors || data.errors);
      return;
    }

    statusText.textContent = "Done";
    if (opKey === "compiler") renderCompiler(data);
    else if (opKey === "lexer") renderLexer(data);
    else if (opKey === "parser") renderParseTree(data);
    else if (opKey === "semantic") renderSemantic(data);
    else if (opKey === "intermediate") renderIntermediate(data);
    else if (opKey === "codegen") renderCodegen(data);
  } catch (err) {
    statusText.textContent = "Failed";
    renderError(err.message || "Network error");
  } finally {
    runBtn.disabled = false;
  }
}

function registerHinglishLanguage(monaco) {
  monaco.languages.register({ id: "hinglish" });
  monaco.languages.setMonarchTokensProvider("hinglish", {
    tokenizer: {
      root: [
        [/[a-zA-Z_][\w]*/, {
          cases: {
            "agar|warna|jabtak|dikhao|and|aur|or|ya|not|nahi": "keyword",
            "sadanumber|binduwalanumber|int|float|string|bool": "type",
            "true|false|sahi|galat": "constant",
            "@default": "identifier",
          },
        }],
        [/[0-9]+\.[0-9]+/, "number.float"],
        [/[0-9]+/, "number"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/\/\/.*/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/[{}()[\]]/, "delimiter.bracket"],
        [/[;,.]/, "delimiter"],
        [/[+\-*\/%=<>!]+/, "operator"],
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
    },
  });

  monaco.editor.defineTheme("hinglish-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "7dd3fc" },
      { token: "type", foreground: "fbbf24" },
      { token: "constant", foreground: "a3e635" },
      { token: "identifier", foreground: "e5e7eb" },
    ],
    colors: {
      "editor.background": "#111827",
      "editor.lineHighlightBackground": "#1f2937",
      "editorCursor.foreground": "#f8fafc",
      "editorLineNumber.foreground": "#64748b",
      "editorLineNumber.activeForeground": "#cbd5e1",
      "editor.selectionBackground": "#33415588",
    },
  });
}

function initMonaco() {
  window.require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs" } });
  window.require(["vs/editor/editor.main"], () => {
    registerHinglishLanguage(window.monaco);
    editor = window.monaco.editor.create(document.getElementById("editor"), {
      value: SAMPLE,
      language: "hinglish",
      theme: "hinglish-dark",
      automaticLayout: true,
      fontSize: 18,
      minimap: { enabled: false },
      wordWrap: "on",
      lineNumbersMinChars: 3,
      scrollBeyondLastLine: false,
      padding: { top: 14, bottom: 14 },
    });

    runBtn.addEventListener("click", runOperation);
  });
}

opTitle.textContent = current.title;
makeTabs();
initMonaco();

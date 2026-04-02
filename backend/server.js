const path = require("node:path");
const express = require("express");

const {
  parseSource,
} = require("./parser");
const {
  lexSource,
} = require("./lexer");
const {
  buildParseTreeData,
} = require("./treeDataBuilder");
const {
  executeAst,
} = require("./executor");

const backendDir = __dirname;
const projectRoot = path.join(backendDir, "..");
const app = express();

const OPERATIONS = new Map([
  ["compiler", "Hinglish Compiler"],
  ["lexer", "Lexical Analyzer"],
  ["parser", "Parse Tree Generator"],
]);

app.use(express.json({ limit: "1mb" }));
app.use(
  "/static",
  express.static(path.join(backendDir, "static"), {
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
    },
  })
);

function getSource(req) {
  const source = typeof req.body?.source === "string" ? req.body.source : "";
  if (!source.trim()) {
    throw new Error("Source code is empty.");
  }
  return source;
}

function compileCore(source) {
  const parsed = parseSource(source);
  const runtime = executeAst(parsed.ast);
  return {
    parsed,
    runtimeLines: runtime.output,
  };
}

function displayTokenType(type) {
  const map = {
    IDENT: "identifier",
    INT_LIT: "integer literal",
    FLOAT_LIT: "float literal",
    STRING_LIT: "string literal",
    BOOL_LIT: "boolean literal",
    TYPE_INT: "type keyword (sadanumber)",
    TYPE_FLOAT: "type keyword (binduwalanumber)",
    TYPE_STRING: "type keyword (string)",
    TYPE_BOOL: "type keyword (bool)",
    AGAR: "keyword (agar)",
    WARNA: "keyword (warna)",
    JABTAK: "keyword (jabtak)",
    DIKHAO: "keyword (dikhao)",
    AND: "logical operator (and)",
    OR: "logical operator (or)",
    NOT: "logical operator (not)",
    EQ: "operator (==)",
    NEQ: "operator (!=)",
    GTE: "operator (>=)",
    LTE: "operator (<=)",
    GT: "operator (>)",
    LT: "operator (<)",
    ASSIGN: "assignment operator (=)",
    PLUS: "operator (+)",
    MINUS: "operator (-)",
    MUL: "operator (*)",
    DIV: "operator (/)",
    MOD: "operator (%)",
    LPAREN: "left parenthesis",
    RPAREN: "right parenthesis",
    LBRACE: "left brace",
    RBRACE: "right brace",
    SEMI: "semicolon",
    COMMA: "comma",
  };
  return map[type] || String(type || "token").toLowerCase();
}

app.get("/", (_req, res) => {
  res.sendFile(path.join(projectRoot, "index.html"));
});

app.get("/operation/:name", (req, res) => {
  const name = String(req.params.name || "").toLowerCase();
  if (!OPERATIONS.has(name)) {
    res.status(404).send("Operation not found");
    return;
  }
  res.redirect(`/operations.html?op=${name}`);
});

app.get("/operations.html", (_req, res) => {
  res.sendFile(path.join(projectRoot, "operations.html"));
});

app.get("/api/operations", (_req, res) => {
  res.json({
    operations: Array.from(OPERATIONS.entries()).map(([key, title]) => ({ key, title })),
  });
});

app.post("/api/compiler", (req, res) => {
  try {
    const source = getSource(req);
    const result = compileCore(source);
    res.json({
      ok: true,
      output: result.runtimeLines.join("\n"),
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/lexer", (req, res) => {
  try {
    const source = getSource(req);
    const tokens = lexSource(source)
      .filter((tok) => tok.type !== "EOF")
      .map((tok) => ({ line: tok.line, lexeme: tok.lexeme, type: displayTokenType(tok.type) }));
    res.json({ ok: true, tokens });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/parser", (req, res) => {
  try {
    const source = getSource(req);
    const { ast } = parseSource(source);
    res.json({ ok: true, tree: buildParseTreeData(ast) });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});



const startPort = Number(process.env.PORT || 5000);

function startServer(port, retriesLeft = 20) {
  const server = app.listen(port, () => {
    console.log(`Hinglish compiler server running on http://127.0.0.1:${port}`);
  });

  server.on("error", (err) => {
    if (err?.code === "EADDRINUSE" && retriesLeft > 0) {
      console.warn(`Port ${port} is in use. Retrying on ${port + 1}...`);
      startServer(port + 1, retriesLeft - 1);
      return;
    }
    throw err;
  });
}

startServer(startPort);

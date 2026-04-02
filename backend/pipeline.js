



const KEYWORDS = new Map([
  ["agar", "AGAR"],
  ["warna", "WARNA"],
  ["jabtak", "JABTAK"],
  ["dikhao", "DIKHAO"],
  ["and", "AND"],
  ["aur", "AND"],
  ["or", "OR"],
  ["ya", "OR"],
  ["not", "NOT"],
  ["nahi", "NOT"],
  ["sadanumber", "TYPE_INT"],
  ["binduwalanumber", "TYPE_FLOAT"],
  ["int", "TYPE_INT"],
  ["float", "TYPE_FLOAT"],
  ["string", "TYPE_STRING"],
  ["bool", "TYPE_BOOL"],
]);

const BOOL_WORDS = new Map([
  ["true", "true"],
  ["sahi", "true"],
  ["false", "false"],
  ["galat", "false"],
]);

function lexSource(source) {
  const tokens = [];
  const chars = source || "";
  let i = 0;
  let line = 1;

  function peek(offset = 0) {
    return chars[i + offset] || "";
  }

  function add(type, lexeme, tokenLine) {
    tokens.push({ type, lexeme, line: tokenLine });
  }

  function isAlpha(ch) {
    return /[A-Za-z_]/.test(ch);
  }

  function isAlnum(ch) {
    return /[A-Za-z0-9_]/.test(ch);
  }

  function isDigit(ch) {
    return /[0-9]/.test(ch);
  }

  while (i < chars.length) {
    const ch = peek();

    if (ch === " " || ch === "\t" || ch === "\r") {
      i += 1;
      continue;
    }

    if (ch === "\n") {
      line += 1;
      i += 1;
      continue;
    }

    if (ch === "/" && peek(1) === "/") {
      i += 2;
      while (i < chars.length && peek() !== "\n") {
        i += 1;
      }
      continue;
    }

    if (ch === "/" && peek(1) === "*") {
      i += 2;
      while (i < chars.length) {
        if (peek() === "\n") {
          line += 1;
          i += 1;
          continue;
        }
        if (peek() === "*" && peek(1) === "/") {
          i += 2;
          break;
        }
        i += 1;
      }
      continue;
    }

    const two = `${ch}${peek(1)}`;
    if (["==", "!=", ">=", "<="].includes(two)) {
      const map = { "==": "EQ", "!=": "NEQ", ">=": "GTE", "<=": "LTE" };
      add(map[two], two, line);
      i += 2;
      continue;
    }

    const oneMap = {
      ">": "GT",
      "<": "LT",
      "=": "ASSIGN",
      "+": "PLUS",
      "-": "MINUS",
      "*": "MUL",
      "/": "DIV",
      "%": "MOD",
      "(": "LPAREN",
      ")": "RPAREN",
      "{": "LBRACE",
      "}": "RBRACE",
      ";": "SEMI",
      ",": "COMMA",
    };

    if (oneMap[ch]) {
      add(oneMap[ch], ch, line);
      i += 1;
      continue;
    }

    if (isDigit(ch)) {
      const start = i;
      while (isDigit(peek())) {
        i += 1;
      }
      if (peek() === "." && isDigit(peek(1))) {
        i += 1;
        while (isDigit(peek())) {
          i += 1;
        }
        add("FLOAT_LIT", chars.slice(start, i), line);
      } else {
        add("INT_LIT", chars.slice(start, i), line);
      }
      continue;
    }

    if (ch === '"') {
      const tokenLine = line;
      i += 1;
      let value = "";
      let closed = false;
      while (i < chars.length) {
        const c = peek();
        if (c === "\n") {
          throw new Error(`Lexical error at line ${tokenLine}: unterminated string literal`);
        }
        if (c === "\\") {
          const n = peek(1);
          if (n === "n") value += "\n";
          else if (n === "t") value += "\t";
          else if (n === '"') value += '"';
          else if (n === "\\") value += "\\";
          else value += n;
          i += 2;
          continue;
        }
        if (c === '"') {
          i += 1;
          closed = true;
          break;
        }
        value += c;
        i += 1;
      }
      if (!closed) {
        throw new Error(`Lexical error at line ${tokenLine}: unterminated string literal`);
      }
      add("STRING_LIT", value, tokenLine);
      continue;
    }

    if (isAlpha(ch)) {
      const start = i;
      i += 1;
      while (isAlnum(peek())) {
        i += 1;
      }
      const word = chars.slice(start, i);
      if (BOOL_WORDS.has(word)) {
        add("BOOL_LIT", BOOL_WORDS.get(word), line);
      } else if (KEYWORDS.has(word)) {
        add(KEYWORDS.get(word), word, line);
      } else {
        add("IDENT", word, line);
      }
      continue;
    }

    throw new Error(`Lexical error at line ${line}: unexpected character '${ch}'`);
  }

  tokens.push({ type: "EOF", lexeme: "", line });
  return tokens;
}

function node(kind, value = null, children = []) {
  const n = { kind, children };
  if (value !== null && value !== undefined) {
    n.value = value;
  }
  return n;
}

function parseSource(source) {
  const tokens = lexSource(source);
  let pos = 0;

  function current() {
    return tokens[pos] || tokens[tokens.length - 1];
  }

  function at(type) {
    return current().type === type;
  }

  function consume(type, label) {
    if (!at(type)) {
      const got = current();
      throw new Error(`Syntax error at line ${got.line}: expected ${label || type}, found '${got.lexeme || got.type}'`);
    }
    const tok = current();
    pos += 1;
    return tok;
  }

  function match(type) {
    if (at(type)) {
      pos += 1;
      return true;
    }
    return false;
  }

  function parseProgram() {
    const stmts = parseStmtList("EOF");
    consume("EOF");
    return node("Program", null, [stmts]);
  }

  function parseStmtList(endType) {
    const list = node("StmtList", null, []);
    while (!at(endType) && !at("EOF")) {
      list.children.push(parseStmt());
    }
    return list;
  }

  function parseStmt() {
    if (at("TYPE_INT") || at("TYPE_FLOAT") || at("TYPE_STRING") || at("TYPE_BOOL")) {
      const d = parseDecl();
      consume("SEMI", ";");
      return d;
    }
    if (at("IDENT")) {
      const a = parseAssign();
      consume("SEMI", ";");
      return a;
    }
    if (at("DIKHAO")) {
      const p = parsePrint();
      consume("SEMI", ";");
      return p;
    }
    if (at("AGAR")) {
      return parseIf();
    }
    if (at("JABTAK")) {
      return parseWhile();
    }
    if (at("LBRACE")) {
      return parseBlock();
    }
    const tok = current();
    throw new Error(`Syntax error at line ${tok.line}: unexpected token '${tok.lexeme || tok.type}'`);
  }

  function parseDecl() {
    const typeTok = current();
    let typeVal = "";
    if (match("TYPE_INT")) typeVal = "int";
    else if (match("TYPE_FLOAT")) typeVal = "float";
    else if (match("TYPE_STRING")) typeVal = "string";
    else if (match("TYPE_BOOL")) typeVal = "bool";
    else {
      throw new Error(`Syntax error at line ${typeTok.line}: expected declaration type`);
    }
    const ident = consume("IDENT", "identifier");
    let init = node("NoInit");
    if (match("ASSIGN")) {
      init = parseExpr();
    }
    return node("VarDecl", null, [node("Type", typeVal), node("Identifier", ident.lexeme), init]);
  }

  function parseAssign() {
    const ident = consume("IDENT", "identifier");
    consume("ASSIGN", "=");
    const expr = parseExpr();
    return node("Assign", null, [node("Identifier", ident.lexeme), expr]);
  }

  function parsePrint() {
    consume("DIKHAO");
    consume("LPAREN", "(");
    const expr = parseExpr();
    consume("RPAREN", ")");
    return node("Print", null, [expr]);
  }

  function parseIf() {
    consume("AGAR");
    consume("LPAREN", "(");
    const cond = parseExpr();
    consume("RPAREN", ")");
    const thenStmt = parseStmt();
    const elseStmt = match("WARNA") ? parseStmt() : node("NoElse");
    return node("IfStmt", null, [cond, thenStmt, elseStmt]);
  }

  function parseWhile() {
    consume("JABTAK");
    consume("LPAREN", "(");
    const cond = parseExpr();
    consume("RPAREN", ")");
    const body = parseStmt();
    return node("WhileStmt", null, [cond, body]);
  }

  function parseBlock() {
    consume("LBRACE", "{");
    const body = parseStmtList("RBRACE");
    consume("RBRACE", "}");
    return node("Block", null, [body]);
  }

  function parseExpr() {
    return parseOr();
  }

  function parseOr() {
    let left = parseAnd();
    while (match("OR")) {
      left = node("BinaryExpr", "or", [left, parseAnd()]);
    }
    return left;
  }

  function parseAnd() {
    let left = parseEq();
    while (match("AND")) {
      left = node("BinaryExpr", "and", [left, parseEq()]);
    }
    return left;
  }

  function parseEq() {
    let left = parseRel();
    while (at("EQ") || at("NEQ")) {
      if (match("EQ")) {
        left = node("BinaryExpr", "==", [left, parseRel()]);
      } else {
        consume("NEQ");
        left = node("BinaryExpr", "!=", [left, parseRel()]);
      }
    }
    return left;
  }

  function parseRel() {
    let left = parseAdd();
    while (at("GT") || at("LT") || at("GTE") || at("LTE")) {
      if (match("GT")) left = node("BinaryExpr", ">", [left, parseAdd()]);
      else if (match("LT")) left = node("BinaryExpr", "<", [left, parseAdd()]);
      else if (match("GTE")) left = node("BinaryExpr", ">=", [left, parseAdd()]);
      else {
        consume("LTE");
        left = node("BinaryExpr", "<=", [left, parseAdd()]);
      }
    }
    return left;
  }

  function parseAdd() {
    let left = parseMul();
    while (at("PLUS") || at("MINUS")) {
      if (match("PLUS")) left = node("BinaryExpr", "+", [left, parseMul()]);
      else {
        consume("MINUS");
        left = node("BinaryExpr", "-", [left, parseMul()]);
      }
    }
    return left;
  }

  function parseMul() {
    let left = parseUnary();
    while (at("MUL") || at("DIV") || at("MOD")) {
      if (match("MUL")) left = node("BinaryExpr", "*", [left, parseUnary()]);
      else if (match("DIV")) left = node("BinaryExpr", "/", [left, parseUnary()]);
      else {
        consume("MOD");
        left = node("BinaryExpr", "%", [left, parseUnary()]);
      }
    }
    return left;
  }

  function parseUnary() {
    if (match("NOT")) {
      return node("UnaryExpr", "not", [parseUnary()]);
    }
    if (match("MINUS")) {
      return node("UnaryExpr", "neg", [parseUnary()]);
    }
    return parsePrimary();
  }

  function parsePrimary() {
    if (match("LPAREN")) {
      const inner = parseExpr();
      consume("RPAREN", ")");
      return inner;
    }

    if (at("IDENT")) return node("Identifier", consume("IDENT").lexeme);
    if (at("INT_LIT")) return node("IntLiteral", consume("INT_LIT").lexeme);
    if (at("FLOAT_LIT")) return node("FloatLiteral", consume("FLOAT_LIT").lexeme);
    if (at("STRING_LIT")) return node("StringLiteral", consume("STRING_LIT").lexeme);
    if (at("BOOL_LIT")) return node("BoolLiteral", consume("BOOL_LIT").lexeme);

    const tok = current();
    throw new Error(`Syntax error at line ${tok.line}: expected expression, found '${tok.lexeme || tok.type}'`);
  }

  const ast = parseProgram();
  return { tokens, ast };
}

function buildParseTreeData(root) {
  function normalizeKindLabel(nodeValue) {
    if (nodeValue.kind === "Program") return "code";
    if (nodeValue.kind === "VarDecl") return "declaration";
    if (nodeValue.kind === "Assign") return "=";
    if (nodeValue.kind === "Print") return "dikhao";
    if (nodeValue.kind === "IfStmt") return "agar";
    if (nodeValue.kind === "WhileStmt") return "jabtak";
    if (nodeValue.kind === "Block") return "block";
    if (nodeValue.kind === "UnaryExpr" || nodeValue.kind === "BinaryExpr") return String(nodeValue.value || "expr");
    return nodeValue.kind;
  }

  function visibleChildren(nodeValue) {
    const children = nodeValue.children || [];
    if (nodeValue.kind === "Program") {
      const stmtList = children[0];
      return (stmtList?.children || []).filter(Boolean);
    }
    if (nodeValue.kind === "StmtList") {
      return children.filter(Boolean);
    }
    if (nodeValue.kind === "VarDecl") {
      return children.filter((c) => c && c.kind !== "NoInit");
    }
    if (nodeValue.kind === "IfStmt") {
      return children.filter((c) => c && c.kind !== "NoElse");
    }
    return children.filter(Boolean);
  }

  function toTree(nodeValue) {
    if (["Identifier", "IntLiteral", "FloatLiteral", "StringLiteral", "BoolLiteral", "Type"].includes(nodeValue.kind)) {
      return {
        label: String(nodeValue.value),
        children: [],
      };
    }

    const label = normalizeKindLabel(nodeValue);
    return {
      label,
      children: visibleChildren(nodeValue).map(toTree),
    };
  }

  return toTree(root.kind === "Program" ? root : node("Program", null, [root]));
}

function executeAst(ast) {
  const env = new Map();
  const output = [];
  const maxLoopIterations = 100000;

  function runtimeError(message) {
    throw new Error(`Runtime error: ${message}`);
  }

  function toBool(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") return value.length > 0;
    return Boolean(value);
  }

  function toNumber(value, op) {
    if (typeof value === "number") return value;
    runtimeError(`operator '${op}' requires numeric operands`);
  }

  function formatValue(value) {
    if (typeof value === "boolean") return value ? "true" : "false";
    return String(value);
  }

  function castToType(typeName, value) {
    if (typeName === "int") {
      if (typeof value !== "number") runtimeError("int assignment requires a numeric value");
      return Math.trunc(value);
    }
    if (typeName === "float") {
      if (typeof value !== "number") runtimeError("float assignment requires a numeric value");
      return value;
    }
    if (typeName === "string") {
      return String(value);
    }
    if (typeName === "bool") {
      return toBool(value);
    }
    return value;
  }

  function defaultValueForType(typeName) {
    if (typeName === "int" || typeName === "float") return 0;
    if (typeName === "string") return "";
    if (typeName === "bool") return false;
    return null;
  }

  function getIdentifier(nodeValue) {
    const name = nodeValue?.value;
    if (!env.has(name)) {
      runtimeError(`undefined variable '${name}'`);
    }
    return env.get(name);
  }

  function evalExpr(expr) {
    if (!expr) return null;

    if (expr.kind === "Identifier") {
      return getIdentifier(expr).value;
    }

    if (expr.kind === "IntLiteral") return Number.parseInt(expr.value, 10);
    if (expr.kind === "FloatLiteral") return Number.parseFloat(expr.value);
    if (expr.kind === "StringLiteral") return String(expr.value);
    if (expr.kind === "BoolLiteral") return String(expr.value) === "true";

    if (expr.kind === "UnaryExpr") {
      const operand = evalExpr(expr.children?.[0]);
      if (expr.value === "not") return !toBool(operand);
      if (expr.value === "neg") return -toNumber(operand, "-");
      runtimeError(`unsupported unary operator '${expr.value}'`);
    }

    if (expr.kind === "BinaryExpr") {
      const op = expr.value;
      if (op === "and") {
        return toBool(evalExpr(expr.children?.[0])) && toBool(evalExpr(expr.children?.[1]));
      }
      if (op === "or") {
        return toBool(evalExpr(expr.children?.[0])) || toBool(evalExpr(expr.children?.[1]));
      }

      const left = evalExpr(expr.children?.[0]);
      const right = evalExpr(expr.children?.[1]);

      if (op === "+") {
        if (typeof left === "string" || typeof right === "string") {
          return String(left) + String(right);
        }
        return toNumber(left, "+") + toNumber(right, "+");
      }
      if (op === "-") return toNumber(left, "-") - toNumber(right, "-");
      if (op === "*") return toNumber(left, "*") * toNumber(right, "*");
      if (op === "/") return toNumber(left, "/") / toNumber(right, "/");
      if (op === "%") return toNumber(left, "%") % toNumber(right, "%");
      if (op === "==") return left === right;
      if (op === "!=") return left !== right;
      if (op === ">") return toNumber(left, ">") > toNumber(right, ">");
      if (op === "<") return toNumber(left, "<") < toNumber(right, "<");
      if (op === ">=") return toNumber(left, ">=") >= toNumber(right, ">=");
      if (op === "<=") return toNumber(left, "<=") <= toNumber(right, "<=");

      runtimeError(`unsupported binary operator '${op}'`);
    }

    runtimeError(`unsupported expression node '${expr.kind}'`);
  }

  function executeStmt(stmt) {
    if (!stmt) return;

    if (stmt.kind === "VarDecl") {
      const typeName = stmt.children?.[0]?.value;
      const varName = stmt.children?.[1]?.value;
      const initNode = stmt.children?.[2];
      let value = defaultValueForType(typeName);
      if (initNode && initNode.kind !== "NoInit") {
        value = castToType(typeName, evalExpr(initNode));
      }
      env.set(varName, { type: typeName, value });
      return;
    }

    if (stmt.kind === "Assign") {
      const varName = stmt.children?.[0]?.value;
      if (!env.has(varName)) {
        runtimeError(`undefined variable '${varName}'`);
      }
      const record = env.get(varName);
      const rhs = evalExpr(stmt.children?.[1]);
      record.value = castToType(record.type, rhs);
      env.set(varName, record);
      return;
    }

    if (stmt.kind === "Print") {
      const value = evalExpr(stmt.children?.[0]);
      output.push(formatValue(value));
      return;
    }

    if (stmt.kind === "Block") {
      const stmtList = stmt.children?.[0];
      for (const inner of stmtList?.children || []) {
        executeStmt(inner);
      }
      return;
    }

    if (stmt.kind === "IfStmt") {
      const cond = evalExpr(stmt.children?.[0]);
      if (toBool(cond)) {
        executeStmt(stmt.children?.[1]);
      } else {
        const elseStmt = stmt.children?.[2];
        if (elseStmt && elseStmt.kind !== "NoElse") {
          executeStmt(elseStmt);
        }
      }
      return;
    }

    if (stmt.kind === "WhileStmt") {
      let iterations = 0;
      while (toBool(evalExpr(stmt.children?.[0]))) {
        executeStmt(stmt.children?.[1]);
        iterations += 1;
        if (iterations > maxLoopIterations) {
          runtimeError("loop iteration limit exceeded");
        }
      }
      return;
    }

    if (stmt.kind === "StmtList") {
      for (const inner of stmt.children || []) {
        executeStmt(inner);
      }
      return;
    }

    runtimeError(`unsupported statement node '${stmt.kind}'`);
  }

  const stmtList = ast?.children?.[0];
  executeStmt(stmtList);
  return { output };
}



module.exports = {
  lexSource,
  parseSource,
  buildParseTreeData,
  executeAst,
};

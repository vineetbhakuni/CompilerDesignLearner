class SemanticAnalyzer {
  constructor() {
    this.scopes = [new Map()];
    this.scopeNames = ["global"];
    this.result = { symbolTable: [], errors: [] };
  }

  currentScope() {
    return this.scopes[this.scopes.length - 1];
  }

  currentScopeName() {
    return this.scopeNames[this.scopeNames.length - 1];
  }

  pushScope(name) {
    this.scopes.push(new Map());
    this.scopeNames.push(name);
  }

  popScope() {
    this.scopes.pop();
    this.scopeNames.pop();
  }

  declare(name, typeName) {
    const scope = this.currentScope();
    if (scope.has(name)) {
      this.result.errors.push(
        `Variable '${name}' already declared in scope '${this.currentScopeName()}'.`
      );
      return;
    }

    const sym = { name, typeName, scope: this.currentScopeName() };
    scope.set(name, sym);
    this.result.symbolTable.push({ name, type: typeName, scope: sym.scope });
  }

  lookup(name) {
    for (let i = this.scopes.length - 1; i >= 0; i -= 1) {
      if (this.scopes[i].has(name)) {
        return this.scopes[i].get(name);
      }
    }
    return null;
  }

  analyze(ast) {
    this.visitProgram(ast);
    return this.result;
  }

  visitProgram(node) {
    const stmtList = node?.children?.[0];
    if (stmtList) {
      this.visitStmtList(stmtList);
    }
  }

  visitStmtList(node) {
    for (const stmt of node.children || []) {
      this.visitStmt(stmt);
    }
  }

  visitStmt(node) {
    const kind = node?.kind;

    if (kind === "VarDecl") {
      this.visitDecl(node);
      return;
    }

    if (kind === "Assign") {
      this.visitAssign(node);
      return;
    }

    if (kind === "Print") {
      this.inferExprType(node.children[0]);
      return;
    }

    if (kind === "IfStmt") {
      const condT = this.inferExprType(node.children[0]);
      if (condT !== "bool") {
        this.result.errors.push("If condition must be of type bool.");
      }

      this.pushScope("if");
      this.visitStmt(node.children[1]);
      this.popScope();

      const elseNode = node.children[2];
      if (elseNode?.kind !== "NoElse") {
        this.pushScope("else");
        this.visitStmt(elseNode);
        this.popScope();
      }
      return;
    }

    if (kind === "WhileStmt") {
      const condT = this.inferExprType(node.children[0]);
      if (condT !== "bool") {
        this.result.errors.push("While condition must be of type bool.");
      }

      this.pushScope("while");
      this.visitStmt(node.children[1]);
      this.popScope();
      return;
    }

    if (kind === "Block") {
      this.pushScope("block");
      this.visitStmtList(node.children[0]);
      this.popScope();
    }
  }

  visitDecl(node) {
    const typeName = node.children[0]?.value;
    const ident = node.children[1]?.value;
    const init = node.children[2];

    this.declare(ident, typeName);

    if (init?.kind !== "NoInit") {
      const initT = this.inferExprType(init);
      if (!this.compatible(typeName, initT)) {
        this.result.errors.push(
          `Type mismatch in declaration of '${ident}': cannot assign ${initT} to ${typeName}.`
        );
      }
    }
  }

  visitAssign(node) {
    const ident = node.children[0]?.value;
    const expr = node.children[1];
    const sym = this.lookup(ident);

    if (!sym) {
      this.result.errors.push(`Variable '${ident}' used before declaration.`);
      this.inferExprType(expr);
      return;
    }

    const exprT = this.inferExprType(expr);
    if (!this.compatible(sym.typeName, exprT)) {
      this.result.errors.push(
        `Type mismatch in assignment to '${ident}': cannot assign ${exprT} to ${sym.typeName}.`
      );
    }
  }

  compatible(lhs, rhs) {
    if (lhs === rhs) {
      return true;
    }
    return lhs === "float" && rhs === "int";
  }

  inferExprType(node) {
    const kind = node?.kind;
    const value = node?.value;

    if (kind === "IntLiteral") {
      return "int";
    }
    if (kind === "FloatLiteral") {
      return "float";
    }
    if (kind === "StringLiteral") {
      return "string";
    }
    if (kind === "BoolLiteral") {
      return "bool";
    }

    if (kind === "Identifier") {
      const sym = this.lookup(value);
      if (!sym) {
        this.result.errors.push(`Variable '${value}' used before declaration.`);
        return "error";
      }
      return sym.typeName;
    }

    if (kind === "UnaryExpr") {
      const op = value;
      const t = this.inferExprType(node.children[0]);
      if (op === "not") {
        if (t !== "bool") {
          this.result.errors.push("Logical 'not' expects bool operand.");
        }
        return "bool";
      }
      if (op === "neg") {
        if (t !== "int" && t !== "float") {
          this.result.errors.push("Unary '-' expects numeric operand.");
          return "error";
        }
        return t;
      }
    }

    if (kind === "BinaryExpr") {
      const op = value;
      const leftT = this.inferExprType(node.children[0]);
      const rightT = this.inferExprType(node.children[1]);

      if (["+", "-", "*", "/", "%"].includes(op)) {
        if (!["int", "float"].includes(leftT) || !["int", "float"].includes(rightT)) {
          this.result.errors.push(`Arithmetic operator '${op}' expects numeric operands.`);
          return "error";
        }
        if (op === "%" && (leftT !== "int" || rightT !== "int")) {
          this.result.errors.push("Modulo '%' expects int operands.");
          return "error";
        }
        return leftT === "float" || rightT === "float" ? "float" : "int";
      }

      if ([">", "<", ">=", "<="].includes(op)) {
        if (!["int", "float"].includes(leftT) || !["int", "float"].includes(rightT)) {
          this.result.errors.push(`Relational operator '${op}' expects numeric operands.`);
          return "error";
        }
        return "bool";
      }

      if (["==", "!="].includes(op)) {
        if (leftT === rightT) {
          return "bool";
        }
        if ([leftT, rightT].every((t) => t === "int" || t === "float")) {
          return "bool";
        }
        this.result.errors.push(
          `Equality operator '${op}' has incompatible operands: ${leftT}, ${rightT}.`
        );
        return "error";
      }

      if (["and", "or"].includes(op)) {
        if (leftT !== "bool" || rightT !== "bool") {
          this.result.errors.push(`Logical operator '${op}' expects bool operands.`);
          return "error";
        }
        return "bool";
      }
    }

    return "error";
  }
}

class IRBuilder {
  constructor() {
    this.instructions = [];
    this.tempIdx = 0;
    this.labelIdx = 0;
  }

  newTemp() {
    this.tempIdx += 1;
    return `t${this.tempIdx}`;
  }

  newLabel(prefix = "L") {
    this.labelIdx += 1;
    return `${prefix}${this.labelIdx}`;
  }

  emit(ins) {
    this.instructions.push(ins);
  }
}

function generateIR(ast) {
  const builder = new IRBuilder();
  const stmtList = ast.children[0];
  genStmtList(stmtList, builder);
  return builder.instructions;
}

function genStmtList(node, builder) {
  for (const stmt of node.children || []) {
    genStmt(stmt, builder);
  }
}

function genStmt(node, builder) {
  const kind = node.kind;

  if (kind === "VarDecl") {
    const name = node.children[1].value;
    const init = node.children[2];
    if (init.kind !== "NoInit") {
      const src = genExpr(init, builder);
      builder.emit({ type: "assign", target: name, value: src });
    }
    return;
  }

  if (kind === "Assign") {
    const name = node.children[0].value;
    const src = genExpr(node.children[1], builder);
    builder.emit({ type: "assign", target: name, value: src });
    return;
  }

  if (kind === "Print") {
    const src = genExpr(node.children[0], builder);
    builder.emit({ type: "print", value: src });
    return;
  }

  if (kind === "Block") {
    genStmtList(node.children[0], builder);
    return;
  }

  if (kind === "IfStmt") {
    const cond = genExpr(node.children[0], builder);
    const elseLabel = builder.newLabel("ELSE");
    const endLabel = builder.newLabel("ENDIF");

    builder.emit({ type: "ifFalse", cond, label: elseLabel });
    genStmt(node.children[1], builder);
    builder.emit({ type: "goto", label: endLabel });
    builder.emit({ type: "label", label: elseLabel });

    const elseNode = node.children[2];
    if (elseNode.kind !== "NoElse") {
      genStmt(elseNode, builder);
    }

    builder.emit({ type: "label", label: endLabel });
    return;
  }

  if (kind === "WhileStmt") {
    const startLabel = builder.newLabel("WHILE");
    const endLabel = builder.newLabel("ENDWH");

    builder.emit({ type: "label", label: startLabel });
    const cond = genExpr(node.children[0], builder);
    builder.emit({ type: "ifFalse", cond, label: endLabel });
    genStmt(node.children[1], builder);
    builder.emit({ type: "goto", label: startLabel });
    builder.emit({ type: "label", label: endLabel });
  }
}

function genExpr(node, builder) {
  const kind = node.kind;

  if (["IntLiteral", "FloatLiteral", "BoolLiteral", "StringLiteral"].includes(kind)) {
    return { kind: "const", value: node.value, type: kind };
  }

  if (kind === "Identifier") {
    return { kind: "var", name: node.value };
  }

  if (kind === "UnaryExpr") {
    const src = genExpr(node.children[0], builder);
    const t = builder.newTemp();
    builder.emit({ type: "unop", target: t, op: node.value, arg: src });
    return { kind: "temp", name: t };
  }

  if (kind === "BinaryExpr") {
    const left = genExpr(node.children[0], builder);
    const right = genExpr(node.children[1], builder);
    const t = builder.newTemp();
    builder.emit({ type: "binop", target: t, op: node.value, left, right });
    return { kind: "temp", name: t };
  }

  throw new Error(`Unsupported expression node: ${kind}`);
}

function renderOperand(op) {
  if (op.kind === "const") {
    if (op.type === "StringLiteral") {
      return `\"${op.value}\"`;
    }
    return String(op.value);
  }
  if (op.kind === "var" || op.kind === "temp") {
    return op.name;
  }
  return "?";
}

function renderIR(instructions) {
  const lines = [];

  for (const ins of instructions) {
    if (ins.type === "assign") {
      lines.push(`${ins.target} = ${renderOperand(ins.value)}`);
    } else if (ins.type === "binop") {
      lines.push(`${ins.target} = ${renderOperand(ins.left)} ${ins.op} ${renderOperand(ins.right)}`);
    } else if (ins.type === "unop") {
      lines.push(`${ins.target} = ${ins.op} ${renderOperand(ins.arg)}`);
    } else if (ins.type === "ifFalse") {
      lines.push(`ifFalse ${renderOperand(ins.cond)} goto ${ins.label}`);
    } else if (ins.type === "goto") {
      lines.push(`goto ${ins.label}`);
    } else if (ins.type === "label") {
      lines.push(`${ins.label}:`);
    } else if (ins.type === "print") {
      lines.push(`print ${renderOperand(ins.value)}`);
    }
  }

  return lines.join("\n");
}

function tryParseNumber(s) {
  if (typeof s !== "string") {
    return Number.isFinite(s) ? s : null;
  }

  if (s.trim() === "") {
    return null;
  }

  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function foldBinary(op, lval, rval) {
  if (op === "+") return lval + rval;
  if (op === "-") return lval - rval;
  if (op === "*") return lval * rval;
  if (op === "/") return lval / rval;
  if (op === "%") return lval % rval;
  if (op === ">") return lval > rval;
  if (op === "<") return lval < rval;
  if (op === ">=") return lval >= rval;
  if (op === "<=") return lval <= rval;
  if (op === "==") return lval === rval;
  if (op === "!=") return lval !== rval;
  if (op === "and") return Boolean(lval) && Boolean(rval);
  if (op === "or") return Boolean(lval) || Boolean(rval);
  throw new Error(op);
}

function foldUnary(op, val) {
  if (op === "neg") return -val;
  if (op === "not") return !Boolean(val);
  throw new Error(op);
}

function constOperand(value) {
  if (typeof value === "boolean") {
    return { kind: "const", value: value ? "true" : "false", type: "BoolLiteral" };
  }
  if (Number.isInteger(value)) {
    return { kind: "const", value: String(value), type: "IntLiteral" };
  }
  if (typeof value === "number") {
    return { kind: "const", value: String(value), type: "FloatLiteral" };
  }
  return { kind: "const", value: String(value), type: "StringLiteral" };
}

function resolveConst(opr, constMap) {
  if (opr.kind === "const") {
    const v = opr.value;
    if (opr.type === "BoolLiteral") {
      return v === "true";
    }

    const n = tryParseNumber(v);
    return n !== null ? n : v;
  }

  if (opr.kind === "var" || opr.kind === "temp") {
    return constMap.get(opr.name);
  }

  return null;
}

function optimizeIR(instructions) {
  const optimized = [];
  const constMap = new Map();

  for (const ins of instructions) {
    const t = ins.type;

    if (t === "label") {
      constMap.clear();
      optimized.push(ins);
      continue;
    }

    if (t === "binop") {
      const lconst = resolveConst(ins.left, constMap);
      const rconst = resolveConst(ins.right, constMap);
      if (lconst !== null && rconst !== null) {
        const folded = foldBinary(ins.op, lconst, rconst);
        const newIns = { type: "assign", target: ins.target, value: constOperand(folded) };
        constMap.set(ins.target, folded);
        optimized.push(newIns);
        continue;
      }
      constMap.delete(ins.target);
      optimized.push(ins);
      continue;
    }

    if (t === "unop") {
      const aconst = resolveConst(ins.arg, constMap);
      if (aconst !== null) {
        const folded = foldUnary(ins.op, aconst);
        const newIns = { type: "assign", target: ins.target, value: constOperand(folded) };
        constMap.set(ins.target, folded);
        optimized.push(newIns);
        continue;
      }
      constMap.delete(ins.target);
      optimized.push(ins);
      continue;
    }

    if (t === "assign") {
      const vconst = resolveConst(ins.value, constMap);
      if (vconst !== null) {
        constMap.set(ins.target, vconst);
      } else {
        constMap.delete(ins.target);
      }
      optimized.push(ins);
      continue;
    }

    if (t === "ifFalse" || t === "goto") {
      constMap.clear();
      optimized.push(ins);
      continue;
    }

    optimized.push(ins);
  }

  return removeRedundantGoto(optimized);
}

function removeRedundantGoto(instructions) {
  const out = [];
  for (let i = 0; i < instructions.length; i += 1) {
    const ins = instructions[i];
    if (ins.type === "goto" && i + 1 < instructions.length) {
      const next = instructions[i + 1];
      if (next.type === "label" && next.label === ins.label) {
        continue;
      }
    }
    out.push(ins);
  }
  return out;
}

function generateTargetCode(instructions) {
  const lines = [];
  const opMap = {
    "+": "ADD",
    "-": "SUB",
    "*": "MUL",
    "/": "DIV",
    "%": "MOD",
    ">": "CMPGT",
    "<": "CMPLT",
    ">=": "CMPGE",
    "<=": "CMPLE",
    "==": "CMPEQ",
    "!=": "CMPNE",
    and: "AND",
    or: "OR",
  };

  for (const ins of instructions) {
    if (ins.type === "label") {
      lines.push(`${ins.label}:`);
    } else if (ins.type === "assign") {
      lines.push(`MOV ${ins.target}, ${renderOperand(ins.value)}`);
    } else if (ins.type === "binop") {
      const op = opMap[ins.op] || "OP";
      lines.push(`${op} ${ins.target}, ${renderOperand(ins.left)}, ${renderOperand(ins.right)}`);
    } else if (ins.type === "unop") {
      if (ins.op === "neg") {
        lines.push(`NEG ${ins.target}, ${renderOperand(ins.arg)}`);
      } else {
        lines.push(`NOT ${ins.target}, ${renderOperand(ins.arg)}`);
      }
    } else if (ins.type === "ifFalse") {
      lines.push(`JZ ${renderOperand(ins.cond)}, ${ins.label}`);
    } else if (ins.type === "goto") {
      lines.push(`JMP ${ins.label}`);
    } else if (ins.type === "print") {
      lines.push(`PRINT ${renderOperand(ins.value)}`);
    }
  }

  return lines.join("\n");
}

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

function formatParseTree(root) {
  const lines = [];

  function walk(nodeValue, depth) {
    const indent = "  ".repeat(depth);
    const text = nodeValue.value !== undefined ? `${nodeValue.kind}(${nodeValue.value})` : nodeValue.kind;
    lines.push(`${indent}${text}`);
    for (const child of nodeValue.children || []) {
      walk(child, depth + 1);
    }
  }

  walk(root, 0);
  return lines.join("\n");
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

function evalOperand(op, env) {
  if (!op) {
    return undefined;
  }

  if (op.kind === "const") {
    if (op.type === "IntLiteral" || op.type === "FloatLiteral") {
      return Number(op.value);
    }
    if (op.type === "BoolLiteral") {
      return String(op.value) === "true";
    }
    return String(op.value);
  }

  if (op.kind === "var" || op.kind === "temp") {
    return env.get(op.name);
  }

  return undefined;
}

function executeIR(instructions, maxSteps = 2000000) {
  const outputs = [];
  const env = new Map();
  const labels = new Map();

  for (let i = 0; i < instructions.length; i += 1) {
    if (instructions[i].type === "label") {
      labels.set(instructions[i].label, i);
    }
  }

  let ip = 0;
  let steps = 0;
  while (ip < instructions.length) {
    steps += 1;
    if (steps > maxSteps) {
      throw new Error("Execution aborted: too many steps (possible infinite loop).");
    }

    const ins = instructions[ip];
    if (ins.type === "label") {
      ip += 1;
      continue;
    }

    if (ins.type === "assign") {
      env.set(ins.target, evalOperand(ins.value, env));
      ip += 1;
      continue;
    }

    if (ins.type === "binop") {
      const l = evalOperand(ins.left, env);
      const r = evalOperand(ins.right, env);
      env.set(ins.target, foldBinary(ins.op, l, r));
      ip += 1;
      continue;
    }

    if (ins.type === "unop") {
      const v = evalOperand(ins.arg, env);
      env.set(ins.target, foldUnary(ins.op, v));
      ip += 1;
      continue;
    }

    if (ins.type === "ifFalse") {
      const cond = evalOperand(ins.cond, env);
      if (!cond) {
        if (!labels.has(ins.label)) {
          throw new Error(`Execution error: missing label '${ins.label}'.`);
        }
        ip = labels.get(ins.label);
      } else {
        ip += 1;
      }
      continue;
    }

    if (ins.type === "goto") {
      if (!labels.has(ins.label)) {
        throw new Error(`Execution error: missing label '${ins.label}'.`);
      }
      ip = labels.get(ins.label);
      continue;
    }

    if (ins.type === "print") {
      const value = evalOperand(ins.value, env);
      outputs.push(String(value));
      ip += 1;
      continue;
    }

    ip += 1;
  }

  return outputs;
}

module.exports = {
  SemanticAnalyzer,
  generateIR,
  optimizeIR,
  renderIR,
  generateTargetCode,
  lexSource,
  parseSource,
  formatParseTree,
  buildParseTreeData,
  executeIR,
};

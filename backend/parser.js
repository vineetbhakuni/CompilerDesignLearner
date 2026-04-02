const { lexSource } = require("./lexer");

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

module.exports = {
  parseSource,
};
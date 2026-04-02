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

module.exports = {
  lexSource,
};
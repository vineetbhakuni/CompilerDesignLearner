# Hinglish-lang Web Compiler

A complete web-based compiler pipeline for a custom C-like language with Hindi/English mixed keywords.

- Phase 1: Lexical Analysis (Flex)
- Phase 2: Syntax Analysis + Parse Tree (Bison)
- The web app currently exposes the lexer, parser, and compiler views in the browser.

## 1) Hinglish-lang Language Specification

### Data Types
- `int`
- `float`
- `string`
- `bool`

### Keywords
- `rakho` -> declaration
- `agar` -> if
- `warna` -> else
- `jabtak` -> while
- `dikhao` -> print

### Logical Keywords
- `and` or `aur`
- `or` or `ya`
- `not` or `nahi`

### Boolean Literals
- `sahi` / `true`
- `galat` / `false`

### Example Syntax

```hgl
rakho int x = 5;
rakho float pi = 3.14;
rakho bool ok = sahi;

agar (x > 0 and ok) {
    dikhao("positive");
} warna {
    dikhao("non-positive");
}

jabtak (x < 10) {
    x = x + 1;
}
```

### Supported Constructs
- declarations and assignments
- arithmetic, relational, logical expressions
- blocks `{ ... }`
- if-else
- while loop
- comments: `//` and `/* ... */`

## 2) Project Structure

```text
hinglish-lang-compiler/
  compiler/
    lexer.l
    lexer_tokens.l
    parser.y
    ast.h
    ast.c
    Makefile
  backend/
    server.js
    pipeline.js
    run_sample.js
    package.json
    static/
      style.css
      operation.js
  examples/
    sample.hgl
```

## 3) Prerequisites

### Linux / macOS / WSL
Install build tools + Flex/Bison + Node.js:

- Ubuntu/Debian:
  - `sudo apt update`
  - `sudo apt install -y build-essential flex bison nodejs npm`
- macOS (Homebrew):
  - `brew install flex bison`
  - `xcode-select --install` (if needed)

## 4) Build and Run

### Step A (Optional): Build Flex/Bison compiler front-end

```bash
cd compiler
make
```

This creates two binaries:
- `parser` (phase 2 AST + tree)
- `lexer_tokens` (phase 1 tokens)

If these binaries are not available, the backend automatically uses an in-built JavaScript lexer+parser fallback so the project still runs fully.

### Step B: Install backend dependencies

```bash
cd ../backend
npm install
```

### Step C: Run web server

```bash
npm start
```

Open:
- Check terminal output for the selected URL. By default it starts at `http://127.0.0.1:5000` and automatically retries higher ports if busy (`5001`, `5002`, ...).

Navigation:
- `/` dashboard page (entry point)
- `/operation/compiler` full compiler run with runtime output
- `/operation/lexer` lexical analysis page
- `/operation/parser` parse-tree drawing page

## 5) Web Interface Behavior

- Dashboard as the landing page
- Each operation page has its own Monaco editor and output panel
- Lexical analysis shows table output (Line, Lexeme, Type)
- Parse tree is rendered as a drawn tree (SVG), not AST JSON
- The compiler page returns runtime output from the internal pipeline

## 6) Compiler Pipeline Integration

1. Browser sends source to one independent endpoint per operation:
  - `/api/compiler`
  - `/api/lexer`
  - `/api/parser`
2. JavaScript lexer/parser in `pipeline.js` parses source input
3. Compiler page executes the internal pipeline and returns runtime program output
4. Backend returns operation-specific output to the same page

## 7) Example Program and Expected Outputs

Example input: `examples/sample.hgl`

### Phase 1 (Token sample)

```json
[
  {"line":1, "type":"RAKHO", "lexeme":"rakho"},
  {"line":1, "type":"TYPE_INT", "lexeme":"int"},
  {"line":1, "type":"IDENT", "lexeme":"x"},
  {"line":1, "type":"ASSIGN", "lexeme":"="},
  {"line":1, "type":"INT_LIT", "lexeme":"5"}
]
```

### Phase 2 (Tree sample)

```text
Program
  StmtList
    VarDecl
      Type: int
      Identifier: x
      IntLiteral: 5
    ...
```

### Compiler Output

The browser compiler page runs the language through the internal pipeline and returns the program output.

### Example Runtime Result

```text
15
done
```

## 8) Error Handling

- Lexical errors: unknown characters with line number
- Syntax errors: Bison parse errors with approximate line
- Internal validation still checks declarations and types before runtime output.



## 9) Quick CLI Validation

After building binaries, run:

```bash
cd backend
node run_sample.js
```

This prints the lexer, parser, and compiler validation flow in terminal.
# Hinglish-lang Web Compiler

A complete web-based compiler pipeline for a custom C-like language with Hindi/English mixed keywords.

- Phase 1: Lexical Analysis (Flex)
- Phase 2: Syntax Analysis + Parse Tree (Bison)
- Phase 3: Semantic Analysis (JavaScript)
- Phase 4: Intermediate Code Generation (JavaScript TAC)
- Phase 5: Optimization (JavaScript constant folding + small cleanup)
- Phase 6: Code Generation (JavaScript pseudo assembly)

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
    templates/
      dashboard.html
      operation.html
    static/
      style.css
      operation.js
  examples/
    sample.hgl
    semantic_error.hgl
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
- `/operation/semantic` symbol table page
- `/operation/intermediate` intermediate code page
- `/operation/codegen` target code generation page

## 5) Web Interface Behavior

- Dashboard as the landing page
- Each operation page has its own Monaco editor and output panel
- Lexical analysis shows table output (Line, Lexeme, Type)
- Parse tree is rendered as a drawn tree (SVG), not AST JSON
- Symbol table is rendered in a clean table UI

## 6) Compiler Pipeline Integration

1. Browser sends source to one independent endpoint per operation:
  - `/api/compiler`
  - `/api/lexer`
  - `/api/parser`
  - `/api/semantic`
  - `/api/intermediate`
  - `/api/codegen`
2. JavaScript lexer/parser in `pipeline.js` parses source input
3. Semantic analysis, IR, optimization, and code generation run in `pipeline.js`
4. Compiler page executes IR and returns runtime program output
5. Backend returns operation-specific output to the same page

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

### Phase 3 (Semantic sample)

```json
{
  "status": "OK",
  "symbolTable": [
    {"name":"x", "type":"int", "scope":"global"},
    {"name":"y", "type":"int", "scope":"global"},
    {"name":"z", "type":"int", "scope":"global"},
    {"name":"flag", "type":"bool", "scope":"global"}
  ],
  "errors": []
}
```

### Phase 4 (Three-address code sample)

```text
x = 5
y = 10
flag = true
t1 = x < y
t2 = t1 and flag
ifFalse t2 goto ELSE1
t3 = x + y
z = t3
print z
goto ENDIF2
ELSE1:
t4 = y - x
z = t4
print z
ENDIF2:
WHILE3:
t5 = z < 20
ifFalse t5 goto ENDWH4
t6 = z + 1
z = t6
goto WHILE3
ENDWH4:
print "done"
```

### Phase 5 (Optimization sample)

```text
x = 5
y = 10
flag = true
...
```

### Phase 6 (Target code sample)

```text
MOV x, 5
MOV y, 10
MOV flag, true
CMPLT t1, x, y
AND t2, t1, flag
JZ t2, ELSE1
ADD t3, x, y
MOV z, t3
PRINT z
...
```

## 8) Error Handling

- Lexical errors: unknown characters with line number
- Syntax errors: Bison parse errors with approximate line
- Semantic errors:
  - use before declaration
  - redeclaration in same scope
  - type mismatch in assignment/declaration
  - invalid expression types

Try `examples/semantic_error.hgl` to see semantic failure.

## 9) Quick CLI Validation

After building binaries, run:

```bash
cd backend
node run_sample.js
```

This prints outputs for all six phases in terminal.

## 10) Notes

- The target code is pseudo assembly for educational demonstration.
- The parse tree is textual; AST JSON is also shown.
- This is designed to be self-contained and open-source friendly.

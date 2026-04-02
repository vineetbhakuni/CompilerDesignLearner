# Hinglish-lang Web Compiler

A web-based compiler pipeline for a custom C-like language with Hindi/English mixed keywords.

- Phase 1: Lexical Analysis (JavaScript lexer)
- Phase 2: Syntax Analysis + Parse Tree (JavaScript parser)
- Phase 3: Runtime execution for `dikhao` output

## Language Specification

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

## Project Structure

```text
hinglish-lang-compiler/
  backend/
    server.js
    lexer.js
    parser.js
    treeDataBuilder.js
    executor.js
    package.json
    static/
      style.css
      operation.js
  examples/
    sample.hgl
  index.html
  operations.html
```

## Run

```bash
cd backend
npm install
npm start
```

Open the URL shown in the terminal, usually `http://127.0.0.1:5000`.

## Web Interface

- `/` dashboard page
- `/operation/compiler` full compiler run with runtime output
- `/operation/lexer` lexical analysis page
- `/operation/parser` parse-tree drawing page

## Compiler Flow

1. Browser sends source to `/api/compiler`, `/api/lexer`, or `/api/parser`
2. `lexer.js` tokenizes the input
3. `parser.js` builds the AST
4. `treeDataBuilder.js` converts AST into browser tree data
5. `executor.js` runs the AST and returns printed output

## Example Program

Use `examples/sample.hgl` for a demo that covers declarations, conditionals, loops, and print output.

## Error Handling

- Lexical errors: unknown characters with line number
- Syntax errors: parser errors with approximate line
- Runtime errors: invalid variable use, type mismatch, or infinite loop guard
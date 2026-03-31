const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  SemanticAnalyzer,
  generateIR,
  optimizeIR,
  renderIR,
  generateTargetCode,
} = require("./pipeline");

const baseDir = path.resolve(__dirname, "..");
const compilerDir = path.join(baseDir, "compiler");
const samplePath = path.join(baseDir, "examples", "sample.hgl");

function resolveBinary(name) {
  const candidates = [path.join(compilerDir, name), path.join(compilerDir, `${name}.exe`)];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function run(cmd, args) {
  const proc = spawnSync(cmd, args, { encoding: "utf8" });
  return {
    code: proc.status === null ? 1 : proc.status,
    stdout: proc.stdout || "",
    stderr: proc.stderr || proc.error?.message || "",
  };
}

function parseTokens(raw) {
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    const parts = line.split("\t", 3);
    if (parts.length === 3) {
      const lineNo = Number(parts[0]);
      if (Number.isInteger(lineNo)) {
        out.push({ line: lineNo, type: parts[1], lexeme: parts[2] });
      }
    }
  }
  return out;
}

function main() {
  const lexer = resolveBinary("lexer_tokens");
  const parser = resolveBinary("parser");

  if (!fs.existsSync(samplePath)) {
    console.error("Missing examples/sample.hgl");
    process.exit(1);
  }

  if (!lexer || !parser) {
    console.error("Missing binaries. Build with: cd compiler && make");
    process.exit(1);
  }

  const lex = run(lexer, [samplePath]);
  if (lex.code !== 0) {
    console.error("Phase 1 failed");
    console.error(lex.stderr);
    process.exit(1);
  }
  const tokens = parseTokens(lex.stdout);

  const astJson = run(parser, [samplePath, "--json"]);
  if (astJson.code !== 0) {
    console.error("Phase 2 failed");
    console.error(astJson.stderr);
    process.exit(1);
  }

  const astTree = run(parser, [samplePath, "--tree"]);
  if (astTree.code !== 0) {
    console.error("Phase 2 tree failed");
    console.error(astTree.stderr);
    process.exit(1);
  }

  const ast = JSON.parse(astJson.stdout);
  const sem = new SemanticAnalyzer().analyze(ast);

  console.log("=== Phase 1: Lexical Analysis ===");
  console.log(JSON.stringify(tokens, null, 2));

  console.log("\n=== Phase 2: Syntax Analysis (AST JSON) ===");
  console.log(JSON.stringify(ast, null, 2));
  console.log("\n=== Phase 2: Parse Tree (text) ===");
  console.log(astTree.stdout);

  console.log("\n=== Phase 3: Semantic Analysis ===");
  console.log(JSON.stringify({ symbolTable: sem.symbolTable, errors: sem.errors }, null, 2));
  if (sem.errors.length > 0) {
    process.exit(1);
  }

  const ir = generateIR(ast);
  console.log("\n=== Phase 4: Intermediate Code ===");
  console.log(renderIR(ir));

  const optimized = optimizeIR(ir);
  console.log("\n=== Phase 5: Optimization ===");
  console.log(renderIR(optimized));

  console.log("\n=== Phase 6: Code Generation ===");
  console.log(generateTargetCode(optimized));
}

main();

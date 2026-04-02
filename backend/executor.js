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
  executeAst,
};
function buildParseTreeData(root) {
  function node(kind, value = null, children = []) {
    const n = { kind, children };
    if (value !== null && value !== undefined) {
      n.value = value;
    }
    return n;
  }

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

module.exports = {
  buildParseTreeData,
};
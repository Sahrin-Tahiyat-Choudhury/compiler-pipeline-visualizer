// ============================================================
// SEMANTIC ANALYZER
// Walks the AST *after* parsing and checks whether the program
// actually "makes sense" — things a parser can't catch because
// they're not about grammar/structure, they're about meaning.
//
// Rules enforced here:
//   1. A variable must be declared before it is used.
//   2. A variable cannot be declared twice.
//   3. print() must receive a valid expression (parser already
//      guarantees this structurally, we just double check).
//   4. Only integers exist — every value in this language is an
//      int by definition, so there's no type mismatch to check,
//      but we still record type: "int" in the symbol table to
//      keep the analyzer honest and to show the concept.
//
// This version uses ONE global scope (no blocks/functions in
// our language yet), so the symbol table is just a flat map.
// ============================================================

class SemanticError extends Error {
  constructor(message, line) {
    super(message);
    this.name = "SemanticError";
    this.stage = "semantic";
    this.line = line;
  }
}

/**
 * The Symbol Table: a record of every variable declared so far.
 * Key   = variable name (string)
 * Value = { name, type, declaredLine }
 *
 * Think of it as the analyzer's "memory" of what has been
 * declared while it reads through the program top to bottom.
 */
function createSymbolTable() {
  const table = new Map();

  return {
    declare(name, type, line) {
      table.set(name, { name, type, declaredLine: line });
    },
    has(name) {
      return table.has(name);
    },
    get(name) {
      return table.get(name);
    },
    // Returns entries in declaration order, for display in the UI.
    entries() {
      return Array.from(table.values());
    }
  };
}

/**
 * Analyze an AST produced by parser.js.
 * @param {object} ast - Program node
 * @returns {{ symbolTable: Array<object> }}
 * @throws {SemanticError} on the first rule violation found
 */
function analyze(ast) {
  const symbolTable = createSymbolTable();

  for (const statement of ast.body) {
    analyzeStatement(statement, symbolTable);
  }

  return {
    symbolTable: symbolTable.entries()
  };
}

function analyzeStatement(node, symbolTable) {
  switch (node.type) {
    case "VarDeclaration":
      analyzeVarDeclaration(node, symbolTable);
      break;
    case "PrintStatement":
      analyzePrintStatement(node, symbolTable);
      break;
    default:
      // Should never happen if the parser only produces known
      // node types, but fail loudly instead of silently passing.
      throw new SemanticError(
        `Internal error: unknown statement type "${node.type}"`,
        node.line
      );
  }
}

// Rule 2: no redeclaration.
// We check the expression BEFORE declaring the name, so that
// `let x = x + 1;` correctly fails if x wasn't already declared
// (the right-hand side is evaluated using the OLD symbol table).
function analyzeVarDeclaration(node, symbolTable) {
  analyzeExpression(node.value, symbolTable);

  if (symbolTable.has(node.name)) {
    const existing = symbolTable.get(node.name);
    throw new SemanticError(
      `Variable '${node.name}' is already declared (first declared on line ${existing.declaredLine})`,
      node.line
    );
  }

  symbolTable.declare(node.name, "int", node.line);
}

// Rule 3: print() must receive a valid expression.
// The parser already guarantees `node.value` is an expression
// node (never undefined) — this call just makes sure that
// expression itself is semantically valid (e.g. no undeclared
// variables inside it).
function analyzePrintStatement(node, symbolTable) {
  analyzeExpression(node.value, symbolTable);
}

// Rule 1: variable must be declared before use.
// Recursively walks expression nodes looking for Identifiers.
function analyzeExpression(node, symbolTable) {
  switch (node.type) {
    case "NumberLiteral":
      // Always valid — rule 4 is automatically satisfied since
      // the lexer/parser only ever produce integer literals.
      return;

    case "Identifier":
      if (!symbolTable.has(node.name)) {
        throw new SemanticError(
          `Variable '${node.name}' is not declared`,
          node.line
        );
      }
      return;

    case "BinaryExpression":
      analyzeExpression(node.left, symbolTable);
      analyzeExpression(node.right, symbolTable);
      return;

    default:
      throw new SemanticError(
        `Internal error: unknown expression type "${node.type}"`,
        node.line
      );
  }
}

module.exports = { analyze, SemanticError, createSymbolTable };
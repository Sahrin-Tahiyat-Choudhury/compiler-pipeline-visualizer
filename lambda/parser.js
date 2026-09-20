// ============================================================
// PARSER
// Converts a flat list of tokens (from the lexer) into a tree
// structure called an AST (Abstract Syntax Tree). The AST
// represents the *grammatical structure* of the program.
//
// Grammar (EBNF) this parser implements:
//
//   program     ::= statement* EOF
//   statement   ::= letStmt | printStmt
//   letStmt     ::= "let" IDENTIFIER "=" expression ";"
//   printStmt   ::= "print" "(" expression ")" ";"
//   expression  ::= term (("+" | "-") term)*
//   term        ::= factor (("*" | "/") factor)*
//   factor      ::= NUMBER | IDENTIFIER | "(" expression ")"
//
// This is a "recursive descent" parser: one function per
// grammar rule, and functions call each other exactly the way
// the rules reference each other above.
// ============================================================

const { TokenType } = require("./lexer");

class ParserError extends Error {
  constructor(message, line, column) {
    super(message);
    this.name = "ParserError";
    this.stage = "parser";
    this.line = line;
    this.column = column;
  }
}

function parse(tokens) {
  let pos = 0;

  // ---- small helpers for looking at / consuming tokens ----

  function current() {
    return tokens[pos];
  }

  function check(type) {
    return current().type === type;
  }

  function advance() {
    const tok = current();
    if (tok.type !== TokenType.EOF) pos++;
    return tok;
  }

  // Consume a token of the expected type, or throw a clear error.
  function expect(type, humanName) {
    if (check(type)) {
      return advance();
    }
    const tok = current();
    throw new ParserError(
      `Expected ${humanName} but found "${tok.value || tok.type}"`,
      tok.line,
      tok.column
    );
  }

  // ---- grammar rules, top-down ----

  // program ::= statement* EOF
  function parseProgram() {
    const body = [];
    while (!check(TokenType.EOF)) {
      body.push(parseStatement());
    }
    return { type: "Program", body };
  }

  // statement ::= letStmt | printStmt
  function parseStatement() {
    if (check(TokenType.LET)) {
      return parseLetStatement();
    }
    if (check(TokenType.PRINT)) {
      return parsePrintStatement();
    }
    const tok = current();
    throw new ParserError(
      `Expected a statement ("let" or "print") but found "${tok.value || tok.type}"`,
      tok.line,
      tok.column
    );
  }

  // letStmt ::= "let" IDENTIFIER "=" expression ";"
  function parseLetStatement() {
    const letTok = advance(); // consume "let"
    const nameTok = expect(TokenType.IDENTIFIER, "a variable name");
    expect(TokenType.ASSIGN, '"="');
    const value = parseExpression();
    expect(TokenType.SEMICOLON, '";"');
    return {
      type: "VarDeclaration",
      name: nameTok.value,
      value,
      line: letTok.line
    };
  }

  // printStmt ::= "print" "(" expression ")" ";"
  function parsePrintStatement() {
    const printTok = advance(); // consume "print"
    expect(TokenType.LPAREN, '"("');
    const value = parseExpression();
    expect(TokenType.RPAREN, '")"');
    expect(TokenType.SEMICOLON, '";"');
    return {
      type: "PrintStatement",
      value,
      line: printTok.line
    };
  }

  // expression ::= term (("+" | "-") term)*
  // Left-associative: 1 - 2 - 3 becomes (1-2)-3, not 1-(2-3).
  function parseExpression() {
    let left = parseTerm();
    while (check(TokenType.PLUS) || check(TokenType.MINUS)) {
      const opTok = advance();
      const right = parseTerm();
      left = {
        type: "BinaryExpression",
        operator: opTok.value,
        left,
        right,
        line: opTok.line
      };
    }
    return left;
  }

  // term ::= factor (("*" | "/") factor)*
  // Because parseExpression calls parseTerm (not the other way
  // around), * and / naturally bind tighter than + and -.
  function parseTerm() {
    let left = parseFactor();
    while (check(TokenType.STAR) || check(TokenType.SLASH)) {
      const opTok = advance();
      const right = parseFactor();
      left = {
        type: "BinaryExpression",
        operator: opTok.value,
        left,
        right,
        line: opTok.line
      };
    }
    return left;
  }

  // factor ::= NUMBER | IDENTIFIER | "(" expression ")"
  function parseFactor() {
    const tok = current();

    if (check(TokenType.NUMBER)) {
      advance();
      return { type: "NumberLiteral", value: Number(tok.value), line: tok.line };
    }

    if (check(TokenType.IDENTIFIER)) {
      advance();
      return { type: "Identifier", name: tok.value, line: tok.line };
    }

    if (check(TokenType.LPAREN)) {
      advance();
      const expr = parseExpression();
      expect(TokenType.RPAREN, '")"');
      return expr;
    }

    throw new ParserError(
      `Expected a number, variable, or "(" but found "${tok.value || tok.type}"`,
      tok.line,
      tok.column
    );
  }

  const ast = parseProgram();
  expect(TokenType.EOF, "end of input");
  return ast;
}

// ============================================================
// Pretty-printer: renders the AST as an indented tree of text,
// similar in spirit to the example in the prompt. Useful for
// debugging and for the "AST" panel in the UI.
// ============================================================
function printAst(node, prefix = "", isLast = true) {
  const lines = [];
  const connector = prefix === "" ? "" : (isLast ? "└── " : "├── ");
  lines.push(prefix + connector + describeNode(node));

  const childPrefix = prefix + (prefix === "" ? "" : (isLast ? "    " : "│   "));
  const children = getChildren(node);
  children.forEach((child, i) => {
    const childIsLast = i === children.length - 1;
    lines.push(printAst(child.node, childPrefix, childIsLast).join("\n"));
  });

  return lines;
}

function describeNode(node) {
  switch (node.type) {
    case "Program":
      return "Program";
    case "VarDeclaration":
      return `VarDeclaration(${node.name})`;
    case "PrintStatement":
      return "Print";
    case "BinaryExpression":
      return `BinaryExpression(${node.operator})`;
    case "NumberLiteral":
      return `Number(${node.value})`;
    case "Identifier":
      return `Identifier(${node.name})`;
    default:
      return node.type;
  }
}

function getChildren(node) {
  switch (node.type) {
    case "Program":
      return node.body.map(n => ({ node: n }));
    case "VarDeclaration":
      return [{ node: node.value }];
    case "PrintStatement":
      return [{ node: node.value }];
    case "BinaryExpression":
      return [{ node: node.left }, { node: node.right }];
    default:
      return [];
  }
}

module.exports = { parse, printAst, ParserError };
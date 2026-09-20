// ============================================================
// Simple hand-rolled test runner. No test framework/dependency
// needed — just Node's built-in assert module.
// ============================================================
const assert = require("assert");
const { tokenize, TokenType } = require("./lexer");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${err.message}`);
    failed++;
  }
}

// Helper: strip line/column so tests focus on type+value
// where that's all we care about.
function typesAndValues(tokens) {
  return tokens.map(t => [t.type, t.value]);
}

test("simple declaration", () => {
  const tokens = tokenize("let x = 10;");
  assert.deepStrictEqual(typesAndValues(tokens), [
    ["LET", "let"],
    ["IDENTIFIER", "x"],
    ["ASSIGN", "="],
    ["NUMBER", "10"],
    ["SEMICOLON", ";"],
    ["EOF", ""]
  ]);
});

test("full example program", () => {
  const src = "let x = 10;\nlet y = 20;\nprint(x + y);";
  const tokens = tokenize(src);
  const types = tokens.map(t => t.type);
  assert.deepStrictEqual(types, [
    "LET", "IDENTIFIER", "ASSIGN", "NUMBER", "SEMICOLON",
    "LET", "IDENTIFIER", "ASSIGN", "NUMBER", "SEMICOLON",
    "PRINT", "LPAREN", "IDENTIFIER", "PLUS", "IDENTIFIER", "RPAREN", "SEMICOLON",
    "EOF"
  ]);
});

test("line numbers are tracked correctly", () => {
  const src = "let x = 1;\nlet y = 2;";
  const tokens = tokenize(src);
  const yToken = tokens.find(t => t.value === "y");
  assert.strictEqual(yToken.line, 2);
});

test("all arithmetic operators", () => {
  const tokens = tokenize("+ - * /");
  assert.deepStrictEqual(
    tokens.map(t => t.type),
    ["PLUS", "MINUS", "STAR", "SLASH", "EOF"]
  );
});

test("parentheses and expression", () => {
  const tokens = tokenize("(x + 1)");
  assert.deepStrictEqual(
    tokens.map(t => t.type),
    ["LPAREN", "IDENTIFIER", "PLUS", "NUMBER", "RPAREN", "EOF"]
  );
});

test("comments are ignored", () => {
  const src = "let x = 5; // this is a comment\nprint(x);";
  const tokens = tokenize(src);
  const types = tokens.map(t => t.type);
  assert.deepStrictEqual(types, [
    "LET", "IDENTIFIER", "ASSIGN", "NUMBER", "SEMICOLON",
    "PRINT", "LPAREN", "IDENTIFIER", "RPAREN", "SEMICOLON",
    "EOF"
  ]);
});

test("identifier can contain digits and underscores (not start with digit)", () => {
  const tokens = tokenize("let my_var2 = 3;");
  assert.strictEqual(tokens[1].type, "IDENTIFIER");
  assert.strictEqual(tokens[1].value, "my_var2");
});

test("unexpected character throws LexerError", () => {
  assert.throws(
    () => tokenize("let x = 5 @ 3;"),
    /Unexpected character "@"/
  );
});

test("number directly followed by letter throws LexerError", () => {
  assert.throws(
    () => tokenize("let x = 10y;"),
    /Invalid number literal "10y"/
  );
});

test("error reports correct line number", () => {
  try {
    tokenize("let x = 1;\nlet y = @;");
    assert.fail("Expected LexerError to be thrown");
  } catch (err) {
    assert.strictEqual(err.line, 2);
  }
});

// ------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
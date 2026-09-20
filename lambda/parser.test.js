const assert = require("assert");
const { tokenize } = require("./lexer");
const { parse, printAst } = require("./parser");

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

function parseSource(src) {
  return parse(tokenize(src));
}

test("simple let declaration produces correct AST shape", () => {
  const ast = parseSource("let x = 5;");
  assert.deepStrictEqual(ast, {
    type: "Program",
    body: [
      {
        type: "VarDeclaration",
        name: "x",
        value: { type: "NumberLiteral", value: 5, line: 1 },
        line: 1
      }
    ]
  });
});

test("print(x + 5) matches the example in the spec", () => {
  const ast = parseSource("print(x + 5);");
  const stmt = ast.body[0];
  assert.strictEqual(stmt.type, "PrintStatement");
  assert.strictEqual(stmt.value.type, "BinaryExpression");
  assert.strictEqual(stmt.value.operator, "+");
  assert.strictEqual(stmt.value.left.type, "Identifier");
  assert.strictEqual(stmt.value.left.name, "x");
  assert.strictEqual(stmt.value.right.type, "NumberLiteral");
  assert.strictEqual(stmt.value.right.value, 5);
});

test("multiplication binds tighter than addition (2 + 3 * 4)", () => {
  const ast = parseSource("print(2 + 3 * 4);");
  const expr = ast.body[0].value;
  // Top-level operator must be "+", with "*" nested on the right.
  assert.strictEqual(expr.type, "BinaryExpression");
  assert.strictEqual(expr.operator, "+");
  assert.strictEqual(expr.left.value, 2);
  assert.strictEqual(expr.right.type, "BinaryExpression");
  assert.strictEqual(expr.right.operator, "*");
});

test("parentheses override precedence ((2 + 3) * 4)", () => {
  const ast = parseSource("print((2 + 3) * 4);");
  const expr = ast.body[0].value;
  assert.strictEqual(expr.operator, "*");
  assert.strictEqual(expr.left.type, "BinaryExpression");
  assert.strictEqual(expr.left.operator, "+");
});

test("subtraction is left-associative (10 - 2 - 3)", () => {
  const ast = parseSource("print(10 - 2 - 3);");
  const expr = ast.body[0].value; // should be (10 - 2) - 3
  assert.strictEqual(expr.operator, "-");
  assert.strictEqual(expr.right.value, 3);
  assert.strictEqual(expr.left.type, "BinaryExpression");
  assert.strictEqual(expr.left.left.value, 10);
  assert.strictEqual(expr.left.right.value, 2);
});

test("full example program parses into 3 statements", () => {
  const src = "let x = 10;\nlet y = 20;\nprint(x + y);";
  const ast = parseSource(src);
  assert.strictEqual(ast.body.length, 3);
  assert.strictEqual(ast.body[0].type, "VarDeclaration");
  assert.strictEqual(ast.body[1].type, "VarDeclaration");
  assert.strictEqual(ast.body[2].type, "PrintStatement");
});

test("printAst renders a readable tree for print(x + 5)", () => {
  const ast = parseSource("print(x + 5);");
  const text = printAst(ast).join("\n");
  assert.ok(text.includes("Print"));
  assert.ok(text.includes("BinaryExpression(+)"));
  assert.ok(text.includes("Identifier(x)"));
  assert.ok(text.includes("Number(5)"));
});

test("missing semicolon throws ParserError", () => {
  assert.throws(
    () => parseSource("let x = 5"),
    /Expected "\;"/
  );
});

test("missing '=' in let statement throws ParserError", () => {
  assert.throws(
    () => parseSource("let x 5;"),
    /Expected "="/
  );
});

test("unclosed parenthesis throws ParserError", () => {
  assert.throws(
    () => parseSource("print((1 + 2);"),
    /Expected "\)"/
  );
});

test("statement starting with an invalid keyword throws ParserError", () => {
  assert.throws(
    () => parseSource("foo x = 5;"),
    /Expected a statement/
  );
});

test("dangling operator throws ParserError", () => {
  assert.throws(
    () => parseSource("let x = 5 +;"),
    /Expected a number, variable, or "\("/
  );
});

// ------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
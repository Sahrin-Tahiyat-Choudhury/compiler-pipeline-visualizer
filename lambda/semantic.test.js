const assert = require("assert");
const { tokenize } = require("./lexer");
const { parse } = require("./parser");
const { analyze } = require("./semantic");

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

function analyzeSource(src) {
  return analyze(parse(tokenize(src)));
}

test("declare then use is valid", () => {
  const result = analyzeSource("let x = 10;\nprint(x);");
  assert.strictEqual(result.symbolTable.length, 1);
  assert.strictEqual(result.symbolTable[0].name, "x");
  assert.strictEqual(result.symbolTable[0].type, "int");
});

test("symbol table records declaration line", () => {
  const result = analyzeSource("let a = 1;\nlet b = 2;");
  assert.strictEqual(result.symbolTable[0].declaredLine, 1);
  assert.strictEqual(result.symbolTable[1].declaredLine, 2);
});

test("using an undeclared variable in print throws", () => {
  assert.throws(
    () => analyzeSource("print(y);"),
    /Variable 'y' is not declared/
  );
});

test("using an undeclared variable inside expression throws", () => {
  assert.throws(
    () => analyzeSource("let x = 5;\nprint(x + z);"),
    /Variable 'z' is not declared/
  );
});

test("redeclaring a variable throws", () => {
  assert.throws(
    () => analyzeSource("let x = 10;\nlet x = 20;"),
    /Variable 'x' is already declared/
  );
});

test("redeclaration error mentions original declaration line", () => {
  try {
    analyzeSource("let x = 1;\nlet x = 2;");
    assert.fail("expected SemanticError");
  } catch (err) {
    assert.ok(err.message.includes("line 1"));
    assert.strictEqual(err.line, 2); // the NEW (offending) declaration
  }
});

test("using x on its own right-hand side before declaration throws", () => {
  // let x = x + 1;  -> x is not declared yet when the RHS runs
  assert.throws(
    () => analyzeSource("let x = x + 1;"),
    /Variable 'x' is not declared/
  );
});

test("re-using a variable across multiple statements is fine", () => {
  const result = analyzeSource(
    "let x = 5;\nlet y = x + 1;\nprint(x + y);"
  );
  assert.strictEqual(result.symbolTable.length, 2);
});

test("full valid example program passes cleanly", () => {
  const result = analyzeSource(
    "let x = 10;\nlet y = 20;\nprint(x + y);"
  );
  assert.strictEqual(result.symbolTable.length, 2);
});

test("nested expression with undeclared variable is caught", () => {
  assert.throws(
    () => analyzeSource("let x = 1;\nprint((x + 2) * q);"),
    /Variable 'q' is not declared/
  );
});

//runner footer
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
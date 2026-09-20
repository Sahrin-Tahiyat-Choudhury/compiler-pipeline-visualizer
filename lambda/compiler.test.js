const assert = require("assert");
const { compileAndRun } = require("./compiler");

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

test("valid program: full pipeline produces output '30'", () => {
  const result = compileAndRun("let x = 10;\nlet y = 20;\nprint(x + y);");
  assert.strictEqual(result.success, true);
  assert.deepStrictEqual(result.output, ["30"]);
  assert.deepStrictEqual(result.finalState, { x: 10, y: 20 });
});

test("invalid syntax: stage is 'parser'", () => {
  const result = compileAndRun("let x = 10");
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.stage, "parser");
});

test("undeclared variable: stage is 'semantic'", () => {
  const result = compileAndRun("print(y);");
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.stage, "semantic");
  assert.ok(/not declared/.test(result.message));
});

test("redeclared variable: stage is 'semantic'", () => {
  const result = compileAndRun("let x = 10;\nlet x = 20;");
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.stage, "semantic");
  assert.ok(/already declared/.test(result.message));
});

test("division by zero: stage is 'execution'", () => {
  const result = compileAndRun("let x = 5;\nprint(x / 0);");
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.stage, "execution");
  assert.ok(/Division by zero/.test(result.message));
});

test("invalid character: stage is 'lexer'", () => {
  const result = compileAndRun("let x = @;");
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.stage, "lexer");
});

test("failed program still reports a line number", () => {
  const result = compileAndRun("let x = 5;\nlet y = z + 1;");
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.line, 2);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
const assert = require("assert");
const { tokenize } = require("./lexer");
const { parse } = require("./parser");
const { generateIr } = require("./irGenerator");
const { execute } = require("./interpreter");

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

function runSource(src) {
  const ir = generateIr(parse(tokenize(src)));
  return execute(ir);
}

test("exact example from the spec produces output '30'", () => {
  const result = runSource("let x = 10;\nlet y = 20;\nprint(x + y);");
  assert.deepStrictEqual(result.output, ["30"]);
});

test("finalState only includes real variables, not temporaries", () => {
  const result = runSource("let x = 2 * 3;\nprint(x);");
  assert.deepStrictEqual(result.finalState, { x: 6 });
});

test("multiple prints produce multiple output lines in order", () => {
  const result = runSource("let x = 5;\nprint(x);\nprint(x + 1);");
  assert.deepStrictEqual(result.output, ["5", "6"]);
});

test("nested expression evaluates correctly: 10 + 2 * 3 = 16", () => {
  const result = runSource("print(10 + 2 * 3);");
  assert.deepStrictEqual(result.output, ["16"]);
});

test("parentheses affect evaluation order correctly", () => {
  const result = runSource("print((10 + 2) * 3);");
  assert.deepStrictEqual(result.output, ["36"]);
});

test("division truncates toward zero (integer division)", () => {
  const result = runSource("print(7 / 2);");
  assert.deepStrictEqual(result.output, ["3"]);
});

test("division by zero throws RuntimeError with correct stage", () => {
  assert.throws(
    () => runSource("let x = 10;\nprint(x / 0);"),
    (err) => err.stage === "execution" && /Division by zero/.test(err.message)
  );
});

test("division by zero reports the correct line number", () => {
  try {
    runSource("let x = 5;\nlet y = 0;\nprint(x / y);");
    assert.fail("expected RuntimeError");
  } catch (err) {
    assert.strictEqual(err.line, 3);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
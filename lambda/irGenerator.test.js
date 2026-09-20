const assert = require("assert");
const { tokenize } = require("./lexer");
const { parse } = require("./parser");
const { generateIr, formatIr } = require("./irGenerator");

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

function irFor(src) {
  const ast = parse(tokenize(src));
  return generateIr(ast);
}

test("simple literal declaration: x = 10 (no temp needed)", () => {
  const ir = irFor("let x = 10;");
  assert.deepStrictEqual(ir, [
    { op: "ASSIGN", target: "x", arg1: "10", arg2: null, line: 1 }
  ]);
});

test("exact example from the spec", () => {
  const ir = irFor("let x = 10;\nlet y = 20;\nprint(x + y);");
  const text = formatIr(ir);
  assert.deepStrictEqual(text, [
    "x = 10",
    "y = 20",
    "t1 = x + y",
    "PRINT t1"
  ]);
});

test("nested expression example from the spec: print(10 + 2 * 3)", () => {
  const ir = irFor("print(10 + 2 * 3);");
  const text = formatIr(ir);
  assert.deepStrictEqual(text, [
    "t1 = 2 * 3",
    "t2 = 10 + t1",
    "PRINT t2"
  ]);
});

test("deeper nesting still produces sequential, deterministic temps", () => {
  const ir = irFor("print((1 + 2) * (3 + 4));");
  const text = formatIr(ir);
  assert.deepStrictEqual(text, [
    "t1 = 1 + 2",
    "t2 = 3 + 4",
    "t3 = t1 * t2",
    "PRINT t3"
  ]);
});

test("temp counter is shared and increasing across multiple statements", () => {
  const ir = irFor("let a = 1 + 2;\nlet b = 3 + 4;\nprint(a + b);");
  const text = formatIr(ir);
  assert.deepStrictEqual(text, [
    "t1 = 1 + 2",
    "a = t1",
    "t2 = 3 + 4",
    "b = t2",
    "t3 = a + b",
    "PRINT t3"
  ]);
});

test("running the same program twice produces identical IR (determinism)", () => {
  const src = "let x = 2 * 3 + 1;\nprint(x);";
  const irA = formatIr(irFor(src));
  const irB = formatIr(irFor(src));
  assert.deepStrictEqual(irA, irB);
});

test("division and subtraction map to correct instruction ops", () => {
  const ir = irFor("print(10 - 2);\nprint(10 / 2);");
  assert.strictEqual(ir[0].op, "SUB");
  assert.strictEqual(ir[1].op, "PRINT");
  assert.strictEqual(ir[2].op, "DIV");
});

test("variable used directly in print needs no extra temp", () => {
  const ir = irFor("let x = 5;\nprint(x);");
  const text = formatIr(ir);
  assert.deepStrictEqual(text, ["x = 5", "PRINT x"]);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
// ============================================================
// COMPILER PIPELINE ORCHESTRATOR
// Runs source code through every stage we've built, in order,
// reusing each module exactly as implemented. This is the
// function the Lambda handler will call in the next step.
// ============================================================

const { tokenize } = require("./lexer");
const { parse } = require("./parser");
const { analyze } = require("./semantic");
const { generateIr } = require("./irGenerator");
const { execute } = require("./interpreter");

/**
 * Compile and run a source program through the full pipeline.
 * Stops at the first stage that fails and reports exactly which
 * stage and line caused the problem.
 */
function compileAndRun(source) {
  try {
    const tokens = tokenize(source);
    const ast = parse(tokens);
    const { symbolTable } = analyze(ast);
    const ir = generateIr(ast);
    const { output, finalState } = execute(ir);

    return {
      success: true,
      tokens,
      ast,
      symbolTable,
      ir,
      output,
      finalState
    };
  } catch (err) {
    // LexerError, ParserError, SemanticError, and RuntimeError
    // all carry `.stage` and `.line` — that's how we know which
    // pipeline phase failed without guessing from the error text.
    if (err.stage) {
      return {
        success: false,
        stage: err.stage,
        message: err.message,
        line: err.line ?? null
      };
    }
    // Anything without `.stage` is an unexpected internal bug,
    // not a problem with the user's program — report it distinctly.
    return {
      success: false,
      stage: "internal",
      message: "Internal error: " + err.message,
      line: null
    };
  }
}

module.exports = { compileAndRun };
// ============================================================
// INTERPRETER
// Executes the three-address-code instructions produced by
// irGenerator.js, in order, top to bottom. This is a "tree-
// walking-style" interpreter, just walking a flat instruction
// list instead of a tree — the simplest possible way to
// actually RUN the program, no machine code involved.
//
// State model: one flat map of name -> number, covering both
// real variables (x, y) and temporaries (t1, t2, ...) — they're
// treated identically at execution time.
// ============================================================

class RuntimeError extends Error {
  constructor(message, line) {
    super(message);
    this.name = "RuntimeError";
    this.stage = "execution";
    this.line = line;
  }
}

/**
 * Execute a list of IR instructions.
 * @param {Array<object>} instructions - output of generateIr()
 * @returns {{ output: string[], finalState: object }}
 * @throws {RuntimeError} on division by zero or an undefined operand
 */
function execute(instructions) {
  const state = {};   // holds both variables and temporaries
  const output = [];  // one entry per PRINT, as strings

  for (const instr of instructions) {
    switch (instr.op) {
      case "ASSIGN": {
        state[instr.target] = resolveOperand(instr.arg1, state, instr.line);
        break;
      }

      case "ADD": {
        const a = resolveOperand(instr.arg1, state, instr.line);
        const b = resolveOperand(instr.arg2, state, instr.line);
        state[instr.target] = a + b;
        break;
      }

      case "SUB": {
        const a = resolveOperand(instr.arg1, state, instr.line);
        const b = resolveOperand(instr.arg2, state, instr.line);
        state[instr.target] = a - b;
        break;
      }

      case "MUL": {
        const a = resolveOperand(instr.arg1, state, instr.line);
        const b = resolveOperand(instr.arg2, state, instr.line);
        state[instr.target] = a * b;
        break;
      }

      case "DIV": {
        const a = resolveOperand(instr.arg1, state, instr.line);
        const b = resolveOperand(instr.arg2, state, instr.line);
        if (b === 0) {
          throw new RuntimeError("Division by zero", instr.line);
        }
        // Our language only has integers, so integer division.
        state[instr.target] = Math.trunc(a / b);
        break;
      }

      case "PRINT": {
        const value = resolveOperand(instr.arg1, state, instr.line);
        output.push(String(value));
        break;
      }

      default:
        throw new RuntimeError(`Internal error: unknown instruction "${instr.op}"`, instr.line);
    }
  }

  // finalState should only show real variables to the user,
  // not internal temporaries (t1, t2, ...) — those are an
  // implementation detail of the IR, not part of the program.
  const finalState = {};
  for (const [name, value] of Object.entries(state)) {
    if (!/^t\d+$/.test(name)) {
      finalState[name] = value;
    }
  }

  return { output, finalState };
}

// Resolves one IR operand into an actual number:
// - if it looks like a numeric literal ("10", "-3"), parse it
// - otherwise it must be a variable/temp already in `state`
function resolveOperand(operand, state, line) {
  if (/^-?\d+$/.test(operand)) {
    return Number(operand);
  }
  if (Object.prototype.hasOwnProperty.call(state, operand)) {
    return state[operand];
  }
  // In practice this is unreachable, because semantic analysis
  // (semantic.js) already guarantees every variable used was
  // declared first. This check exists only as a defensive
  // safety net, not as the primary line of defense.
  throw new RuntimeError(`Undefined variable or temporary '${operand}'`, line);
}

module.exports = { execute, RuntimeError };
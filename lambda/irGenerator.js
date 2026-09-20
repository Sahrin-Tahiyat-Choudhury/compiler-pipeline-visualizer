// ============================================================
// INTERMEDIATE CODE GENERATOR  (updated: instructions now carry `line`)
// ============================================================

const OP_TO_INSTRUCTION = {
  "+": "ADD",
  "-": "SUB",
  "*": "MUL",
  "/": "DIV"
};

const INSTRUCTION_TO_SYMBOL = {
  ADD: "+",
  SUB: "-",
  MUL: "*",
  DIV: "/"
};

function generateIr(ast) {
  const instructions = [];
  let tempCounter = 0;

  function newTemp() {
    tempCounter++;
    return `t${tempCounter}`;
  }

  // CHANGED: emit() now accepts and stores a line number.
  function emit(op, target, arg1, arg2, line) {
    instructions.push({ op, target, arg1, arg2, line });
  }

  function genExpression(node) {
    switch (node.type) {
      case "NumberLiteral":
        return String(node.value);

      case "Identifier":
        return node.name;

      case "BinaryExpression": {
        const leftOperand = genExpression(node.left);
        const rightOperand = genExpression(node.right);
        const target = newTemp();
        const op = OP_TO_INSTRUCTION[node.operator];
        emit(op, target, leftOperand, rightOperand, node.line); // CHANGED
        return target;
      }

      default:
        throw new Error(`Internal error: cannot generate IR for expression type "${node.type}"`);
    }
  }

  function genStatement(node) {
    switch (node.type) {
      case "VarDeclaration": {
        const operand = genExpression(node.value);
        emit("ASSIGN", node.name, operand, null, node.line); // CHANGED
        break;
      }
      case "PrintStatement": {
        const operand = genExpression(node.value);
        emit("PRINT", null, operand, null, node.line); // CHANGED
        break;
      }
      default:
        throw new Error(`Internal error: cannot generate IR for statement type "${node.type}"`);
    }
  }

  for (const statement of ast.body) {
    genStatement(statement);
  }

  return instructions;
}

function formatIr(instructions) {
  return instructions.map(instr => {
    if (instr.op === "ASSIGN") {
      return `${instr.target} = ${instr.arg1}`;
    }
    if (instr.op === "PRINT") {
      return `PRINT ${instr.arg1}`;
    }
    const symbol = INSTRUCTION_TO_SYMBOL[instr.op];
    return `${instr.target} = ${instr.arg1} ${symbol} ${instr.arg2}`;
  });
}

module.exports = { generateIr, formatIr };
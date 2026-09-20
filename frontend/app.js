// ============================================================
// FRONTEND LOGIC
// Renders the compiler pipeline UI. This file does NOT contain
// any compiler logic — it only calls the Lambda endpoint and
// displays whatever comes back, following the JSON shape we
// designed earlier (success/error + tokens/ast/symbolTable/ir/
// execution).
// ============================================================

const PIPELINE_STAGES = [
  { key: "lexer",    label: "Tokens" },
  { key: "parser",   label: "AST" },
  { key: "semantic", label: "Semantic" },
  { key: "ir",       label: "IR" },
  { key: "output",   label: "Output" }
];

const runBtn = document.getElementById("runBtn");
const sourceInput = document.getElementById("sourceInput");
const statusText = document.getElementById("statusText");
const errorBanner = document.getElementById("errorBanner");
const errorStageLabel = document.getElementById("errorStageLabel");
const errorMessage = document.getElementById("errorMessage");
const breadcrumb = document.getElementById("breadcrumb");
const exampleButtons = document.getElementById("exampleButtons");

// ---------------- Example buttons ----------------
EXAMPLES.forEach(ex => {
  const btn = document.createElement("button");
  btn.textContent = ex.label;
  btn.className =
    "text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition";
  btn.addEventListener("click", () => {
    sourceInput.value = ex.code;
  });
  exampleButtons.appendChild(btn);
});

// ---------------- Breadcrumb rendering ----------------
function renderBreadcrumb(activeKey, failedKey) {
  breadcrumb.innerHTML = "";
  const steps = [{ key: "source", label: "Source" }, ...PIPELINE_STAGES];

  steps.forEach((step, i) => {
    const span = document.createElement("span");
    span.textContent = step.label;
    span.className = "breadcrumb-step";
    if (step.key === failedKey) span.classList.add("failed");
    else if (isStageReached(step.key, activeKey)) span.classList.add("active");
    breadcrumb.appendChild(span);

    if (i < steps.length - 1) {
      const arrow = document.createElement("span");
      arrow.textContent = "→";
      arrow.className = "breadcrumb-arrow";
      breadcrumb.appendChild(arrow);
    }
  });
}

function isStageReached(stepKey, activeKey) {
  const order = ["source", "lexer", "parser", "semantic", "ir", "output"];
  return order.indexOf(stepKey) <= order.indexOf(activeKey);
}

// ---------------- Run button ----------------
runBtn.addEventListener("click", async () => {
  const source = sourceInput.value;
  if (!source.trim()) {
    statusText.textContent = "Enter some source code first.";
    return;
  }

  setLoading(true);
  clearResults();

  try {
    const response = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source })
    });
    const data = await response.json();
    renderResult(data);
  } catch (err) {
    showError("network", `Could not reach the compiler backend: ${err.message}`);
    renderBreadcrumb("source", null);
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  runBtn.disabled = isLoading;
  runBtn.textContent = isLoading ? "Compiling..." : "▶ Run";
  statusText.textContent = isLoading ? "" : statusText.textContent;
}

// ---------------- Result rendering ----------------
function renderResult(data) {
  if (!data.success) {
    showError(data.error.stage, data.error.message, data.error.line);
    renderBreadcrumb(data.stage_reached || "source", data.error.stage);
    // Still render whatever partial data exists before the failure.
    renderTokens(data.tokens);
    renderAst(data.ast);
    renderSemantic(data.symbolTable, data.semanticIssues);
    renderIr(data.ir);
    renderOutput(null);
    return;
  }

  hideError();
  renderBreadcrumb("output", null);
  statusText.textContent = "Compiled and executed successfully.";
  renderTokens(data.tokens);
  renderAst(data.ast);
  renderSemantic(data.symbolTable, data.semanticIssues);
  renderIr(data.ir);
  renderOutput(data.execution);
}

function clearResults() {
  document.getElementById("tokensBody").innerHTML = "";
  document.getElementById("astTree").innerHTML = "";
  document.getElementById("semanticContent").innerHTML =
    '<p class="text-slate-500">Symbol table will appear here.</p>';
  document.getElementById("irContent").textContent = "";
  document.getElementById("outputConsole").textContent = "";
  document.getElementById("finalStateBody").innerHTML = "";
  hideError();
}

// AFTER:
const errorExplanation = document.getElementById("errorExplanation");
const explType = document.getElementById("explType");
const explPhase = document.getElementById("explPhase");
const explWhat = document.getElementById("explWhat");
const explFix = document.getElementById("explFix");
const explExampleBlock = document.getElementById("explExampleBlock");
const explExample = document.getElementById("explExample");

function showError(stage, message, line) {
  errorBanner.classList.remove("hidden");
  errorStageLabel.textContent = `Error at stage: ${stage || "unknown"}`;
  errorMessage.textContent = line ? `Line ${line}: ${message}` : message;
  statusText.textContent = "Compilation failed.";

  // NEW: render the deterministic, beginner-friendly explanation.
  const explanation = explainError({ stage, message, line });
  if (!explanation) {
    errorExplanation.classList.add("hidden");
    return;
  }

  explType.textContent = explanation.errorType;
  explPhase.textContent = explanation.phase;
  explWhat.textContent = explanation.whatWentWrong;
  explFix.textContent = explanation.howToFix;

  if (explanation.correctedExample) {
    explExampleBlock.classList.remove("hidden");
    explExample.textContent = explanation.correctedExample;
  } else {
    explExampleBlock.classList.add("hidden");
  }

  errorExplanation.classList.remove("hidden");
}

function hideError() {
  errorBanner.classList.add("hidden");
  errorExplanation.classList.add("hidden"); // NEW
}

// ---------------- Tokens panel ----------------
function renderTokens(tokens) {
  const body = document.getElementById("tokensBody");
  body.innerHTML = "";
  if (!tokens) return;

  tokens
    .filter(t => t.type !== "EOF")
    .forEach(t => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="px-3 py-1.5 text-indigo-300">${t.type}</td>
        <td class="px-3 py-1.5 text-slate-200">${escapeHtml(t.value)}</td>
        <td class="px-3 py-1.5 text-slate-500">${t.line}</td>
      `;
      body.appendChild(row);
    });
}

// ---------------- AST panel ----------------
function renderAst(ast) {
  const container = document.getElementById("astTree");
  container.innerHTML = "";
  if (!ast) return;
  container.innerHTML = astNodeToHtml(ast, "", true);
}

function astNodeToHtml(node, prefix, isLast) {
  const connector = prefix === "" ? "" : (isLast ? "└── " : "├── ");
  const label = describeAstNode(node);
  let html = `<div class="ast-line">${escapeHtml(prefix + connector)}<span class="text-indigo-300">${escapeHtml(label)}</span></div>`;

  const childPrefix = prefix + (prefix === "" ? "" : (isLast ? "    " : "│   "));
  const children = getAstChildren(node);
  children.forEach((child, i) => {
    html += astNodeToHtml(child, childPrefix, i === children.length - 1);
  });
  return html;
}

function describeAstNode(node) {
  switch (node.type) {
    case "Program": return "Program";
    case "VarDeclaration": return `VarDeclaration(${node.name})`;
    case "PrintStatement": return "Print";
    case "BinaryExpression": return `BinaryExpression(${node.operator})`;
    case "NumberLiteral": return `Number(${node.value})`;
    case "Identifier": return `Identifier(${node.name})`;
    default: return node.type;
  }
}

function getAstChildren(node) {
  switch (node.type) {
    case "Program": return node.body;
    case "VarDeclaration": return [node.value];
    case "PrintStatement": return [node.value];
    case "BinaryExpression": return [node.left, node.right];
    default: return [];
  }
}

// ---------------- Semantic panel ----------------
function renderSemantic(symbolTable, semanticIssues) {
  const container = document.getElementById("semanticContent");
  container.innerHTML = "";
  if (!symbolTable) {
    container.innerHTML = '<p class="text-slate-500">Symbol table will appear here.</p>';
    return;
  }

  const badge = document.createElement("div");
  badge.className = "inline-block text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 mb-3";
  badge.textContent = "All checks passed";
  container.appendChild(badge);

  const table = document.createElement("table");
  table.className = "w-full text-sm font-mono rounded-lg border border-slate-800 overflow-hidden";
  table.innerHTML = `
    <thead class="bg-slate-800/60 text-slate-400">
      <tr><th class="text-left px-3 py-2">Name</th><th class="text-left px-3 py-2">Type</th><th class="text-left px-3 py-2">Declared Line</th></tr>
    </thead>
    <tbody>
      ${symbolTable.map(s => `
        <tr>
          <td class="px-3 py-1.5">${escapeHtml(s.name)}</td>
          <td class="px-3 py-1.5 text-slate-400">${escapeHtml(s.type)}</td>
          <td class="px-3 py-1.5 text-slate-500">${s.declaredLine}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
  container.appendChild(table);
}

// ---------------- IR panel ----------------
function renderIr(ir) {
  const el = document.getElementById("irContent");
  if (!ir) {
    el.textContent = "";
    return;
  }
  el.textContent = ir.map(formatIrLine).join("\n");
}

// Display-only formatting, mirrors irGenerator.js's formatIr()
// purely for rendering — no compiler decisions happen here.
function formatIrLine(instr) {
  const symbols = { ADD: "+", SUB: "-", MUL: "*", DIV: "/" };
  if (instr.op === "ASSIGN") return `${instr.target} = ${instr.arg1}`;
  if (instr.op === "PRINT") return `PRINT ${instr.arg1}`;
  return `${instr.target} = ${instr.arg1} ${symbols[instr.op]} ${instr.arg2}`;
}

// ---------------- Output panel ----------------
function renderOutput(execution) {
  const consoleEl = document.getElementById("outputConsole");
  const stateBody = document.getElementById("finalStateBody");
  consoleEl.textContent = "";
  stateBody.innerHTML = "";
  if (!execution) return;

  consoleEl.textContent = execution.output.join("\n");

  Object.entries(execution.finalState).forEach(([name, value]) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td class="px-3 py-1.5">${escapeHtml(name)}</td><td class="px-3 py-1.5 text-slate-300">${value}</td>`;
    stateBody.appendChild(row);
  });
}

// ---------------- Utility ----------------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

// Initial breadcrumb state on page load.
renderBreadcrumb("source", null);
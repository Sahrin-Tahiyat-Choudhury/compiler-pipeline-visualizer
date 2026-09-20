// ============================================================
// LAMBDA HANDLER
// Entry point invoked by AWS Lambda via a Function URL.
// Orchestrates the SAME pipeline modules built earlier —
// no compiler logic lives here, only request/response glue
// and stage-by-stage result capture.
// ============================================================

const { tokenize } = require("./lexer");
const { parse } = require("./parser");
const { analyze } = require("./semantic");
const { generateIr } = require("./irGenerator");
const { execute } = require("./interpreter");

// Configuration via environment variables (set at deploy time,
// never hardcoded, never secret — but this is the correct place
// for deploy-time config either way).
const MAX_SOURCE_LENGTH = Number(process.env.MAX_SOURCE_LENGTH || 2000);

function respond(statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(bodyObj)
  };
}

exports.handler = async (event) => {
  // Handle CORS preflight (the browser sends this automatically
  // before the real POST when calling a different origin).
  const method = event.requestContext?.http?.method;
  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      body: ""
    };
  }

  // ---- Parse and validate the request body ----
  let source;
  try {
    const body = JSON.parse(event.body || "{}");
    source = body.source;
  } catch {
    return respond(400, {
      success: false,
      stage_reached: null,
      error: { stage: "request", message: "Request body must be valid JSON", line: null }
    });
  }

  if (typeof source !== "string" || source.trim() === "") {
    return respond(400, {
      success: false,
      stage_reached: null,
      error: { stage: "request", message: "`source` must be a non-empty string", line: null }
    });
  }

  if (source.length > MAX_SOURCE_LENGTH) {
    return respond(400, {
      success: false,
      stage_reached: null,
      error: {
        stage: "request",
        message: `Source too long (max ${MAX_SOURCE_LENGTH} characters). This limit protects the AWS Free Tier quota.`,
        line: null
      }
    });
  }

  // ---- Run the pipeline stage by stage, capturing partial ----
  // ---- results so the UI can show progress even on failure ----
  const result = {
    success: true,
    source,
    tokens: null,
    ast: null,
    symbolTable: null,
    semanticIssues: null,
    ir: null,
    execution: null,
    stage_reached: null
  };

  const fail = (err, stage) => ({
    ...result,
    success: false,
    error: { stage, message: err.message, line: err.line ?? null }
  });

  let tokens;
  try {
    tokens = tokenize(source);
    result.tokens = tokens;
    result.stage_reached = "lexer";
  } catch (err) {
    return respond(200, fail(err, "lexer"));
  }

  let ast;
  try {
    ast = parse(tokens);
    result.ast = ast;
    result.stage_reached = "parser";
  } catch (err) {
    return respond(200, fail(err, "parser"));
  }

  try {
    const { symbolTable } = analyze(ast);
    result.symbolTable = symbolTable;
    result.semanticIssues = [];
    result.stage_reached = "semantic";
  } catch (err) {
    return respond(200, fail(err, "semantic"));
  }

  let ir;
  try {
    ir = generateIr(ast);
    result.ir = ir;
    result.stage_reached = "ir";
  } catch (err) {
    return respond(200, fail(err, "ir"));
  }

  try {
    const { output, finalState } = execute(ir);
    result.execution = { output, finalState };
    result.stage_reached = "output";
  } catch (err) {
    return respond(200, fail(err, "execution"));
  }

  return respond(200, result);
};
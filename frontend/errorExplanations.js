// ============================================================
// DETERMINISTIC ERROR EXPLANATIONS
// Pure pattern-matching against the exact error messages our
// OWN compiler produces (lexer.js, parser.js, semantic.js,
// interpreter.js). No external API, no AI call, no network —
// just a lookup table matched against known message shapes.
//
// If a message doesn't match any known pattern, we fall back
// to a generic explanation built from stage/message/line alone
// — we never invent an error type we haven't actually seen.
// ============================================================

const STAGE_INFO = {
  lexer:     { errorType: "Lexical Error", phase: "Lexical Analysis (Lexer)" },
  parser:    { errorType: "Syntax Error",  phase: "Parsing (Syntax Analysis)" },
  semantic:  { errorType: "Semantic Error", phase: "Semantic Analysis" },
  execution: { errorType: "Runtime Error", phase: "Execution" }
};

// Each matcher: { stage, pattern, build(match) -> {whatWentWrong, howToFix, correctedExample} }
const MATCHERS = [
  // ---- Lexer ----
  {
    stage: "lexer",
    pattern: /^Unexpected character "(.+)"$/,
    build: (m) => ({
      whatWentWrong: `The character "${m[1]}" isn't part of this language — it doesn't start any valid token (keyword, identifier, number, or operator).`,
      howToFix: "Remove or replace this character. Check for typos or stray symbols.",
      correctedExample: `let x = 5 + 3;\nprint(x);`
    })
  },
  {
    stage: "lexer",
    pattern: /^Invalid number literal "(.+)" \(numbers cannot contain letters\)$/,
    build: (m) => ({
      whatWentWrong: `"${m[1]}" mixes digits and letters with no space or operator between them, so the lexer can't tell if it's a number or a name.`,
      howToFix: "Add a space or operator between the number and the identifier.",
      correctedExample: `let x = 10;\nlet y = x + 1;`
    })
  },

  // ---- Parser ----
  {
    stage: "parser",
    pattern: /^Expected ";" but found/,
    build: () => ({
      whatWentWrong: "Every statement (`let ...` or `print(...)`) must end with a semicolon. The parser reached the end of the statement without finding one.",
      howToFix: "Add a semicolon at the end of the statement.",
      correctedExample: `let x = 10;\nprint(x);`
    })
  },
  {
    stage: "parser",
    pattern: /^Expected "=" but found/,
    build: () => ({
      whatWentWrong: "A `let` declaration must look like `let name = expression;`. The `=` sign is missing after the variable name.",
      howToFix: "Add `=` followed by the value being assigned.",
      correctedExample: `let x = 5;`
    })
  },
  {
    stage: "parser",
    pattern: /^Expected "\)" but found/,
    build: () => ({
      whatWentWrong: "A `(` was opened but never closed with a matching `)`.",
      howToFix: "Add the missing closing parenthesis.",
      correctedExample: `print((2 + 3) * 4);`
    })
  },
  {
    stage: "parser",
    pattern: /^Expected a statement \("let" or "print"\) but found/,
    build: () => ({
      whatWentWrong: "Every statement must start with `let` (to declare a variable) or `print` (to output a value). The parser found something else at the start of a statement.",
      howToFix: "Start the statement with `let` or `print`.",
      correctedExample: `let x = 5;\nprint(x);`
    })
  },
  {
    stage: "parser",
    pattern: /^Expected a number, variable, or "\(" but found/,
    build: () => ({
      whatWentWrong: "An expression was expected here (a number, a variable, or a parenthesized expression), but the parser hit something that can't start one — often a dangling operator or a missing value.",
      howToFix: "Add the missing value, or remove the extra operator.",
      correctedExample: `let x = 5 + 3;`
    })
  },

  // ---- Semantic ----
  {
    stage: "semantic",
    pattern: /^Variable '(.+)' is not declared$/,
    build: (m) => ({
      whatWentWrong: `The variable "${m[1]}" is used here, but it was never declared with \`let\` before this point.`,
      howToFix: `Declare it first with \`let ${m[1]} = ...;\` before using it, or check for a typo.`,
      correctedExample: `let y = 5;\nprint(y);`
    })
  },
  {
    stage: "semantic",
    pattern: /^Variable '(.+)' is already declared \(first declared on line (\d+)\)$/,
    build: (m) => ({
      whatWentWrong: `"${m[1]}" was already declared on line ${m[2]}. This language doesn't allow declaring the same variable twice.`,
      howToFix: "Use a different variable name for the second declaration.",
      correctedExample: `let x = 10;\nlet y = 20;`
    })
  },

  // ---- Execution ----
  {
    stage: "execution",
    pattern: /^Division by zero$/,
    build: () => ({
      whatWentWrong: "The program tried to divide a value by zero, which is mathematically undefined.",
      howToFix: "Make sure the divisor is never zero before dividing.",
      correctedExample: `let x = 10;\nlet y = 2;\nprint(x / y);`
    })
  }
];

/**
 * @param {{stage: string, message: string, line: number|null}} err
 * @returns {{errorType: string, phase: string, whatWentWrong: string, howToFix: string, correctedExample: string|null} | null}
 * Returns null only for stages we don't have explanations for
 * (e.g. "request" — client-side validation, not a compiler phase).
 */
function explainError(err) {
  const info = STAGE_INFO[err.stage];
  if (!info) return null; // e.g. "request" stage: not a compiler error, skip

  const matcher = MATCHERS.find(m => m.stage === err.stage && m.pattern.test(err.message));

  if (matcher) {
    const match = err.message.match(matcher.pattern);
    const details = matcher.build(match);
    return { errorType: info.errorType, phase: info.phase, ...details };
  }

  // Fallback: known stage, but message text didn't match a known
  // pattern exactly (e.g. we add a new check later). Still honest —
  // no invented error type, just structures what we already know.
  return {
    errorType: info.errorType,
    phase: info.phase,
    whatWentWrong: err.message,
    howToFix: "Review the code near the reported line.",
    correctedExample: null
  };
}
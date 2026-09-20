// ============================================================
// LEXER (Tokenizer)
// Converts raw source code (a string) into a list of tokens.
// A "token" is a small object describing one meaningful chunk
// of the source code, e.g. { type: "NUMBER", value: "10", line: 1 }
// ============================================================

// All the token types our language can produce.
const TokenType = {
  LET: "LET",
  PRINT: "PRINT",
  IDENTIFIER: "IDENTIFIER",
  NUMBER: "NUMBER",
  PLUS: "PLUS",
  MINUS: "MINUS",
  STAR: "STAR",
  SLASH: "SLASH",
  ASSIGN: "ASSIGN",
  LPAREN: "LPAREN",
  RPAREN: "RPAREN",
  SEMICOLON: "SEMICOLON",
  EOF: "EOF"
};

// Reserved words. If an identifier matches one of these,
// it becomes a keyword token instead of an IDENTIFIER.
const KEYWORDS = {
  let: TokenType.LET,
  print: TokenType.PRINT
};

// Custom error type so the caller can distinguish lexical
// errors from normal JS bugs.
class LexerError extends Error {
  constructor(message, line, column) {
    super(message);
    this.name = "LexerError";
    this.stage = "lexer";
    this.line = line;
    this.column = column;
  }
}

function isDigit(ch) {
  return ch >= "0" && ch <= "9";
}

function isAlpha(ch) {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_";
}

function isAlphaNumeric(ch) {
  return isAlpha(ch) || isDigit(ch);
}

/**
 * Tokenize a source string.
 * @param {string} source
 * @returns {Array<{type: string, value: string, line: number, column: number}>}
 * @throws {LexerError} on invalid characters or malformed numbers
 */
function tokenize(source) {
  const tokens = [];
  let pos = 0;
  let line = 1;
  let col = 1;

  function peek(offset = 0) {
    return source[pos + offset];
  }

  function advance() {
    const ch = source[pos];
    pos++;
    if (ch === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
    return ch;
  }

  function addToken(type, value, startLine, startCol) {
    tokens.push({ type, value, line: startLine, column: startCol });
  }

  while (pos < source.length) {
    const ch = peek();

    // --- whitespace: skip ---
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      advance();
      continue;
    }

    // --- single-line comments: // ... end of line ---
    if (ch === "/" && peek(1) === "/") {
      while (pos < source.length && peek() !== "\n") {
        advance();
      }
      continue;
    }

    const startLine = line;
    const startCol = col;

    // --- numbers ---
    if (isDigit(ch)) {
      let value = "";
      while (pos < source.length && isDigit(peek())) {
        value += advance();
      }
      // Catch things like "10x" — a number directly followed by a letter.
      if (pos < source.length && isAlpha(peek())) {
        let bad = value;
        while (pos < source.length && isAlphaNumeric(peek())) {
          bad += advance();
        }
        throw new LexerError(
          `Invalid number literal "${bad}" (numbers cannot contain letters)`,
          startLine,
          startCol
        );
      }
      addToken(TokenType.NUMBER, value, startLine, startCol);
      continue;
    }

    // --- identifiers and keywords ---
    if (isAlpha(ch)) {
      let value = "";
      while (pos < source.length && isAlphaNumeric(peek())) {
        value += advance();
      }
      const type = KEYWORDS[value] || TokenType.IDENTIFIER;
      addToken(type, value, startLine, startCol);
      continue;
    }

    // --- single-character tokens ---
    switch (ch) {
      case "+":
        advance();
        addToken(TokenType.PLUS, "+", startLine, startCol);
        continue;
      case "-":
        advance();
        addToken(TokenType.MINUS, "-", startLine, startCol);
        continue;
      case "*":
        advance();
        addToken(TokenType.STAR, "*", startLine, startCol);
        continue;
      case "/":
        advance();
        addToken(TokenType.SLASH, "/", startLine, startCol);
        continue;
      case "=":
        advance();
        addToken(TokenType.ASSIGN, "=", startLine, startCol);
        continue;
      case "(":
        advance();
        addToken(TokenType.LPAREN, "(", startLine, startCol);
        continue;
      case ")":
        advance();
        addToken(TokenType.RPAREN, ")", startLine, startCol);
        continue;
      case ";":
        advance();
        addToken(TokenType.SEMICOLON, ";", startLine, startCol);
        continue;
      default:
        throw new LexerError(
          `Unexpected character "${ch}"`,
          startLine,
          startCol
        );
    }
  }

  tokens.push({ type: TokenType.EOF, value: "", line, column: col });
  return tokens;
}

module.exports = { tokenize, TokenType, LexerError };
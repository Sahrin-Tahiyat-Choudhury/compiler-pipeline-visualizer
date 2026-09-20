// Three hardcoded example programs for the "Load Example" buttons.
// Plain data only — no logic here.
const EXAMPLES = [
  {
    label: "Basic Arithmetic",
    code: `let x = 10;\nlet y = 20;\nprint(x + y);`
  },
  {
    label: "Nested Expression",
    code: `let a = 2;\nlet b = 3;\nprint(10 + a * b);`
  },
  {
    label: "Division by Zero (Error Demo)",
    code: `let x = 5;\nlet y = 0;\nprint(x / y);`
  }
];
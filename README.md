# Compiler Pipeline Visualizer

An interactive educational tool that demonstrates how a compiler processes source code. Write a small program and observe its journey through Lexical Analysis, Parsing, Semantic Analysis, Intermediate Code Generation, and Execution.

Built for the **Bharat Builds / WeMakeDevs Hackathon**.

**Live Demo:** https://sahrin-tahiyat-choudhury.github.io/compiler-pipeline-visualizer/
**Demo Video:** [ADD LINK]

---

## Problem Statement

Compiler concepts are often taught as separate theoretical stages, which can make it difficult for beginners to understand how source code actually moves through a compiler.

The **Compiler Pipeline Visualizer** addresses this by providing a simple interactive environment where users can write a small program and observe the output of each compiler stage.

---

## Solution

The project implements a small hand-written compiler pipeline for a deliberately minimal programming language.

When the user clicks **Run**, the source code is sent to an AWS Lambda backend and processed through:

**Source Code → Lexer → Parser/AST → Semantic Analysis → Intermediate Representation → Execution**

The results from each stage are returned to the browser and displayed in separate visual panels.

This is an **educational prototype**, not a production compiler. The language and compiler stages are intentionally limited so that the complete pipeline remains easy to understand and demonstrate.

---

## Features

* Interactive source-code input
* Lexical analysis and token visualization
* Abstract Syntax Tree (AST) visualization
* Semantic analysis with a symbol table
* Intermediate representation (IR) generation
* Execution of generated IR
* Final program output and variable state
* Detection of lexical, syntax, semantic, and runtime errors
* Beginner-friendly explanations for known compiler errors
* Example programs for demonstration
* Serverless AWS Lambda backend
* No database or persistent storage required

---

## Supported Language

The language is intentionally minimal.

### Supported

* Integer variable declaration:

```text
let x = 10;
```

* Assignment:

```text
x = x + 1;
```

* Arithmetic operators:

```text
+  -  *  /
```

* Parentheses for grouping
* `print(expression);`

### Example

```text
let x = 10;
let y = 20;
print(x + y);
```

Output:

```text
30
```

### Not Supported

The following are intentionally outside the current language:

* `if` / `else`
* `while` and other loops
* Comparisons
* Strings
* Arrays
* Functions
* Multiple/nested scopes
* Explicit data types
* Compiler optimization
* Real machine-code generation

---

## Architecture

```text
Browser (HTML / CSS / JavaScript)
              │
              │ POST { source: "..." }
              ▼
AWS Lambda Function URL
              │
              ▼
       Lambda Handler
              │
              ├── Lexer
              ├── Parser
              ├── Semantic Analyzer
              ├── IR Generator
              └── Interpreter
              │
              ▼
        JSON Response
              │
              ▼
Browser renders compiler stages
```

The backend is implemented as a single AWS Lambda function containing small, focused modules for each compiler stage.

---

## Compiler Pipeline

### 1. Lexical Analysis

**File:** `lambda/lexer.js`

The lexer reads the source code and converts it into tokens such as:

* Keywords
* Identifiers
* Numbers
* Operators
* Punctuation

Token line and column information is also tracked.

### 2. Parsing

**File:** `lambda/parser.js`

A recursive-descent parser converts the tokens into an **Abstract Syntax Tree (AST)**.

The parser handles:

* Arithmetic expressions
* Parentheses
* Unary minus
* Operator precedence

For example, multiplication and division have higher precedence than addition and subtraction.

### 3. Semantic Analysis

**File:** `lambda/semantic.js`

The semantic analyzer walks the AST and uses a symbol table to check conditions such as:

* Variables must be declared before use.
* A variable cannot be declared more than once.

### 4. Intermediate Representation

**File:** `lambda/irGenerator.js`

The AST is converted into a simple intermediate representation using instructions and temporary variables for nested expressions.

For example, an expression such as:

```text
x + y * 2
```

can be represented using intermediate steps that preserve the correct operator precedence.

### 5. Execution

**File:** `lambda/interpreter.js`

The generated intermediate representation is executed by an interpreter.

The interpreter produces:

* Program output
* Final variable state
* Runtime errors such as division by zero

### 6. Beginner-Friendly Error Explanations

**File:** `frontend/errorExplanations.js`

The frontend provides deterministic, plain-language explanations for known compiler errors.

The explanations can describe:

* The compiler phase
* What went wrong
* How to fix the problem
* A corrected example

This feature does **not** call an external AI API at runtime.

---

## AWS Integration

### AWS Services Used

The project uses:

**AWS Lambda** and **AWS Lambda Function URL**.

No database, authentication service, or additional AWS service is required by the current implementation.

### How AWS Is Used

AWS Lambda acts as the compiler backend.

When the user clicks **Run**:

1. The browser sends the source code to the Lambda Function URL.
2. Lambda invokes the compiler pipeline.
3. The source passes through lexical analysis, parsing, semantic analysis, IR generation, and execution.
4. Lambda returns the results as JSON.
5. The browser displays the results.

Only the source code entered by the user is sent to the backend.

The application does not store submitted programs in a database.

### CORS

CORS is handled by the **native AWS Lambda Function URL CORS configuration** rather than custom CORS headers in the Lambda handler.

### Public Access

The Function URL uses `auth-type NONE` because this is a public educational demonstration and the application does not handle sensitive user data.

For a production deployment, authentication and request protection would be appropriate.

### Cost

The Lambda configuration uses a small amount of memory and a short timeout. AWS Lambda provides a Free Tier, but actual charges depend on the AWS account's Free Tier eligibility and usage.

---

## Technologies Used

### Frontend

* HTML
* CSS
* JavaScript
* Tailwind CSS via CDN

### Backend

* Node.js
* AWS Lambda
* AWS Lambda Function URL

### Compiler Implementation

* Hand-written lexical analyzer
* Recursive-descent parser
* Abstract Syntax Tree
* Symbol table
* Intermediate representation generator
* IR interpreter

### Testing

* Node.js
* Hand-written test suites

### AI Assistance

* Claude (Anthropic)
* ChatGPT (OpenAI)

---

## Project Structure

```text
compiler-visualizer/
│
├── frontend/
│   ├── index.html              # Main interface
│   ├── style.css               # Custom styling
│   ├── app.js                  # API requests and UI rendering
│   ├── config.js               # Lambda Function URL configuration
│   ├── examples.js             # Example programs
│   └── errorExplanations.js    # Error explanation logic
│
├── lambda/
│   ├── index.js                # Deployed Lambda handler
│   ├── lexer.js                # Lexical analyzer
│   ├── parser.js               # Recursive-descent parser and AST
│   ├── semantic.js              # Semantic analysis and symbol table
│   ├── irGenerator.js           # AST to intermediate representation
│   ├── interpreter.js           # IR interpreter
│   ├── compiler.js              # Local pipeline orchestration
│   ├── *.test.js                # Hand-written test suites
│   └── package.json
│
├── .gitignore
└── README.md
```

`compiler.js` is used for local orchestration/testing. The deployed Lambda handler in `index.js` orchestrates the production pipeline directly.

---

## Running Locally

The frontend is a static HTML/CSS/JavaScript application.

From the `frontend` directory, start a local HTTP server:

```cmd
cd frontend
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

Make sure `frontend/config.js` contains the deployed Lambda Function URL.

Example:

```javascript
const CONFIG = {
  API_URL: "YOUR_LAMBDA_FUNCTION_URL"
};
```

The Lambda Function URL is public by design and is **not a secret credential**.

---

## Deploying the Backend

The Lambda backend can be packaged and deployed using the AWS CLI.

### Package the Lambda Function

On Windows, the project uses the built-in `tar` command to create the ZIP archive:

```cmd
cd lambda
tar -a -c -f ..\function.zip index.js lexer.js parser.js semantic.js irGenerator.js interpreter.js
cd ..
```

### Create the Lambda Function

The function uses Node.js 20 and `index.handler`:

```cmd
aws lambda create-function --function-name compiler-visualizer --runtime nodejs20.x --role arn:aws:iam::ACCOUNT_ID:role/compiler-visualizer-role --handler index.handler --zip-file fileb://function.zip --timeout 10 --memory-size 128
```

### Create the Function URL

The project uses an AWS Lambda Function URL with native CORS:

```cmd
aws lambda create-function-url-config --function-name compiler-visualizer --auth-type NONE --cors "{\"AllowOrigins\":[\"*\"],\"AllowMethods\":[\"POST\"],\"AllowHeaders\":[\"content-type\"]}"
```

Public invocation permission is also required for the unauthenticated Function URL.

### Redeploy After a Code Change

```cmd
cd lambda
tar -a -c -f ..\function.zip index.js lexer.js parser.js semantic.js irGenerator.js interpreter.js
cd ..
aws lambda update-function-code --function-name compiler-visualizer --zip-file fileb://function.zip
```

---

## Running Tests

Each compiler stage has its own hand-written test suite and does not require an external testing framework.

```cmd
cd lambda
node lexer.test.js
node parser.test.js
node semantic.test.js
node irGenerator.test.js
node interpreter.test.js
node compiler.test.js
```

---

## Configuration and Environment Variables

The frontend currently stores the public Lambda Function URL in:

```text
frontend/config.js
```

No AWS credentials or secret keys are stored in the frontend.

AWS CLI credentials used for deployment are stored separately in the user's AWS CLI configuration and should never be copied into the project.

The Lambda deployment also uses configuration values for request handling, including the maximum source length.

---

## Limitations

* Only a small custom language is supported.
* Single global scope only.
* No nested scopes or blocks.
* No control-flow statements.
* No functions, arrays, or strings.
* Only integer values are supported.
* No optimization passes.
* No real machine-code generation.
* Execution is performed by an interpreter over the generated IR.
* The public Lambda Function URL has no authentication.
* The project is an educational prototype rather than a production compiler.

---

## Future Improvements

Possible future extensions include:

* Support for `if`/`else` and loops
* Functions and nested scopes
* Additional data types
* More advanced compiler optimizations
* Improved AST visualization
* Better syntax-error recovery
* More comprehensive language support
* Request throttling or authentication for production deployment
* Additional automated tests

These are **future improvements only** and are not part of the current implementation.

---

## AI Tooling Disclosure

This project was developed with assistance from **Claude (Anthropic)** and **ChatGPT (OpenAI)** for code generation, architecture guidance, debugging, testing guidance, documentation, and development support.

Both AI tools were used in accordance with the hackathon's permitted AI-assisted development requirements.

The final project was reviewed and tested by the developer, including manual testing of lexical errors, syntax errors, semantic errors, and runtime errors such as division by zero.

---

## Credits and Licenses

This project was developed for the **Bharat Builds / WeMakeDevs Hackathon**.

The project uses third-party technologies and services such as **AWS Lambda** and **Tailwind CSS via CDN**, which are subject to their respective licenses and terms.

No third-party source code was intentionally copied into the repository.


---

## Hackathon

**Bharat Builds / WeMakeDevs**

**Team / Author:** Sahrin Tahiyat Khusi

**Live Demo:** https://sahrin-tahiyat-choudhury.github.io/compiler-pipeline-visualizer/

**Demo Video:** [ADD LINK]

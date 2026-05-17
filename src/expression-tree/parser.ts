/* Inspired by Matklad: Simple but Powerful Pratt Parsing
https://matklad.github.io/2020/04/13/simple-but-powerful-pratt-parsing.html */
import { Lexer, type Token } from './lexer';
import { getInfixBP, getPrefixBP, getPostfixBP } from './binding-powers';

// Temporary data structure for testing
export interface Atom {
  type: 'Atom';
  value: string;
}
export interface Cons {
  type: 'Cons';
  head: string;
  rest: S[];
}

export type S = Atom | Cons;

export function formatS(node: S): string {
  switch (node.type) {
    case 'Atom':
      return node.value;

    case 'Cons': {
      // Recursively format every sub-node in the array
      const formattedRest = node.rest.map(formatS).join(' ');
      // If there are sub-nodes, add a space before them
      const space = formattedRest ? ' ' : '';
      return `(${node.head}${space}${formattedRest})`;
    }
  }
}


// 2. The Core Pratt Parser Loop
export const parseExpression = (lexer: Lexer, minBp: number = 0): S => {
  const token = lexer.next();
  let lhs: S;
  // --- PREFIX / ATOM PHASE ---
  if (token.type === 'Atom') {
    lhs = { type: 'Atom', value: token.value };
  } 
  else if (token.type === 'Op' && token.value === '(') {
    lhs = parseExpression(lexer, 0);
    const closeParen = lexer.next();
    if (closeParen.type !== 'Op' || closeParen.value !== ')') throw new SyntaxError("Expected ')'");
  } 
  else if (token.type === 'Op') {
    const prefixBP = getPrefixBP(token.value);
    if (prefixBP=== null) throw new SyntaxError(`Bad prefix token: ${token.value}`);
    
    const rhs = parseExpression(lexer, prefixBP);
    lhs = { type: 'Cons', head: token.value, rest: [rhs] };
  } 
  else {
    throw new SyntaxError("Unexpected token block");
  }

  // --- LOOKAHEAD LOOP PHASE (Infix & Postfix) ---
  while (true) {
    const nextToken = lexer.peek();
    if (nextToken.type === 'Eof') break;
    if (nextToken.type !== 'Op') throw new SyntaxError("Expected operator");
    const op = nextToken.value;

    // 1. Handle Postfix Operators (e.g., '!', '[')
    const postfixBP = getPostfixBP(op);
    if (postfixBP !== null) {
      if (postfixBP < minBp) break;
      lexer.next(); // Consume the operator

      if (op === '[') {
        const rhs = parseExpression(lexer, 0);
        const closeParen = lexer.next();
        if (closeParen.type !== 'Op' || closeParen.value !== ']') throw new SyntaxError("Expected ']'");
        lhs = { type: 'Cons', head: op, rest: [lhs, rhs] };
      } else {
        lhs = { type: 'Cons', head: op, rest: [lhs] };
      }
      continue;
    }

    // 2. Handle Infix Operators (e.g., '+', '?', '.')
    const bp = getInfixBP(op);
    // if ( bp === null && op !== ')' ) throw new SyntaxError(`"Invalid token: ${op}`)
    if (bp !== null) {
      const [l_bp, r_bp] = bp;
      if (l_bp < minBp) break;
      lexer.next(); // Consume the operator

      if (op === '?') { // Ternary Operator handling
        const mhs = parseExpression(lexer, 0);
        const closeParen = lexer.next();
        if (closeParen.type !== 'Op' || closeParen.value !== ':') throw new SyntaxError("Expected ':'");
        const rhs = parseExpression(lexer, r_bp);
        lhs = { type: 'Cons', head: op, rest: [lhs, mhs, rhs] };
      } else {
        const rhs = parseExpression(lexer, r_bp);
        lhs = { type: 'Cons', head: op, rest: [lhs, rhs] };
      }
      continue;
    }

    break;
  }

  return lhs;
};



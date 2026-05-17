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
export const exprBp = (lexer: Lexer, minBp: number = 0): S => {
  const token = lexer.next();
  let lhs: S;

  // --- PREFIX / ATOM PHASE ---
  if (token.type === 'Atom') {
    lhs = { type: 'Atom', value: token.value };
  } 
  else if (token.type === 'Op' && token.value === '(') {
    lhs = exprBp(lexer, 0);
    const closeParen = lexer.next();
    if (closeParen.type !== 'Op' || closeParen.value !== ')') throw new SyntaxError("Expected ')'");
  } 
  else if (token.type === 'Op') {
    const prefix = getPrefixBP(token.value);
    if (!prefix) throw new SyntaxError(`Bad prefix token: ${token.value}`);
    
    const rhs = exprBp(lexer, prefix.right);
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
    const postfix = getPostfixBP(op);
    if (postfix) {
      if (postfix.left < minBp) break;
      lexer.next(); // Consume the operator

      if (op === '[') {
        const rhs = exprBp(lexer, 0);
        const closeParen = lexer.next();
        if (closeParen.type !== 'Op' || closeParen.value !== ']') throw new SyntaxError("Expected ']'");
        lhs = { type: 'Cons', head: op, rest: [lhs, rhs] };
      } else {
        lhs = { type: 'Cons', head: op, rest: [lhs] };
      }
      continue;
    }

    // 2. Handle Infix Operators (e.g., '+', '?', '.')
    const infix = getInfixBP(op);
    if (infix) {
      if (infix.left < minBp) break;
      lexer.next(); // Consume the operator

      if (op === '?') { // Ternary Operator handling
        const mhs = exprBp(lexer, 0);
        const closeParen = lexer.next();
        if (closeParen.type !== 'Op' || closeParen.value !== ':') throw new SyntaxError("Expected ':'");
        const rhs = exprBp(lexer, infix.right);
        lhs = { type: 'Cons', head: op, rest: [lhs, mhs, rhs] };
      } else {
        const rhs = exprBp(lexer, infix.right);
        lhs = { type: 'Cons', head: op, rest: [lhs, rhs] };
      }
      continue;
    }

    break;
  }

  return lhs;
};



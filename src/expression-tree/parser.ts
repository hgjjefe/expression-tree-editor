/* Inspired by Matklad: Simple but Powerful Pratt Parsing
https://matklad.github.io/2020/04/13/simple-but-powerful-pratt-parsing.html */
import { Lexer, type Token } from './lexer';
import { getInfixBP, getPrefixBP, getPostfixBP } from './binding-powers';

// N-ary tree data structure to hold expressions
export type SExpression =
    | { type: 'Atom'; value: string }
    | { type: 'Cons'; value: string; rest: SExpression[] };

export function formatS(node: SExpression): string {
  switch (node.type) {
    case 'Atom':
      return node.value;

    case 'Cons': {
      if (node.value === PAREN){
         //return formatS(node.rest[0]);  // Ignore PAREN in printing
      }
      // Recursively format every sub-node in the array
      const formattedRest = node.rest.map(formatS).join(' ');
      // If there are sub-nodes, add a space before them
      const space = formattedRest ? ' ' : '';
      return `(${node.value}${space}${formattedRest})`;
    }
  }
}
 // Virtual operator for parenthesis to distinguish a+b+c and (a+b)+c
export const PAREN = '( )';

// 2. The Core Pratt Parser Loop
export const parseExpression = (lexer: Lexer, minBp: number = 0): SExpression => {
  const token = lexer.next();
  let lhs: SExpression;
  // --- PREFIX / ATOM PHASE ---
  if (token.type === 'Atom') {
    lhs = { type: 'Atom', value: token.value };
  } 
  else if (token.type === 'Op' && token.value === '(') {
    lhs = parseExpression(lexer, 0);
    const closeParen = lexer.next();
    if (closeParen.type !== 'Op' || closeParen.value !== ')') throw new SyntaxError("Expected ')'");
    if ( lhs.value !== PAREN )  //  Don't add PAREN if op is already PAREN
      lhs = { type: 'Cons', value: PAREN, rest: [lhs] }
  } 
  else if (token.type === 'Op') {
    const prefixBP = getPrefixBP(token.value);
    if (prefixBP=== null) throw new SyntaxError(`Bad prefix token: ${token.value}`);
    
    const rhs = parseExpression(lexer, prefixBP);
    if (token.value === '+'){  // Discard prefix '+' for simplicity
        lhs = rhs;
    }else
    lhs = { type: 'Cons', value: token.value, rest: [rhs] };
  } 
  else {
    throw new SyntaxError("Unexpected token block");
  }

  // --- LOOKAHEAD LOOP PHASE (Infix & Postfix) ---
  while (true) {
    const nextToken = lexer.peek();
    if (nextToken.type === 'Eof') break;
    if (nextToken.type !== 'Op') throw new SyntaxError(`Expected operator instead of '${nextToken.value}'`);
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
        lhs = { type: 'Cons', value: op, rest: [lhs, rhs] };
      } else {
        lhs = { type: 'Cons', value: op, rest: [lhs] };
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
        lhs = { type: 'Cons', value: op, rest: [lhs, mhs, rhs] };
      } else {
        const rhs = parseExpression(lexer, r_bp);
        lhs = { type: 'Cons', value: op, rest: [lhs, rhs] };
      }
      continue;
    }

    break;
  }
  if (lexer.peek().type === 'Eof' ){ 
    if (lhs.type !== 'Atom' && lhs.value === PAREN)  // Discard outermost paren that encloses whole expression
      lhs = lhs.rest[0];
  }

  return lhs; 
};

// Canonicalize expression by flattening consecutive left '+'s
export function canonicalize(sNode: SExpression): SExpression {
    if (sNode.type === 'Atom' || sNode.rest.length === 0){
        return sNode;   // Don't change if Atom
    }
    let op = sNode.value;
    // Discard right PAREN () if any
    if (sNode.type === 'Cons' && sNode.rest.length > 1) {
        const rightChild = sNode.rest[1];
        if (rightChild.type === 'Cons' && rightChild.value === PAREN) {
            sNode.rest[1] = rightChild.rest[0];
        }
    }
    //console.log("snode", formatS(sNode))
    //console.log("left", formatS(sNode.rest[0]), ", right:", formatS(sNode.rest[1]))
    let processedLeft = canonicalize(sNode.rest[0]);
    // If unary operator then no right so return already
    if (sNode.rest[1] === undefined){
      // Discard left PAREN () if any
        if (processedLeft.type === 'Cons' && processedLeft.value === PAREN){
            processedLeft = processedLeft.rest[0]
        }
        return { type: 'Cons', value: op, rest: [processedLeft] };
    }
    let processedRight = canonicalize(sNode.rest[1]);

    // Cononicalize (- A B) into (+ A (-B))
    if (op === '-'){
        processedRight = { type: 'Cons', value: '-', rest: [ processedRight ] };
        op = '+';
    } else if (op === '/'){  // Cononicalize (/ A B) into (* A (inv B))
        processedRight = { type: 'Cons', value: 'inv', rest: [ processedRight ] };
        op = '*';
    }  
    // Flatten (+ (+ A B) C) => (+ A B C) and  (* (* A B) C) => (* A B C)
    if (processedLeft.type === 'Cons' && processedLeft.value === op && (op ==='+'|| op ==='*')) {
        const result = {
            type: 'Cons',
            value: op,
            rest: [...processedLeft.rest, processedRight! ] } satisfies SExpression;
        return result;
    }
    // Discard left PAREN () if any
    if (processedLeft.type === 'Cons' && processedLeft.value === PAREN){
        processedLeft = processedLeft.rest[0]
    }
    // Don't change for other operators
    return {
        type: 'Cons',
        value: op,
        rest: [ processedLeft, processedRight ]
    };
}



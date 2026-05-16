import { create, all } from 'mathjs';
const math = create(all);

function isBracketed(expr: string) {
  let stack = []
  for (let i = 0; i < expr.length; i++) {
    if ('(' === expr[i]) {
      stack.push('(')
    } else if (')' === expr[i]) {
      stack.pop()
      if (stack.length === 0) {
        if (i !== expr.length - 1) {
          return false
        } else {
          return true
        }
      }
    }
  }
  return false;
}

function isValidExpression(expr: string) {
  if (expr.length < 3) {
    return false;
  }
  for (let i = 0; i < expr.length; i++) {
    if ('abcdefghijklmnopqrstuvwxyz*()/+-'.indexOf(expr[i]) === -1) {
      return false;
    }
  }
  try {
    while ("(" === expr[0] && ")" === expr[expr.length - 1]) {
      if (isBracketed(expr)) {
        expr = expr.substring(1, expr.length - 1);
      } else break;
    }
    let res = math.parse(expr);
    if ((typeof (res as any).implicit === 'undefined') || (res as any).fn.indexOf('unary') !== -1) {
      return false;
    }
    return true;
  }
  catch (ex) {
    return false;
  }
}

export function infixToPostfix(expression: string): string[] | null {
  if (!isValidExpression(expression)) {
    return null;
  }
  const prec: { [key: string]: number } = { "*": 3, "/": 3, "-": 2, "+": 2, "(": 1 }
  let op_stack = []
  let postfixList = []
  let tokens = expression.split('')
  for (const token of tokens) {
    if ("abcdefghijklmnopqrstuvwxyz".indexOf(token) !== -1) {
      postfixList.push(token)
    } else if ("(" === token) {
      op_stack.push(token)
    } else if (")" === token) {
      let top_op_token = op_stack.pop()
      while (top_op_token !== '(') {
        postfixList.push(top_op_token)
        top_op_token = op_stack.pop()
      }
    } else {
      let peek_elem = op_stack.slice(-1)[0];
      while (op_stack.length > 0 && (prec[peek_elem] >= prec[token])) {
        postfixList.push(op_stack.pop())
        peek_elem = op_stack.slice(-1)[0];
      }
      op_stack.push(token)
    }
  }
  while (op_stack.length > 0) {
    postfixList.push(op_stack.pop())
  }
  return postfixList as string[]
}
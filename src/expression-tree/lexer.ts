
export type Token =
  | { type: 'Atom'; value: string }
  | { type: 'Op'; value: string }
  | { type: 'Eof' };

export class Lexer {
  private tokens: Token[];
  constructor(input: string) {
    const tokens: Token[] = [];

    // Loop through the characters, filter out whitespace, and categorize
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      // Skip whitespace 
      if (/\s/.test(char)) {
        continue;
      }
      // Check for Atoms (Alphanumeric characters: 0-9, a-z, A-Z)
      if (/[0-9a-zA-Z]/.test(char)) {
        tokens.push({ type: 'Atom', value: char });
      } else {
        // Everything else is treated as an Operator
        tokens.push({ type: 'Op', value: char });
      }
    }

    // Reverse the array just like Rust does for highly efficient O(1) popping!
    tokens.reverse();
    this.tokens = tokens;
  }

  // Pulls the next token off the back of the array
  public next(): Token {
    return this.tokens.pop() ?? { type: 'Eof' };
  }

  // Looks at the next token without removing it
  public peek(): Token {
    if (this.tokens.length === 0) {
      return { type: 'Eof' };
    }
    return this.tokens[this.tokens.length - 1];
  }
}
/* Inspired by Matklad: Simple but Powerful Pratt Parsing
https://matklad.github.io/2020/04/13/simple-but-powerful-pratt-parsing.html */

export type Token =
  | { type: 'Atom'; value: string }
  | { type: 'Op'; value: string }
  | { type: 'Eof'; };

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
            } else if ('+-*/^!()=√'.indexOf(char) !== -1) {
                // Everything else is treated as an Operator
                tokens.push({ type: 'Op', value: char });
            } else {
                throw new SyntaxError(`Illegal token: '${char}'`);
            }
        }
        // Reverse the array for highly efficient O(1) popping
        tokens.reverse();
        this.tokens = tokens;
    }
    
  // Pulls the next token off the back of the array
  public next(): Token {
    return this.tokens.pop() ?? { type: 'Eof' };  // Fallback to 'Eof' if no tokens left
  }

  // Looks at the next token without removing it
  public peek(): Token {
    return this.tokens.at(-1) ?? { type: 'Eof' };
  }

  public getTokens(): Token[]{  // Getter method for getting tokens list
     return this.tokens;
  }
}

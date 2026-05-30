## Expression Tree Editor


This website is based on lnogueir's [expression-tree-gen](https://github.com/lnogueir/expression-tree-gen).
You can input an expression You can change the tree by selecting a node (**SPACE**) and then select a target (**SPACE** again or **F**). Different combinations of selected nodes and target nodes (called "gestures") will have different effect, such as swapping terms, moving terms to other side, expanding brackets, and factorization.

### Controls

###### Buttons

"Generate (old)" - Uses lnogueir's original code (but I removed the animations).

"Generate (binary)" - Parse expression into binary tree. Supports + - * / ^ √.

"Clear" - Clear the expression text input.

"Randomize Expression" - Randomly draws a pre-set expression.

"Canonicalize Expression" - Flatten PLUS and MULT nodes into n-nary branches, making it into a form more convenient for equation editing.

"Level Select" - Select an equation level to play.


###### Keyboard controls

**WASD / Arrow keys** - Move the orange cursor

**SPACE** - Select a node / its destination

**F** - Select destination in 'mult' mode

**E** - Flip both sides of equation

**R** - Click "Canonicalize Expression". Also works as a reset button in equation editing.

**L** - Next level

**K** - Previous level


### Levels

There are 30 equation levels. You win the level only when you tranform the equation into the form "x = Number" or "x = Number or Number" for quadratics.

### Gestures

(This is a non-exhaustive list because I can't remember all.)

Any node -> siblings : If no simplifcations, then swap them (use **F** to prevent simplifcations)

Top two/three levels node -> Other side's top two level node (SPACE) : Move PLUS/MINUS term to other side of equation

Top two/three levels node -> Other side's top two level node (F) : Move MULT/INV term to other side of equation

Number -> sibling Number  : Evaluate numbers (if evaluate fractions, then the result turns into float)

Number * Variable -> Number * sameVariable : Collect like terms

'+' -> parent '+' : Expand PLUS brackets

'*' -> parent '*' : Expand MULT brackets

'+' -> child (when >= 3 childs) (use **F**) : Unflattenr PLUS term (pull the child out of the sum)

'*' -> child (when >= 3 childs) (use **F**) : Unflattenr MULT term (pull the child out of the product)

'+' -> parent '*'|'-' : Expand brackets

'-' -> parent '-' : Double negation elimination

'inv' -> parent 'inv' : Double inverse elimination

'-' -> parent '*' : Pull negative out of the factor.

'-' -> parent '+' : Pull negative out of the sum.

'-' -> grandchild where its parent is '*' : Push negative into factor.

Term -> same Term under '+' : Factorize Term out of the sum.




Int -> self (SPACE) : break into sum of halves

Composites -> self (F) : break into prime factors

Prime -> self (SPACE) : Turns into Prime * 1

Float -> self : Turn into fractions

1 -> self (SPACE) : Turns into 2 - 1

1 -> self (F) : Turns into 2 / 2

Top level LHS '*' -> self  when equation in (x-A)*(x-B) form : Turns into x = A or B


### Credits

This is based on lnogueir's [expression-tree-gen](https://github.com/lnogueir/expression-tree-gen).

I also referred to matklad's article [Simple but Powerful Pratt Parsing](https://matklad.github.io/2020/04/13/simple-but-powerful-pratt-parsing.html) for the pratt parser.


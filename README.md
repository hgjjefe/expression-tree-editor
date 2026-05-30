## Expression Tree Editor


This website is based on lnogueir's expression-tree-gen
ou can input an expression You can change the tree by selecting a node (**SPACE**) and then select a target (**SPACE** again or **F**). Different combinations of selected nodes and target nodes (called "gestures") will have different effect, such as swapping terms, moving terms to other side expanding brackets, 

### Controls

###### Buttons

"Generate (old)" - Uses lnogueir's original code (but I removed the animations).

"Generate (binary)" - Uses my pratt parsing algorithm. Supports + - * / ^ √.

"Clear" - Clear the expression text input.

"Randomize Expression" - Randomly draws a pre-set expression.

"Canonicalize Expression" - Flatten PLUS and MULT nodes into n-nary branches, making it into a form more convenient for equation editing.

"Level Select" - Select an equation level to play.


###### Keyboard controls

**SPACE** - Select a node / its destination

**F** - Select destination in 'mult' mode

**E** - Flip both sides of equation

**R** - Click "Canonicalize Expression". Also works as a reset button in equation editing.


### Levels

There are 30 equation levels. You win the level only when you tranform the equation into the form "x = Number" or "x = Number or Number" for quadratics.

### Gestures

Any node -> siblings : If no simplifcations, then swap them

Top two/three levels node -> Other side's top two level node : Move term to other side of equation

Number -> sibling Number  : Evaluate numbers

Number * Variable -> Number * sameVariable : Collect like terms

'+' -> parent '*'|'-' : Expand brackets

'-' -> parent '-' : Double negation elimination


Int -> self (SPACE) : break into sum of halves

Composites -> self (F) : break into prime factors

Prime -> self (SPACE) : Turns into Prime * 1

1 -> self (SPACE) : Turns into 2 - 1

1 -> self (F) : Turns into 2 / 2







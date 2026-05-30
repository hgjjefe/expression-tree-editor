### Expression Tree Editor

This website is based on lnogueir's expression-tree-gen
ou can input an expression You can change the tree by selecting a node (**SPACE**) and then select a target (**SPACE** again or **F**). Different combinations of selected nodes and target nodes (called "gestures") will have different effect, such as swapping terms, moving terms to other side expanding brackets, 

#### Controls

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


#### Levels

There are 30 equation levels. You win the level only when you tranform the equation into the form "x = Number" or "x = Number or Number" for quadratics.

#### Gestures



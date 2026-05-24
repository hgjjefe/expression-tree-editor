import { re, smaller } from 'mathjs';
import { type SExpression, formatS } from './parser';
import { Zipper, type Crumb } from './zipper'

// Helper function to swap array elements
function swap(arr: any[], i: number, j: number){
    if (i>= arr.length || j >= arr.length){ 
        console.log("Cant swap elements. Index out of range."); return; }
    [arr[i], arr[j]] = [arr[j], arr[i]];
}

// Function to execute when SPACE is pressed
export function selectNode(zipper: Zipper, mode : 'plus'|'mult' = "plus"): boolean{
    let isSimplifyTree : boolean = false;
    //console.log("selected:", zipper.selected?.self);
    // Prevent selecting root node for now
    if (zipper.path.length === 0) return false;
    // SELECT CURRENT NODE (if currently select no node)
    if (zipper.selected === null){
        // Store the selected node and path to selected node
        zipper.selected = zipper.path.at(-1)!;
        zipper.selectedPath = [...zipper.path];
        // console.log("zipper selected:", formatS(zipper.focus), zipper.path)
        return false;
    }
    function resetSelected(){  // Helper to reset zipper.selected variables
        zipper.selected = null;  zipper.selectedPath = []; }
    // ===================
    // DESELECT NODE (if currently have selected some node)
    // console.log("selected:", formatS(zipper.selected.parent), "\nfocus:", formatS(zipper.path.at(-1)!.parent) );
    if (zipper.selected.self === zipper.focus ){
        console.log("Don't swap with yourself");
    } else if (zipper.selected.parent === zipper.focus){
        console.log("Don't swap with your parent");
    }
    // SWAP SIBLINGS: Same parent means the two nodes are siblings
    else if (zipper.selected.parent === zipper.path.at(-1)!.parent && zipper.selected.parent.value !== '=' ){
        if ( ! ['+', '*'].includes(zipper.selected.parent.value) ){
            console.log("Can't swap operands under non-commutative operators."); 
            resetSelected();
            return false;
        }
        // Swap selected node with current node
        let selectedIndex = zipper.selected.leftSiblings.length;
        let focusIndex = zipper.path.at(-1)!.leftSiblings.length;
        let sNode = zipper.selected.parent
        if (sNode.type === 'Atom') return false;
        swap(sNode.rest, selectedIndex, focusIndex);
        zipper.goUp();     // Renew the Crumb to fix siblings list being disordered
        zipper.goDown(focusIndex);
        // console.log("swap (sel, focus):", selectedIndex, focusIndex)
    }  
    // MOVE TERM to opposite side of equation
    else if (zipper.selectedPath.length <= 2 && zipper.path.length <= 2 // Only allow move top-2 layer
     && zipper.root.value === '='            // Only allow if this tree is an equation
     && ( ['+', '=', '*'].includes( zipper.selected.parent.value ) )  
     ){   
        let currentCrumb = zipper.path.at(-1)!; if(currentCrumb.parent.type==='Atom')return false;
         // Check if mode matches
        if ( ( zipper.selected.parent.value === '*' && mode === 'plus'  ) 
            || ( zipper.selected.parent.value === '+' && mode === 'mult'  )){
            console.log("Mode mismatch selected node. Cannot move terms.");
            resetSelected(); return false; }
        // If focus is level 2 then it must be numLiteral and parent must be '+' or '*'
        if ( zipper.path.length === 2  ){
            if (!['+','*'].includes(currentCrumb.parent.value)|| !isNumLiteral(zipper.focus) ){
                console.log("Cant move to non-number/non-comm operand level 2 focus");
                resetSelected(); return false;
            }  // Check if mode matches the destination's parent operand
            if ( ( currentCrumb.parent.value === '*' && mode === 'plus'  ) 
            || ( currentCrumb.parent.value === '+' && mode === 'mult'  )){
                console.log("Mode mismatch destination node. Cannot move terms.");
                resetSelected(); return false; }

        }
        console.log("Move terms across equation")
        // Put this unnecessarily check to shut ts compiler up
        if (zipper.root.type === 'Atom' || zipper.selected.parent.type === 'Atom'){ 
            resetSelected(); return false; }
        if (zipper.selected.self.value === '0'){ 
            console.log("Cannot move 0.")
            resetSelected(); return false; }
        //let lhsBranch = zipper.root.rest[0];
        //let rhsBranch = zipper.root.rest[1];
        let selectedBranch = zipper.selectedPath[0].self;
        let focus = zipper.focus
        if (selectedBranch === focus){ // Redundant check, but just to be safe
            console.log("Cant move terms across different layers of same side");
            resetSelected(); return false;
        }
        let focusIndex = zipper.path.at(-1)!.leftSiblings.length;
        let selectedIndex = zipper.selected.leftSiblings.length;

        let selectedNode: SExpression = zipper.selected.self
        //let pushOp = focus.value

        let invertOp = mode === 'plus' ? '-' : 'inv'
        // Invert selected node
        if (selectedNode.type === 'Atom' || ['+','*'].includes( selectedNode.value) ){
            selectedNode = insertOpAtTop(zipper.selectedPath.at(-1)!, null, selectedIndex, invertOp)!;
        }else if ( ['-','inv'].includes( selectedNode.value) )  {
            selectedNode = removeOpAtTop(zipper.selectedPath.at(-1)!, selectedIndex);
        }
        // MOVE and add PLUS/MINUS operator to the top of the other side
        // If two number literals, Combine number literals automatically
        if ( isNumLiteral(selectedNode) && isNumLiteral(focus)  ){
            console.log("NumNum")
            let op = mode === 'plus' ? '+' : '*'
            let res = evaluateNodes(op, focus, selectedNode);
            console.log("Evalto:", res?.value)
            currentCrumb.parent.rest[focusIndex] = res!;  
        }
          // Don't make a new op node
        else if ((focus.type !== 'Atom') && ((focus.value === '+' && mode === 'plus') || (focus.value === '*' && mode === 'mult'))   ){
            focus.rest.push(selectedNode);  
        }
        else{   // Insert a new op node at top
            if (mode === 'plus')
                insertOpAtTop(currentCrumb, selectedNode, focusIndex, '+')
            else if  (mode === 'mult')
                insertOpAtTop(currentCrumb, selectedNode, focusIndex, '*')
            //else if (focus.value === '/')
             //   insertOpAtTop(currentCrumb, selectedNode, focusIndex, '*')
        }

        // zipper.focus =  {type: 'Cons', value: '+', rest: [focus, selectedNode]} ;
        // Delete original selected node
        zipper.selected.parent.rest.splice(selectedIndex,1);
        if ( zipper.root.rest.length < 2 ){  // Insert 0 if a side is empty
            zipper.root.rest.splice( selectedIndex, 0, {type: 'Atom', value: mode === 'plus' ? '0' : '1'} );
        }
        // console.log("left:", zipper.selected.parent.rest)
        // if (zipper.root.rest.length < 2)  // No terms left at a side after moving
        //     zipper.root.rest.splice( focusIndex ,0, {type: 'Atom', value: '0'}  )
        zipper.goUp();
        zipper.goDown(focusIndex);
        isSimplifyTree = true;
    }
    else{
        console.log("No interesting operation happening")
    }

    resetSelected();
    return isSimplifyTree;
}

// Helper for mutating S Expression
// given A,B, construct (+ A B) and redirect the pointers of parents (childIndex means being the n-th child)
function insertOpAtTop(crumb: Crumb, newTerm: SExpression |null, childIndex: number, op = '+'): SExpression{
    let res: SExpression;     if (crumb.parent.type === "Atom") return crumb.self;
    if (newTerm === null){
        res = { type: 'Cons', value: op, rest: [crumb.self] }
    }
    else res = { type: 'Cons', value: op, rest: [crumb.self, newTerm] } satisfies SExpression;
    crumb.parent.rest[childIndex] = res;
    return res;
}
// Remove the top operator and return the first child
function removeOpAtTop(crumb: Crumb, childIndex: number): SExpression{
    if (crumb.self.type === "Atom"||crumb.parent.type === "Atom") return crumb.self; // Cant remove because it is not op
    let res = crumb.self.rest[0]
    crumb.parent.rest[childIndex] = res
    return res;
}
function isNumeric(str: string): boolean{
    return /^\d+$/.test(str);
}
// Check if node is in the form [number] or [-] -> [number]
function isNumLiteral(sNode: SExpression): boolean{
    if (sNode.type === 'Atom'){
        if ( isNumeric(sNode.value) ) return true;
        return false;
    }
    if ( sNode.value !== '-'  ) return false;
    if ( isNumeric(sNode.rest[0].value)) return true;
    return false;
}


// Simply Tree after a tranformation (Gemini version)
export function simplifyTree(sNode: SExpression): SExpression {
    function simplifyHelper(sNode: SExpression): SExpression {
        // Base case: Atoms cannot be simplified further
        if (sNode.type === 'Atom') return sNode;
        // 1. Simplify all children first recursively
        const simplifiedChildren = sNode.rest.map(simplifyHelper);

        // 2. Handle Addition Rules: (+ x 0) -> x, (+ 0 y) -> y
        if (sNode.value === '+') {
            // Filter out any zeroes from the addition array
            const nonZeroChildren = simplifiedChildren.filter(
                child => !(child.type === 'Atom' && child.value === '0')
            );
            // Safety Guard: If EVERY child was 0 (e.g. 0 + 0), return a single solid '0' Atom
            if (nonZeroChildren.length === 0) {
                
                return { type: 'Atom', value: '0' };
            }
            // If only one non-zero child remains, the '+' operator is redundant!
            if (nonZeroChildren.length === 1) {
                return nonZeroChildren[0];
            }
            return { type: 'Cons', value: '+', rest: nonZeroChildren };
        }

        // 3. Handle Multiplication Rules: (* x 0) -> 0
        if (sNode.value === '*') {
            // Filter out any ones from the addition array
            const nonOneChildren = simplifiedChildren.filter(
                child => !(child.type === 'Atom' && child.value === '1')
            );
            // Safety Guard: If EVERY child was 0 (e.g. 0 + 0), return a single solid '0' Atom
            if (nonOneChildren.length === 0) {
                return { type: 'Atom', value: '1' };
            }
            // If only one non-zero child remains, the '*' operator is redundant!
            if (nonOneChildren.length === 1) {
                return nonOneChildren[0];
            }
            const hasZero = simplifiedChildren.some(
                child => child.type === 'Atom' && child.value === '0'
            );
            // Annihilation property: anything times 0 becomes a single solid 0
            if (hasZero) {
                return { type: 'Atom', value: '0' };
            } else
            return { type: 'Cons', value: '*', rest: nonOneChildren };
        }

        // Default: Return the operator with its simplified children intact
        return { type: 'Cons', value: sNode.value, rest: simplifiedChildren };
    }

    return simplifyHelper(sNode);
}



// Evaluate two number node literals into a single node literal (i.e. a number node or negated number node)
function evaluateNodes(op: string, sA: SExpression, sB: SExpression):SExpression|null{
    // Only allow number op number for now
    if (!['+','*'].includes(op)){
        console.log("EvalNode dont support operators other than '+' and '*'."); return null;
    }
    let vA = sA.value; let vB = sB.value;
    // Reject if node value is neither a number or NEG
    if ( !isNumeric(vA) && vA !== '-' || !isNumeric(vB) && vB !== '-' ){
        console.log("Cant operate non-numbers for now"); return null;
    }
    if (op === '+'){
        let lA = sA.type==='Cons'&& sA.value === '-'? '-'+sA.rest[0].value  : sA.value;
        let lB = sB.type==='Cons'&& sB.value === '-'? '-'+sB.rest[0].value  : sB.value;
        let res = parseInt(lA) + parseInt(lB);
        if (res >= 0)
            return { type:'Atom', value: res.toString() };
        else
            return { type:'Cons', value: '-', rest: [ {type:'Atom', value:(-res).toString()}] };
    } // else '*'
        // Currently dont support fractions
        if (sA.type==='Cons'&& sA.value === 'inv' || sB.type==='Cons'&& sB.value === '-'){
            return null;
        }
        let lA = sA.type==='Cons'&& sA.value === '-'? '-'+sA.rest[0].value  : sA.value;
        let lB = sB.type==='Cons'&& sB.value === '-'? '-'+sB.rest[0].value  : sB.value;
        let res = parseInt(lA) * parseInt(lB);
        if (res >= 0)
            return { type:'Atom', value: res.toString() };
        else
            return { type:'Cons', value: '-', rest: [ {type:'Atom', value:(-res).toString()}] };

}


/*
export function simplifyTree(sNode: SExpression): SExpression{
    function simplifyHelper(sNode:SExpression): SExpression|null{
        if (sNode.type === 'Atom' && sNode.value === '0' ){
            return null;
        }
        else if (sNode.type === 'Atom' || sNode.rest.length === 0 ) return sNode;
        // Discard Unary plus
        if (sNode.value === '+' && sNode.rest.length === 1 ){
            return sNode.rest[0];
        }
        let rest : SExpression[] = sNode.rest.map( (s) => simplifyHelper(s) )
                        .filter( (s) => s !== null  );
        return { type: 'Cons', value: sNode.value, rest: [...rest] };
    }
    let result = simplifyHelper(sNode);
    if (result === null) return sNode;
    return result;

} 

*/
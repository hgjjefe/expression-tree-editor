import { smaller } from 'mathjs';
import { type SExpression, formatS } from './parser';
import { Zipper, type Crumb } from './zipper'

// Helper function to swap array elements
function swap(arr: any[], i: number, j: number){
    if (i>= arr.length || j >= arr.length){ 
        console.log("Cant swap elements. Index out of range."); return; }
    [arr[i], arr[j]] = [arr[j], arr[i]];
}

// Function to execute when SPACE is pressed
export function selectNode(zipper: Zipper): boolean{
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
    else if (zipper.selectedPath.length <= 2 && zipper.path.length == 1 // Only allow move top-2 to top-1 layer
     && zipper.root.value === '='            // Only allow if this tree is an equation
     && ( ['+', '-', '='].includes( zipper.selected.parent.value ) )
     && zipper.selected.parent.value !== '-'
     ){
        console.log("Move terms across equation")
        // Put this unnecessarily check to shut ts compiler up
        if (zipper.root.type === 'Atom' || zipper.selected.parent.type === 'Atom'){ 
            resetSelected(); return false; }
        let lhsBranch = zipper.root.rest[0];
        let rhsBranch = zipper.root.rest[1];
        let selectedBranch = zipper.selectedPath[0].self;
        let focus = zipper.focus
        if (selectedBranch === focus){ // Redundant check, but just to be safe
            console.log("Cant move terms across different layers of same side");
            resetSelected(); return false;
        }
        let focusIndex = zipper.path.at(-1)!.leftSiblings.length;
        let selectedIndex = zipper.selected.leftSiblings.length;
        let isNegatedTerm = zipper.selected.self.value === '-';    // Is moved "-Term"?
        let selectedNode: SExpression = zipper.selected.self
        let currentCrumb = zipper.path.at(-1)!;
        // Move and add PLUS/MINUS operator to the top of the other side
        if (!isNegatedTerm){
            selectedNode = insertOpAtTop(zipper.selectedPath.at(-1)!, null, selectedIndex, '-')!;
        }else {
            selectedNode = removeOpAtTop(zipper.selectedPath.at(-1)!, selectedIndex);
        }
        if (focus.type !== 'Atom' && focus.value === '+' )
            focus.rest.push(selectedNode);
        else{
            insertOpAtTop(currentCrumb, selectedNode, focusIndex, '+')
        }

        // zipper.focus =  {type: 'Cons', value: '+', rest: [focus, selectedNode]} ;
        zipper.selected.parent.rest.splice(selectedIndex,1);
        if ( zipper.root.rest.length < 2 ){  // Insert 0 if a side is empty
            console.log("Find 0")
            zipper.root.rest.splice( selectedIndex, 0, {type: 'Atom', value: '0'} );
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
// Gemini version
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
            const hasZero = simplifiedChildren.some(
                child => child.type === 'Atom' && child.value === '0'
            );
            // Annihilation property: anything times 0 becomes a single solid 0
            if (hasZero) {
                return { type: 'Atom', value: '0' };
            }
        }

        // Default: Return the operator with its simplified children intact
        return { type: 'Cons', value: sNode.value, rest: simplifiedChildren };
    }

    return simplifyHelper(sNode);
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
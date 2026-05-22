import { type SExpression, formatS } from './parser';
import { Zipper, type Crumb } from './zipper'

// Helper function to swap array elements
function swap(arr: any[], i: number, j: number){
    if (i>= arr.length || j >= arr.length){ 
        console.log("Cant swap elements. Index out of range."); return; }
    [arr[i], arr[j]] = [arr[j], arr[i]];
}

// Function to execute when SPACE is pressed
export function selectNode(zipper: Zipper){
    //console.log("selected:", zipper.selected?.self);
    // Prevent selecting root node for now
    if (zipper.path.length === 0) return ;
    // Select current node
    if (zipper.selected === null){
        // Store the selected node and path to selected node
        zipper.selected = zipper.path.at(-1)!;
        zipper.selectedPath = [...zipper.path];
        // console.log("zipper selected:", formatS(zipper.focus), zipper.path)
        return;
    }
    // Deselect node
    // console.log("selected:", formatS(zipper.selected.parent), "\nfocus:", formatS(zipper.path.at(-1)!.parent) );
    if (zipper.selected.self === zipper.focus ){
        console.log("Don't swap with yourself");
    }  // Same parent means the two nodes are siblings
    else if (zipper.selected.parent === zipper.path.at(-1)!.parent){
        if ( ! ['+', '*'].includes(zipper.selected.parent.value) ){
            console.log("Can't swap non-commutative operands."); 
            zipper.selected = null;  zipper.selectedPath = [];
            return;
        }
        // Swap selected node with current node
        let selectedIndex = zipper.selected.leftSiblings.length;
        let focusIndex = zipper.path.at(-1)!.leftSiblings.length;
        let sNode = zipper.selected.parent
        if (sNode.type === 'Atom') return;
        swap(sNode.rest, selectedIndex, focusIndex);
        zipper.goUp();
        zipper.goDown(focusIndex);

        // console.log("swap (sel, focus):", selectedIndex, focusIndex)
    }  // Move a plus term to opposite side of equation
    else if (zipper.selectedPath.length <= 2 && zipper.selected.parent.value === '+'
        && zipper.path.at(-1)!.parent.value === '='
     ){
        console.log("Move terms across equation")
        if (zipper.root.type === 'Atom'
            || zipper.selected.parent.type === 'Atom'
        ){ // Put this unnecessarily check to shut ts compiler up
            zipper.selected = null;
            zipper.selectedPath = []; return;
        }
        let focusIndex = zipper.path.at(-1)!.leftSiblings.length;
        let selectedIndex = zipper.selected.leftSiblings.length;
        let negatedTerm = {
                type: 'Cons',
                value: '-',
                rest: [ zipper.selected.self ]
            } as SExpression;
        if (zipper.focus.type==='Atom' ){
            zipper.root.rest[focusIndex] = {type: 'Cons', value: '+', rest: [zipper.focus, negatedTerm]} 
        }else if (zipper.focus.value !== '+' ){
            console.log("cant move to times (yet)")
            zipper.selected = null;
            zipper.selectedPath = []; return;
        }
        else{  // Cons
            zipper.focus.rest.push(negatedTerm);
        }
        zipper.selected.parent.rest.splice(selectedIndex,1);
        zipper.goUp();
        zipper.goDown(focusIndex);
    }
    else{
        console.log("No interesting operation happening")
    }

    zipper.selected = null;
    zipper.selectedPath = [];
    return;
}
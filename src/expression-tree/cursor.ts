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
    let isRecanonicalize : boolean = false;
    //console.log("selected:", zipper.selected?.self);
    // Prevent selecting root node for now
    if (zipper.path.length === 0) return false;
    // Select current node
    if (zipper.selected === null){
        // Store the selected node and path to selected node
        zipper.selected = zipper.path.at(-1)!;
        zipper.selectedPath = [...zipper.path];
        // console.log("zipper selected:", formatS(zipper.focus), zipper.path)
        return false;
    }
    // Deselect node
    // console.log("selected:", formatS(zipper.selected.parent), "\nfocus:", formatS(zipper.path.at(-1)!.parent) );
    if (zipper.selected.self === zipper.focus ){
        console.log("Don't swap with yourself");
    } else if (zipper.selected.parent === zipper.focus){
        console.log("Don't swap with your parent");
    }
    // Same parent means the two nodes are siblings
    else if (zipper.selected.parent === zipper.path.at(-1)!.parent && zipper.root.value !== '=' ){
        if ( ! ['+', '*'].includes(zipper.selected.parent.value) ){
            console.log("Can't swap non-commutative operands."); 
            zipper.selected = null;  zipper.selectedPath = [];
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
        isRecanonicalize = true;
        // console.log("swap (sel, focus):", selectedIndex, focusIndex)
    }  // Move a plus term to opposite side of equation
    else if (zipper.selectedPath.length <= 2 && zipper.path.length <= 2 // Only allow top two layers under root
     && zipper.root.value === '='
     && ( zipper.path.length === 1 )         // Can only move to first layer
     && (zipper.selected.parent.value === '+' 
        || zipper.selectedPath.length === 1 && zipper.selected.self.type === 'Atom'
        || zipper.selectedPath.length === 1 && zipper.selected.self.value === '-' )
     ){
        console.log("Move terms across equation")
        if (zipper.root.type === 'Atom' || zipper.selected.parent.type === 'Atom'
        ){ // Put this unnecessarily check to shut ts compiler up
            zipper.selected = null;
            zipper.selectedPath = []; return false;
        }
        let focusIndex = zipper.path.at(-1)!.leftSiblings.length;
        let selectedIndex = zipper.selected.leftSiblings.length;
        let negatedTerm: SExpression = zipper.selected.self.value !== '-' ? {
                type: 'Cons',
                value: '-',
                rest: [ zipper.selected.self ]
            } : zipper.focus.rest[0] ;
        if (zipper.focus.type==='Atom' || zipper.focus.value === '-' ){
            console.log("Negated!!")
            zipper.root.rest[focusIndex] = {type: 'Cons', value: '+', rest: [zipper.focus, negatedTerm]} 
        }else if (!['+','-'].includes( zipper.focus.value) ){
            console.log("cant move to times (yet)")
            zipper.selected = null;
            zipper.selectedPath = []; return false;
        }
        else{  // Cons
            zipper.focus.rest.push(negatedTerm);
        }
        zipper.selected.parent.rest.splice(selectedIndex,1);
        console.log("left:", zipper.selected.parent.rest)
        if (zipper.root.rest.length < 2)  // No terms left at a side after moving
            zipper.root.rest.splice( focusIndex ,0, {type: 'Atom', value: '0'}  )
        zipper.goUp();
        zipper.goDown(focusIndex);
        isRecanonicalize = true;
    }
    else{
        console.log("No interesting operation happening")
    }

    zipper.selected = null;
    zipper.selectedPath = [];
    return isRecanonicalize;
}
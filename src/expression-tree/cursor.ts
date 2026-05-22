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
        zipper.selected = zipper.path.at(-1)!;
        // console.log("zipper selected:", formatS(zipper.focus), zipper.path)
        return;
    }
    // Deselect node
    // console.log("selected:", formatS(zipper.selected.parent), "\nfocus:", formatS(zipper.path.at(-1)!.parent) );
    if (zipper.selected.self === zipper.focus ){
        console.log("Don't play yourself");
    } else if (zipper.selected.parent === zipper.path.at(-1)!.parent){
        if ( ! ['+', '*'].includes(zipper.selected.parent.value) ){
            console.log("Can't swap non-commutative operands."); 
            zipper.selected = null; return;
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
    }else{
        console.log("Age is just a number")
    }

    zipper.selected = null;
    return;
}
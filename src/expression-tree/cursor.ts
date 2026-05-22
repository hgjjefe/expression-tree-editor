import { type SExpression, formatS } from './parser';
import { Zipper, type Crumb } from './zipper'

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
        console.log("Play yourself");
    } else if (zipper.selected.parent === zipper.path.at(-1)!.parent){
        console.log("We are siblings")
    }else{
        console.log("Age is just a number")
    }

    zipper.selected = null;
    return;
}
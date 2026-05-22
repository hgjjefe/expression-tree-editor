import { type SExpression } from "./parser";

interface Crumb {
    parent: SExpression
    leftSiblings: SExpression[]
    rightSiblings: SExpression[]
}

export class Zipper {
    public root: SExpression;
    public focus: SExpression;
    private path: Crumb[];
    constructor(root: SExpression){
        this.root = root;
        this.focus = root;
        this.path = [];
    }
  // ==========================================
  // 1. GO DOWN: Step into a specific child
  // ==========================================
    public goDown(targetIndex: number) {
        if (this.focus.type === 'Atom'){
            console.log("Can't go down atom node"); return;
        } 
        if (targetIndex < 0 || targetIndex >= this.focus.rest.length) {
           console.log("Child index out of bounds"); return;
        }
        const parentNode = this.focus;
        // Split the siblings around the target child
        const lefts = parentNode.rest.slice(0, targetIndex);
        const rights = parentNode.rest.slice(targetIndex + 1).reverse(); // Reverse so the end is the next neighbor

        // Pack this context into a crumb and push it to our local history stack
        this.path.push({
            parent: parentNode,
            leftSiblings: lefts,
            rightSiblings: rights
        });
        // Move the focus down
        this.focus = parentNode.rest[targetIndex];
    }
    // ==========================================
    // 2. GO UP: Reconstruct the parent on the fly
    // ==========================================
    public goUp() {
    if (this.path.length === 0) {
        console.log("Already at the root node"); return;
    }
        // Pop the most recent history crumb off our stack
        const currentCrumb = this.path.pop()!;
        this.focus = currentCrumb.parent;   // Make parent the new focus
    }
    // ==========================================
    // 3. GO RIGHT: Shift sideways using fast pop/push
    // ==========================================
    public goRight() {
        if (this.path.length === 0) {
            console.log("Cannot move right at the root"); return;
    }
        const currentCrumb = this.path.at(-1);
        if (currentCrumb!.rightSiblings.length === 0) {
            console.log("No more right siblings"); return;
        }
        // Pop the next sibling from the end of the right stack
        const nextFocus = currentCrumb!.rightSiblings.pop()!;
        // Push our old focus onto the end of the left stack
        currentCrumb!.leftSiblings.push(this.focus);
        this.focus = nextFocus;
    }
    // ==========================================
    // 4. GO LEFT: Shift sideways using fast pop/push
    // ==========================================
    public goLeft() {
        if (this.path.length === 0) {
            console.log("Cannot move left at the root"); return;
        }
        const currentCrumb = this.path.at(-1);
        if (currentCrumb!.leftSiblings.length === 0) {
            console.log("No more left siblings"); return;
        }
        // Pop the next sibling from the end of the left stack
        const nextFocus = currentCrumb!.leftSiblings.pop()!;
        // Push our old focus onto the end of the right stack
        currentCrumb!.rightSiblings.push(this.focus);
        this.focus = nextFocus;
    }
}

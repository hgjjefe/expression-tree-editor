import { type SExpression } from "./parser";

export interface Crumb {
    self: SExpression
    parent: SExpression
    leftSiblings: SExpression[]
    rightSiblings: SExpression[]
}

export class Zipper {
    public root: SExpression;
    public focus: SExpression;      // Current node
    public selected: Crumb | null;  // For passing cursor selected node to TreeNode
    public path: Crumb[];
    public selectedPath: Crumb[];
    constructor(root: SExpression){
        this.root = root;
        this.focus = root;
        this.path = [];
        this.selected = null;
        this.selectedPath = [];
    }
  // ==========================================
  // 1. GO DOWN: Step into a specific child
  // ==========================================
    public goDown(targetIndex: number) {
        if (this.focus.type === 'Atom'){
            //console.log("Can't go down atom node"); 
            return;
        } 
        if (targetIndex < 0 || targetIndex >= this.focus.rest.length) {
           //console.log("Child index out of bounds"); 
           return;
        }
        const parentNode = this.focus;
        // Split the siblings around the target child
        const lefts = parentNode.rest.slice(0, targetIndex);
        const rights = parentNode.rest.slice(targetIndex + 1).reverse(); // Reverse so the end is the next neighbor
        // Move the focus down
        this.focus = parentNode.rest[targetIndex];
        // Pack this context into a crumb and push it to our local history stack
        this.path.push({
            self: this.focus,
            parent: parentNode,
            leftSiblings: lefts,
            rightSiblings: rights
        });
    }
    // ==========================================
    // 2. GO UP: Reconstruct the parent on the fly
    // ==========================================
    public goUp() {
    if (this.path.length === 0) {
        //console.log("Already at the root node"); 
        return;
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
           // console.log("Cannot move right at the root"); 
           return;
        }
        if (this.path.at(-1)!.rightSiblings.length === 0) {
            //console.log("Reached rightmost"); 
            return;
        }
        const currentCrumb = this.path.pop()!;
        // Make a shallow copy of currentCrumb
        let nextCrumb = {
            self : currentCrumb.self, parent: currentCrumb.parent,
            leftSiblings: [...currentCrumb.leftSiblings], rightSiblings: [...currentCrumb.rightSiblings]
        } satisfies Crumb;
        // Pop the next sibling from the end of the right stack
        const nextFocus = nextCrumb!.rightSiblings.pop()!;
        // Push our old focus onto the end of the left stack
        nextCrumb!.leftSiblings.push(this.focus);
        this.focus = nextFocus;
        nextCrumb!.self = this.focus;
        this.path.push(nextCrumb);
    }
    // ==========================================
    // 4. GO LEFT: Shift sideways using fast pop/push
    // ==========================================
    public goLeft() {
        if (this.path.length === 0) {
            //console.log("Cannot move left at the root"); 
            return;
        }
        if (this.path.at(-1)!.leftSiblings.length === 0) {
            //console.log("Reached leftmost"); 
            return;
        }
        const currentCrumb = this.path.pop()!;
        let nextCrumb = {
            self : currentCrumb.self, parent: currentCrumb.parent,
            leftSiblings: [...currentCrumb.leftSiblings], rightSiblings: [...currentCrumb.rightSiblings]
        } satisfies Crumb;
        // Pop the next sibling from the end of the left stack
        const nextFocus = nextCrumb!.leftSiblings.pop()!;
        // Push our old focus onto the end of the right stack
        nextCrumb!.rightSiblings.push(this.focus);
        this.focus = nextFocus;
        nextCrumb!.self = this.focus;
        this.path.push(nextCrumb);
    }
}

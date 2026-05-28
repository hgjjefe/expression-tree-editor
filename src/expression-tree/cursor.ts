import { type SExpression, formatS, type Atom, type Cons } from './parser';
import { Zipper, type Crumb } from './zipper'

// Helper function to swap array elements
export function swap(arr: any[], i: number, j: number){
    if (i>= arr.length || j >= arr.length){ 
        console.log("Cant swap elements. Index out of range."); return; }
    [arr[i], arr[j]] = [arr[j], arr[i]];
}

type EquationZipper = Zipper & {
    root: Omit<Cons, 'value'> & { value: '=' } ;
    select: Crumb
};
// Check canMoveTermAcross rules and use the EquationZipper type to shut TS compiler up
function assertValidMove(zipper: Zipper, mode: 'plus' | 'mult'): asserts zipper is EquationZipper {
    if (zipper.root.type === 'Atom' || zipper.root.value !== '=') throw new Error("Not an equation.");
    if (!zipper.selected) throw new Error("No selected node");
    
    const parentValue = zipper.selected.parent.value;
    if (parentValue === '*' && mode === 'plus' || parentValue === '+' && mode === 'mult') 
        throw new Error("Mode mismatches selected node. Cannot move terms.");
    // If selectedNode is level 3 then parent must be '*' and grandparent must be '-'
    if (zipper.selectedPath.length === 3){
        if (zipper.selected.parent.value !== '*' || zipper.selectedPath.at(-2)!.parent.value!=='-' )
            throw new Error("Cant move level 3 selected node that is not a factor of negative term.")
    }
    let currentCrumb = zipper.path.at(-1)!;
    // If focus is level 2 then it must be numLiteral and parent must be '+' or '*'
    if ( zipper.path.length === 2  ){
        if (!['+','*'].includes(currentCrumb.parent.value)|| !isNumLiteral(zipper.focus) ){
            throw new Error("Cant move to non-number/non-comm operand level 2 focus");
        }  // Check if mode matches the destination's parent operand
        if ( ( currentCrumb.parent.value === '*' && mode === 'plus'  ) 
        || ( currentCrumb.parent.value === '+' && mode === 'mult'  )){
            throw new Error("Mode mismatch destination node. Cannot move terms.");
        }
    }
    // Cannot move 0 node for simplicity (otherwise you may create many duplicates of 0)
    if (zipper.selected.self.value === '0') 
        throw new Error("Cannot move 0.");
    // Cant move to zero side in mult mode (to prevent 1=0 appearing)
    if (zipper.focus.value === '0' && mode === 'mult'
    && (zipper.selected.self.type==='Atom'||zipper.selected.self.value !== 'inv' ))
        throw new Error("Cant move factor to zero side.");

    // Check if selected node and destination are different sides
    if (zipper.selectedPath[0].self === zipper.path[0].self) 
        throw new Error("Cant move terms to diffrent levels of same side");
        
    // ... add the rest of your checks here
}
function fakeAssertValidMove(zipper: Zipper, mode: 'plus' | 'mult'): asserts zipper is EquationZipper{

};

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
    let focusIndex = zipper.path.at(-1)!.leftSiblings.length;
    if (zipper.selected.self === zipper.focus ){
        // If double selects float, then turn into fractions
        if (zipper.focus.type === 'Atom' && isNumeric(zipper.focus.value) && /\./.test(zipper.focus.value)){
            let currentCrumb = zipper.path.at(-1)!;
            let fraction = convertToFraction(Number(zipper.focus.value));
            let denominatorNode = { type: 'Cons', value: 'inv', rest: [
                {type: 'Atom', value: fraction[1].toString() }
            ] } satisfies SExpression;
            insertOpAtTop(currentCrumb, denominatorNode, null, '*');
            zipper.focus.value = fraction[0].toString();
            zipper.goUp();     // Renew the Crumb to fix siblings list being disordered
            zipper.goDown(focusIndex);
            resetSelected();  return false;
        }
        // If double select int, then break it into half
        if (zipper.focus.type === 'Atom' && isNumeric(zipper.focus.value) ){
            let num = Number(zipper.focus.value);
            if (!Number.isInteger(num) || num <= 1) 
                {resetSelected();  return false;}
            let halfA = Math.floor((Number(zipper.focus.value)+1)/2);
            let halfB = Number(zipper.focus.value) - halfA;
            let nodeA = {type:'Atom', value: halfA.toString()} satisfies SExpression;
            let nodeB = {type:'Atom', value: halfB.toString()} satisfies SExpression;
            zipper.path.at(-1)!.parent.rest.splice(focusIndex,1, 
                {type:'Cons', value:'+', rest:[ nodeA, nodeB ]});
            zipper.goUp();     // Renew the Crumb to fix siblings list being disordered
            zipper.goDown(focusIndex);
            resetSelected();  return false;
        }
        // Unpack squared in '^'
        if (zipper.focus.type==='Cons'&& zipper.focus.value==='^'
         && zipper.focus.rest.length===2 && zipper.focus.rest[1].value==='2' ){
            console.log("Unpack squared")
            zipper.focus.rest[1] = structuredClone(zipper.focus.rest[0]);
            zipper.path.at(-1)!.parent.rest[focusIndex] = zipper.focus;
            zipper.focus.value = '*';
            resetSelected();  return false;
        }

        if ( zipper.path.length === 1 && zipper.focus.value === '*'&& focusIndex === 0 ){
            let res =  getFactoredQuadratic(zipper.root);
            if (res===null) return false;
            let factorA; let factorB;
             [factorA, factorB] = res;
            let variable = getVar(factorA);
            if (zipper.root.type==='Atom')return false;
            if (factorA.type==='Atom' || factorB.type==='Atom')return false;
            zipper.root.rest.splice(0, 2);
            zipper.root.rest.push({type:'Atom', value: variable});
            let rootA = factorA.rest[1]
            let rootB = factorB.rest[1]
            if (rootA.type==='Cons'&& rootA.value === '-'){
                rootA = rootA.rest[0];
            }else{
                rootA = { type:'Cons', value:'-', rest: [rootA] }
            }
            if (rootB.type==='Cons'&& rootB.value === '-'){
                rootB = rootB.rest[0];
            }else{
                rootB = { type:'Cons', value:'-', rest: [rootB] }
            }
            zipper.root.rest.push( {type:'Cons', value: '∨', rest: 
                [rootA, rootB] }  )
            resetSelected();  return true;
        }

        console.log("Swap with yourself only with ints or floats or '^' or '*' in factored quadEq.");
        // test
        // let non = nonNumLiteralTerm(zipper.focus)
        // zipper.focus = non;
        // zipper.selected.parent.rest[focusIndex] = non;
    }  
    // SWAP WITH PARENT
    else if (zipper.selected.parent === zipper.focus){
        //console.log("sel, focus",zipper.selected.self.value,zipper.focus.value )
        let currentCrumb = zipper.path.at(-1)!;
        let focusIndex = zipper.path.at(-1)!.leftSiblings.length;
        // If same comm-operator, flatten brackets
        if ( (zipper.selected.self.value === '+' && zipper.focus.value === '+') 
            || (zipper.selected.self.value === '*' && zipper.focus.value === '*')  ){
            //currentCrumb.parent.rest[focusIndex] = zipper.selected.self
            let selected = zipper.selected; if (selected.self.type==='Atom')return false;
            zipper.focus.rest = [...selected.leftSiblings, ...selected.self.rest, ...selected.rightSiblings.reverse() ];
            zipper.goUp();     // Renew the Crumb to fix siblings list being disordered
            zipper.goDown(focusIndex);
            resetSelected();  return false;
        } 
        let selectedIndex = zipper.selected.leftSiblings.length;

        // Double Negation elimination
        if (zipper.selected.self.value === '-' && zipper.focus.value === '-') {
            if (zipper.selected.self.type==='Atom')return false;
            currentCrumb.parent.rest[focusIndex] = zipper.selected.self.rest[0]
            zipper.goUp();     // Renew the Crumb to fix siblings list being disordered
            zipper.goDown(focusIndex);
            resetSelected();  return false;
        }
        // Break negative brackets -(A+B)  => -A + -B
        if (zipper.selected.self.value === '+' && zipper.focus.value === '-') {
            if (zipper.selected.self.type==='Atom')return false;
            currentCrumb.parent.rest[focusIndex] = zipper.selected.self;
            zipper.goUp();     // Renew the Crumb to fix siblings list being disordered
            zipper.goDown(focusIndex);
            for (let i=0;i<zipper.selected.self.rest.length; i++){
                let childNode = zipper.selected.self.rest[i];
                childNode = {type: 'Cons', value: '-', rest: [childNode] };
                zipper.selected.self.rest[i] = childNode;
            }
            resetSelected();  return false;
        }
        // Pull out negatve outside factor:  a*-b  => -(a*b)
        if (zipper.selected.self.value === '-' && zipper.focus.value === '*'){
            if (zipper.selected.self.type==='Atom')return false;
            zipper.focus.rest[selectedIndex] = zipper.selected.self.rest[0];
            insertOpAtTop(currentCrumb, null, null, '-');
            zipper.goUp();     // Renew the Crumb to fix siblings list being disordered
            zipper.goDown(focusIndex);
            simplifyFocus(zipper);
            resetSelected();  return false;
        }
        // Pull out negatve outside inv: inv(-b)  => -inv(b)
        if (zipper.selected.self.value === '-' && zipper.focus.value === 'inv'){
            if (zipper.selected.self.type==='Atom')return false;
            zipper.focus.rest[selectedIndex] = zipper.selected.self.rest[0];
            insertOpAtTop(currentCrumb, null, null, '-');
            zipper.goUp();     // Renew the Crumb to fix siblings list being disordered
            zipper.goDown(focusIndex);
            resetSelected();  return false;
        }

        // Unflatten out one term in '+' or '*' node with 3 or more terms (in mult mode)
        if ( ['+','*'].includes( zipper.focus.value) && zipper.focus.rest.length >= 3 
             && mode !== 'plus'){
            let op = zipper.focus.value;
            removeNode(zipper,mode);
            insertOpAtTop(currentCrumb, zipper.selected.self, null, op);
            zipper.goUp();     // Renew the Crumb to fix siblings list being disordered
            zipper.goDown(focusIndex);
            resetSelected();  return false;
        }

        if ( !(zipper.selected.self.value === '+' && zipper.focus.value === '*'&& mode==='plus') ){
            console.log("No bracket to expand.");
            resetSelected();  return false;
        }  if (zipper.selected.self.type==='Atom')return false // SHUT UP
        // Expand brackets: (* A (+ B C)) => (+ (* A B) (* A C))
        let resultTerms: SExpression[] = [];
        for (let childNode of zipper.selected.self.rest) {
            let reversedRight = [...zipper.selected.rightSiblings].reverse();
            // Deep clone the siblings so they occupy completely separate memory addresses
            let clonedLeft = zipper.selected.leftSiblings.map(node => structuredClone(node));
            let clonedRight = reversedRight.map(node => structuredClone(node));
            // If childNode is an object, deep clone it too just to be completely safe!
            let clonedChild = structuredClone(childNode);
            let resultTerm = {
                type: 'Cons', 
                value: '*', 
                rest: [...clonedLeft, clonedChild, ...clonedRight] 
            } satisfies Cons;
            resultTerms.push(resultTerm);
        }
        zipper.focus.rest = resultTerms;
        zipper.focus.value = '+';
    }
    // SWAP WITH GRANDPARENT: -1 extraction in '*'s negative children
    else if (zipper.selectedPath.length >=2 && zipper.selectedPath.at(-2)!.parent === zipper.focus
    && zipper.focus.value === '*' && zipper.selected.parent.value === '-'
    ){
        let leftUncles = zipper.selectedPath.at(-2)!.leftSiblings;
        zipper.focus.rest.splice(leftUncles.length+1,0,zipper.selected.self)
        zipper.selected.parent.rest[0] = {type: 'Atom', value: '1'};
    }

    // SWAP SIBLINGS: Same parent means the two nodes are siblings
    else if (zipper.selected.parent === zipper.path.at(-1)!.parent && zipper.selected.parent.value !== '=' ){
        if ( ! ['+', '*'].includes(zipper.selected.parent.value) ){
            console.log("Can't swap operands under non-commutative operators."); 
            resetSelected();
            return false;
        }
        let selectedIndex = zipper.selected.leftSiblings.length;
        let focusIndex = zipper.path.at(-1)!.leftSiblings.length;
        let currentCrumb = zipper.path.at(-1)!;
        // Auto evaluate num literals if in plus mode
        if ( isNumLiteral(zipper.selected.self) && isNumLiteral(zipper.focus)&& mode==='plus'){
            if( zipper.root.type==='Atom')return false;
            let op = zipper.selected.parent.value
            let res = evaluateNodes(op, zipper.focus, zipper.selected.self);
            console.log("Eval to:", formatS(res))
            currentCrumb.parent.rest[focusIndex] = res!;
            // Delete original selected node
            removeNode(zipper, mode);
            zipper.goUp();
            simplifyFocus(zipper);
            resetSelected();
            return false;
        }
        // Additive / Multiplicative inverse annihilation
        if ( zipper.focus.type !== 'Atom' && ['+','*'].includes(zipper.selected.parent.value) &&
            ['-','inv'].includes(zipper.focus.value) ){
            let selectedStr = formatS(zipper.selected.self); let focusStr=formatS(zipper.focus.rest[0]);
            if (selectedStr === focusStr ){
                // removeOpAtTop(currentCrumb, focusIndex);
                // removeNode(zipper, selectedIndex, mode);
                let siblings = zipper.selected.parent.rest;
                const largerIndex = Math.max(selectedIndex, focusIndex);
                const smallerIndex = Math.min(selectedIndex, focusIndex);
                if (zipper.selected.parent.value==='+'&& zipper.focus.value === '-'){ // Delete both nodes
                    siblings.splice(largerIndex, 1);
                    siblings.splice(smallerIndex, 1);
                } else if (zipper.selected.parent.value==='*'&& zipper.focus.value === 'inv'){   // 'inv'
                    currentCrumb.parent.rest[focusIndex] = {type:'Atom', value:'1'};
                    removeNode(zipper, mode);
                }else {resetSelected();  return false;}
                zipper.goUp();  simplifyFocus(zipper);;
                resetSelected();  return false;
            }
        }
        // Combine like terms
        if (zipper.selected.parent.value ==='+' && mode == 'plus' &&
            !isNumLiteral(zipper.selected.self) && !isNumLiteral(zipper.focus)
           && getCoefficient(zipper.selected.self) && getCoefficient(zipper.focus) ){
            let nonNumLitSelected = nonNumLiteralFactor(zipper.selected.self)!;
            let nonNumLitFocus = nonNumLiteralFactor(zipper.focus)!;
            console.log("Terms to collect:", formatS(nonNumLitSelected), formatS(nonNumLitFocus))
            if ( formatS(nonNumLitSelected) == formatS(nonNumLitFocus) ){
                let coeSelected = getCoefficient(zipper.selected.self)!;
                let coeFocus = getCoefficient(zipper.focus)!;
                //console.log("coes:", formatS(coeSelected), formatS(coeFocus));
                let resCoe = evaluateNodes('+', coeSelected, coeFocus);
                //console.log("rescoe:", formatS(resCoe));
                let resNonNumLit = (nonNumLitFocus.type==='Atom')? [nonNumLitFocus]:
                                   (nonNumLitFocus.value !=='*')? [nonNumLitFocus]:
                                    nonNumLitFocus.rest;

                currentCrumb.parent.rest[focusIndex] = {type:'Cons',
                    value: '*', rest: [ resCoe!, ...resNonNumLit ]
                }
                removeNode(zipper, mode);
                zipper.goUp();   simplifyFocus(zipper);
                resetSelected();  return false;
            }
        }
        // Times 1: (* a 1) => (a)
        if (zipper.selected.parent.value === '*' && zipper.selected.self.value === '1'){
            removeNode(zipper, mode);
            zipper.goUp();   simplifyFocus(zipper);
            resetSelected();  return false;
        }else if (zipper.selected.parent.value === '*' && zipper.focus.value === '1'){
            zipper.focus = zipper.selected.self;
            zipper.path.at(-1)!.parent.rest[focusIndex] = zipper.focus;
            removeNode(zipper, mode);
            zipper.goUp();   simplifyFocus(zipper);
            resetSelected();  return false;
        }

        // Turn into squared:  (* a a) => (^ a 2)
        if (zipper.selected.parent.value === '*' 
            && formatS(zipper.selected.self) === formatS(zipper.focus)){
            console.log("ADDA", zipper.path.at(-1)!)
                insertOpAtTop(zipper.path.at(-1)!, {type:'Atom', value:'2'}, focusIndex, '^');
            removeNode(zipper, mode);
            zipper.goUp();   simplifyFocus(zipper);
            resetSelected();  return false;
        }

        // Swap selected node with current node
        let sNode = zipper.selected.parent
        swap(sNode.rest, selectedIndex, focusIndex);
        zipper.goUp();     // Renew the Crumb to fix siblings list being disordered
        zipper.goDown(focusIndex);
        // console.log("swap (sel, focus):", selectedIndex, focusIndex)
    }  
    // FACTOR OUT COMMON FACTORS (cousin or uncle being the same atom)
    else if (isFactorizable(zipper)){
        console.log("FACTORIZE:", formatS(zipper.focus));
        let currentCrumb = zipper.path.at(-1)!;
        let focusIndex = zipper.path.at(-1)!.leftSiblings.length;
        let selectedIndex = zipper.selected.leftSiblings.length;
        let lca = lowestCommonAncester(zipper.selectedPath, zipper.path);
        if (lca === null || lca.self.type==='Atom')return false;
        let lcaLevel = zipper.path.indexOf(lca);
        console.log("lcapos,", lcaLevel)
        let lcaChildSelectedIndex = zipper.selectedPath[lcaLevel+1].leftSiblings.length;
        let lcaChildFocusIndex = zipper.path[lcaLevel+1].leftSiblings.length;
        let lcaChildSelTerm = zipper.selectedPath[lcaLevel+1].self;
        let lcaChildFocusTerm = zipper.path[lcaLevel+1].self;
        //let isLCSelTermPositve = zipper.selectedPath[lcaLevel+1].self.value !== '-';
        //let isLCFocusTermPositve = zipper.path[lcaLevel+1].self.value !== '-';
        // Extract (delete) the chosen factor from selected and focus
        removeNode(zipper, mode);
        currentCrumb.parent.rest.splice(focusIndex, 1);
        let factoredRemnant:SExpression = {type:'Cons', value:'+', 
            rest: (lcaChildSelectedIndex < lcaChildFocusIndex?[lcaChildSelTerm,lcaChildFocusTerm]
                                                             :[lcaChildFocusTerm,lcaChildSelTerm] ) }; 
        //console.log("FactorRem,", formatS(factoredRemnant));
        //if (!isLCFocusTermPositve) insertOpAtTop(zipper.path.at(-2)!, null, null, '-');
        //if (!isLCSelTermPositve) insertOpAtTop(zipper.selectedPath.at(-2)!, null, null, '-');
        let newTerm:SExpression = {type:'Cons', value:'*', rest: [zipper.focus, factoredRemnant ]} ;
        lca.self.rest.splice(lcaChildFocusIndex, 1, newTerm );
        // Remove the selected branch in lca's child
        lca.self.rest.splice(lcaChildSelectedIndex, 1);



        resetSelected();  return true;
    }

    // MOVE TERM to opposite side of equation
    else if (zipper.selectedPath.length <= 3 && zipper.path.length <= 2 // Only allow move top-2 layer
     && zipper.root.value === '='            // Only allow if this tree is an equation
     && ( ['+', '=', '*'].includes( zipper.selected.parent.value ) )  
     ){   // Check canMoveTermAcross conditions
        try {
            assertValidMove(zipper, mode);
        } catch (error){
            console.log((error as Error).message);
            resetSelected(); return false;
        }
        console.log("Move terms across equation")
        let currentCrumb = zipper.path.at(-1)!;
        //let lhsBranch = zipper.root.rest[0];
        //let rhsBranch = zipper.root.rest[1];
        let focus = zipper.focus
        let focusIndex = zipper.path.at(-1)!.leftSiblings.length;
        let selectedIndex = zipper.selected.leftSiblings.length;
        let selectedNode: SExpression = zipper.selected.self
        let invertOp = mode === 'plus' ? '-' : 'inv'
        // ======= Transformation starts here =======
        // INVERT selected node
        if (selectedNode.type === 'Atom' || ['+','*'].includes( selectedNode.value)||['-'].includes( selectedNode.value)&&mode==='mult'){
            selectedNode = insertOpAtTop(zipper.selectedPath.at(-1)!, null, selectedIndex, invertOp)!;
        }else if ( ['-'].includes( selectedNode.value) && mode==='plus' || ['inv'].includes( selectedNode.value) && mode==='mult' )  {
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
        removeNode(zipper, mode);
        // console.log("left:", zipper.selected.parent.rest)
        // if (zipper.root.rest.length < 2)  // No terms left at a side after moving
        //     zipper.root.rest.splice( focusIndex ,0, {type: 'Atom', value: '0'}  )
        isSimplifyTree = true;
    }
    else{
        console.log("No interesting operation happening")
    }

    resetSelected();
    return isSimplifyTree;
}

// Helper for mutating S Expression
function removeNode(zipper: Zipper, mode:'plus'|'mult'){
    let selectedIndex = zipper.selected!.leftSiblings.length;
    if (zipper.selected === null) return;
    fakeAssertValidMove(zipper, mode);
    zipper.selected.parent.rest.splice(selectedIndex,1);
    if ( zipper.root.rest.length < 2 ){  // Insert 0 if a side is empty
        zipper.root.rest.splice( selectedIndex, 0, {type: 'Atom', value: mode === 'plus' ? '0' : '1'} );
    }
}

// given A,B, construct (+ A B) and redirect the pointers of parents (childIndex means being the n-th child)
function insertOpAtTop(crumb: Crumb, newTerm: SExpression |null, childIndex: number|null, op = '+'): SExpression{
    let res: SExpression;
    if (childIndex === null) childIndex = crumb.leftSiblings.length;
    if (newTerm === null){
        res = { type: 'Cons', value: op, rest: [crumb.self] }
    }
    else res = { type: 'Cons', value: op, rest: [crumb.self, newTerm] } satisfies SExpression;
    crumb.parent.rest[childIndex] = res;
    return res;
}
// Remove the top operator and return the first child
function removeOpAtTop(crumb: Crumb, childIndex: number): SExpression{
    if (crumb.self.type === "Atom") return crumb.self; // Cant remove because it is not op
    let res = crumb.self.rest[0]
    crumb.parent.rest[childIndex] = res
    return res;
}
function isNumeric(str: string): boolean{
    return /^\d+(\.\d+)?$/.test(str);
}
// Check if node is in the form [number] or [-] -> [number]
export function isNumLiteral(sNode: SExpression): boolean{
    if (sNode.type === 'Atom'){
        if ( isNumeric(sNode.value) ) return true;
        return false;
    }
    // Also accepts (inv m)
    if (sNode.value === 'inv'){
        return isNumeric(sNode.rest[0].value);
    }  
    // Not accept Rationals for now (* n (inv m))
    // if (sNode.value === '*'){
    //     if (sNode.rest.length !== 2) return false;
    //     if ( !isNumeric(sNode.rest[0].value)) return false;
    //     if ( sNode.rest[1].type === 'Atom' ) return false;
    //     if ( sNode.rest[1].value !== 'inv') return false;
    //     if ( !isNumeric(sNode.rest[1].rest[0].value) ) return false;
    //     return true;
    // }
    if ( sNode.value !== '-'  ) return false;
    if ( sNode.rest[0].value === '-') return false; // Not accept (- (- (Term)))
    return isNumLiteral( sNode.rest[0] );
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

        // 3. Handle Multiplication Rules: (* x 0) -> 0, (* x 1) -> x
        if (sNode.value === '*') {
            // Rule A: Annihilation - If ANY child is 0, the whole multiplication becomes 0
            const hasZero = simplifiedChildren.some(
                child => child.type === 'Atom' && child.value === '0' );
            if (hasZero) {
                return { type: 'Atom', value: '0' }; }
            // Rule B: Identity - Filter out '1's because multiplying by 1 changes nothing
            const nonOneChildren = simplifiedChildren.filter(
                child => !(child.type === 'Atom' && child.value === '1')
            );
            // Safety Guard: If EVERY child was 1 (e.g., 1 * 1 * 1), return a single '1' Atom
            if (nonOneChildren.length === 0) {
                return { type: 'Atom', value: '1' };
            }
            // Rule C: Redundancy - If only one non-one child remains (e.g., x * 1), drop the '*' operator
            if (nonOneChildren.length === 1) {
                return nonOneChildren[0];
            }
            // If multiple distinct variables remain (e.g., x * y), return the simplified node
            return { type: 'Cons', value: '*', rest: nonOneChildren };
        }

        // Default: Return the operator with its simplified children intact
        return { type: 'Cons', value: sNode.value, rest: simplifiedChildren };
    }

    return simplifyHelper(sNode);
}
// Turn num literal node into a number type
function parseNumLiteral(sNode: SExpression): number|null{
    console.log("ADSA,", formatS(sNode))
    if ( !isNumLiteral(sNode) ){
        console.log("Cant parse non-numberLiteral."); return null;
    } 
    if ( sNode.type === 'Atom' ) return Number(sNode.value);
    if (sNode.value === '-' ) return -parseNumLiteral(sNode.rest[0])!;
    if (sNode.value === 'inv') return 1/Number(sNode.rest[0].value);
    return null
}

// Evaluate two number node literals into a single node literal (i.e. a number node or negated number node)
function evaluateNodes(op: string, sA: SExpression, sB: SExpression):SExpression|null{
    // Only allow number op number for now
    if (!['+','*'].includes(op)){
        console.log("EvalNode dont support operators other than '+' and '*'."); return null;
    }
    let vA = sA.value; let vB = sB.value;
    // Reject if node value is neither a number or NEG
    if ( !isNumeric(vA) && !['-','inv'].includes(vA) || !isNumeric(vB) && !['-','inv'].includes(vB) ){
        console.log("Cant operate non-numbers for now"); return null;
    }
    if (op === '+'){
        let lA = parseNumLiteral(sA)!;
        let lB = parseNumLiteral(sB)!;
        let res:number|string = lA + lB;
        res = snapToInteger(res);
        if (res >= 0)
            return { type:'Atom', value: res.toString() };
        else
            return { type:'Cons', value: '-', rest: [ {type:'Atom', value: (-res).toString()}] };
    } // else '*'
        let lA = parseNumLiteral(sA)!;
        let lB = parseNumLiteral(sB)!;
        let res:number|string = lA * lB;
        res = snapToInteger(res);
        //console.log('AB', lA, lB)
        if (res >= 0)
            return { type:'Atom', value: res.toString() };
        else
            return { type:'Cons', value: '-', rest: [ {type:'Atom', value: (-res).toString()}] };
}
// For displaying float to 4 decimal place (underlying has more d.p.)
export function displayNum(num: string): string{
    // If contains ".", then it is a float
    if (/\./.test(num)){ 
        return Number(num).toFixed(4).replace(/\.?0+$/, "")
    }
    return num; // unchanged otherwise
}

// Get the subtree excluding any number literals
function nonNumLiteralFactor(sNode: SExpression): SExpression|null{
    if (sNode.type === 'Atom'){
        if (!isNumLiteral(sNode)) return sNode;
        return null;
    } 
    if (sNode.value === '-') return nonNumLiteralFactor(sNode.rest[0]);
    if (sNode.value === '*'){
        let res = sNode.rest.filter( (s) => !isNumLiteral(s) );
        if (res.length ===0) return null;
        if (res.length ===1) return res[0];
        return { type: 'Cons', value: sNode.value, rest: res};
    }
    return sNode;
}
// Get a single number literal factor only
function getCoefficient(sNode: SExpression, negated:boolean= false):SExpression|null {
    if (sNode.type === 'Atom'){
        if (isNumLiteral(sNode)){
            if (!negated) return sNode;
            return {type:'Cons', value:'-', rest: [sNode]};
        } 
        if (!negated) return { type:'Atom', value:'1'};
        return { type:'Cons', value:'-', rest:[{ type:'Atom', value:'1'}]};
    } 
    if (sNode.value === '-'){
        return getCoefficient(sNode.rest[0], !negated);
    }
    if (sNode.value === '*'){
        let res = sNode.rest.filter( (s) => isNumLiteral(s) );
        if (res.length !== 1) return null;
        return (!negated)? res[0] : {type:'Cons', value:'-', rest:[res[0]]};
    }
    return null;
}

// FOR FACTORING move, invoked after DESELECTION
function isFactorizable(zipper: Zipper): boolean{
    // Must have grandparents
    let currentCrumb = zipper.path.at(-1)!;
    if (zipper.selectedPath.length < 2 || zipper.selectedPath.length < 2) return false;
    // At least one of selected / focus 's parent must be *
    if (currentCrumb.parent.value !== '*' && zipper.selected!.parent.value !== '*') return false;
    // Focus and Selected node must be the same formula

    if (!( formatS(zipper.selected!.self) === formatS(zipper.focus) )) return false;
    let lca = lowestCommonAncester(zipper.selectedPath, zipper.path);
    // Lowest common ancester must be '+'
    if (lca === null || lca.self.value !== '+') return false;
    // Check if parent operators  up to lca follow rules ([Selected]->[-,+,*], [*]->[-,+], [-]->[+])
    if ( !checkParentOpToLCA(zipper.selectedPath, lca.self) || !checkParentOpToLCA(zipper.path, lca.self) ) return false;


    return true
}
// Helper 1 for isFactorizable
function lowestCommonAncester(pathA: Crumb[], pathB: Crumb[]): Crumb | null {
    let lca: Crumb | null = null;
    let i = 0;
    // Walk down both paths simultaneously from the root (index 0)
    while (i < pathA.length && i < pathB.length) {
        if (pathA[i].self === pathB[i].self) {
            lca = pathA[i]; // Keep track of the latest shared ancestor
            i++;
        } else 
            break; // The paths have diverged! Stop searching.
    }
    return lca;
}
// Helper 2 for isFactorizable
function checkParentOpToLCA(path: Crumb[], lca: SExpression):boolean{
    if (path.length === 0) return false;
    if ( !['+','-','*'].includes(path.at(-1)!.parent.value)) return false;
    let i = path.length-2;
    while (i> 0 && path[i].self !== lca  ){
        let selfNode = path[i].self; let parentNode = path[i].parent;
        if (selfNode.value === '*' && !['-','+'].includes(parentNode.value) )
            return false;
        else if (selfNode.value === '-' && !['+'].includes(parentNode.value) )
            return false;

        i--;
    }

    return true;
}
// Helper for debugging
function printPath(path: Crumb[]){
    let res = path.map( (c) => c.self.value )
    console.log("Path:", res.join(' ') )
}

// Round a number to integer if very close
function snapToInteger(num: number, tol: number = 1e-8): number {
    const nearestInt = Math.round(num);
    // Check if the absolute distance is smaller than the tolerance
    if (Math.abs(num - nearestInt) < tol) {
        return nearestInt;
    }
    // Return the original number untouched if it's not close enough
    return num;
}

/** (by Gemini)
 * Converts a floating-point decimal into its exact fractional representation
 * using the highly efficient Continued Fractions (Euclidean-based) algorithm.
 * * param decimal The target number (e.g., 1.33333333)
 * param tolerance The threshold for acceptable accuracy (default 1e-8)
 */
function convertToFraction(decimal: number, tolerance: number = 1e-8): [number, number] {
    // Handle whole integers immediately
    if (Math.abs(decimal - Math.round(decimal)) < tolerance) {
        return [ Math.round(decimal), 1 ];
    }
    let x = decimal;
    // Setup state variables for tracking the convergent boundaries
    let n1 = 1, d1 = 0; // Previous convergent numerator & denominator
    let n2 = 0, d2 = 1; // Second previous convergent numerator & denominator
    while (true) {
        // Extract the absolute integer part
        const a = Math.floor(x);
        // Compute the new convergent numerator and denominator
        const numerator = a * n1 + n2;
        const denominator = a * d1 + d2;
        // Verify if our current fraction matches the original decimal close enough
        if (Math.abs(decimal - (numerator / denominator)) < tolerance) {
            return [ numerator, denominator ];
        }
        // Shift our historical variables down for the next iteration cycle
        n2 = n1;
        d2 = d1;
        n1 = numerator;
        d1 = denominator;
        // Isolate the fractional remainder and invert it
        const fractionalPart = x - a;
        if (fractionalPart < tolerance) break; // Hard stop on perfect termination
        x = 1 / fractionalPart;
    }
    return [ n1, d1 ];
}
// Trim single factor or single plus term
function simplify(sNode: SExpression): SExpression {
    if (sNode.type === 'Atom') return sNode;

    // 1. Map children to their simplified versions
    sNode.rest = sNode.rest.map(child => simplify(child));
    // 2. Identity Elimination
    if (sNode.value === '+') {
        sNode.rest = sNode.rest.filter(s => !(s.type === 'Atom' && s.value === '0'));
        if (sNode.rest.length === 0) return { type: 'Atom', value: '0' };
    } else if (sNode.value === '*') {
        sNode.rest = sNode.rest.filter(s => !(s.type === 'Atom' && s.value === '1'));
        if (sNode.rest.length === 0) return { type: 'Atom', value: '1' };
    }
    // 3. Singleton Collapsing
    // If this node is a operator with only 1 child left, strip the operator and return the child!
    if (['+', '*'].includes(sNode.value) && sNode.rest.length === 1) {
        //console.log("THIS", formatS(sNode.rest[0]))
        return sNode.rest[0];
    }
    return sNode;
}
function simplifyFocus(zipper: Zipper){
    let currentCrumb = zipper.path.at(-1)!;
    let focusIndex = zipper.path.at(-1)!.leftSiblings.length;
    currentCrumb.parent.rest[focusIndex] =  simplify(zipper.focus);
    zipper.goUp();     // Renew the Crumb to fix siblings list being disordered
    zipper.goDown(focusIndex);
}


function simplifyBranch(zipper: Zipper){
    if (zipper.focus.type==='Atom') return;
    let crumb = zipper.path.at(-1)!;
    let focusIndex = crumb.leftSiblings.length;
    if ( zipper.focus.rest.length === 1 && ['+','*'].includes(zipper.focus.value)){
        crumb.parent.rest[focusIndex] = zipper.focus.rest[0];
    }
    function simplifyHelper(sNode: SExpression, sParent: SExpression, sIndex: number): SExpression {
        if (sNode.type === 'Atom') return sNode;
        if (sParent.type === 'Atom') return sNode;
        // Simplify singleton '+' or '*'
        for (let i=0; i< sNode.rest.length; i++){
            simplifyHelper(sNode.rest[i], sNode, i);
        }
        if (sNode.value === '+'){
            sNode.rest =  sNode.rest.filter( (s) => s.value !== '0' )
            if (sNode.rest.length === 0)
                {sNode.rest.push({type:'Atom', value:'0'}); return sNode;}
        } else if (sNode.value === '*'){
            sNode.rest = sNode.rest.filter( (s) => s.value !== '1' )
            if (sNode.rest.length === 0)
                {sNode.rest.push({type:'Atom', value:'1'}); return sNode;}
        }
        if (['+','*'].includes(sNode.value) && sNode.rest.length === 1){
            sParent.rest[sIndex] = sNode.rest[0];
        }

        return sNode;
    }

    zipper.goUp();
    zipper.goDown(focusIndex);
}

function isVariable(val: string): boolean{
    return /[A-Za-z]/.test(val) && val.length === 1;
}
function getVar(factor:SExpression){
    if (factor.type==='Atom') return factor.value;
    return factor.rest[0].value;
}

// For solving quadratic equation  (x-A)*(x-B) = 0
function getFactoredQuadratic(sNode: SExpression):[SExpression,SExpression]|null{
    if (sNode.type==='Atom') return null;
    if (sNode.rest[0].type==='Atom') return null;
    if (sNode.rest[0].value !== '*' || sNode.rest[1].value !== '0') return null;
    if (sNode.rest[0].rest.length !== 2) return null;
    let factorA = sNode.rest[0].rest[0];
    let factorB = sNode.rest[0].rest[1];

    function isVarPlusNumLit(factor:SExpression){
        if (factor.type==='Atom') return false;
        if (factor.value !== '+') return false;
        if (factor.rest.length !== 2) return false;
        if (!isVariable(factor.rest[0].value) ) return false;
        if ( !isNumLiteral(factor.rest[1]) ) return false;
        return true;
    }
    if ( getVar(factorA) !== getVar(factorB) ) return null;
    if (factorA.type === 'Atom'){
        return isVarPlusNumLit(factorB)? [factorA, factorB]: null;
    };
    if (factorB.type === 'Atom'){
        return isVarPlusNumLit(factorA)? [factorA, factorB]: null;
    };
    if (!isVarPlusNumLit(factorA) || !isVarPlusNumLit(factorB) ) return null;
    if (factorA.rest[0].value !== factorB.rest[0].value ) return null;
    return [factorA, factorB];
}


            // let child = sNode.rest[i];
            // if (child.type==='Atom') continue;
            // if (child.rest.length === 1 && ['+','*'].includes(child.value)){
            //     sNode.rest[i] = child.rest[0];
            // }
        
        
        

        // Default: Return the operator with its simplified children intact

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
import { type SExpression  } from "./parser";
import { getInfixBP, getPrefixBP, getPostfixBP, PREFIX_BINDING_POWERS } from "./binding-powers";
import { displayNum } from "./cursor";

export function displayS(sNode: SExpression): string {
    // SExpression -> [Sstring, op, 'pre'|'in'|'post']
    function displayHelper(sNode: SExpression): [string, string | null, ('pre'|'in'|'post') | null] { 
        if ( sNode.type === 'Atom' || sNode.rest.length === 0){
            // Only display 4 decimal places of a float
            if (/\./.test(sNode.value) ){
                return [displayNum(sNode.value), null, null];
            }
            return [sNode.value, null, null];
        }
        const op = sNode.value;
        if (sNode.rest.length > 1){   // More than one child means infix operator
            const parentBP = getInfixBP(op);
            // SPECIAL LATEX EXPONENT HANDLING
            if (op === '^') {
                // Evaluate the base (left child)
                let [baseStr, lOp, lFix] = displayHelper(sNode.rest[0])
                // Evaluate the exponent tower (right child)
                let [expStr, rOp, rFix] = displayHelper(sNode.rest[1])
                // If the base itself is an infix operator (like a + b), it needs brackets: (a + b)^c
                let lBp =  (lFix === 'in' ? getInfixBP(lOp!) : null)
                if (lFix === 'in' && lBp !== null && lBp[0]! <= parentBP![0]!)
                    baseStr = `(${baseStr})`
                // Exponent side NEVER needs literal parentheses because the LaTeX braces {} 
                // create the visual grouping boundary automatically!
                return [`${baseStr}^{${expStr}}`, op, 'in']
            }
            // STANDARD INFIX HANDLING (For +, *, etc.)
            let childStrings = sNode.rest.map( (s) => { 
                let [sString, childOp, childFix] = displayHelper(s);
                // Fallback wrap in brackets in case of some unknown op
                if (parentBP === null) { return '(' + sString + ')'; }
                // Atoms don't need brackets
                if (childOp === null) return sString; 
                // If child is prefix with larger BP then no brackets around it
                // eg. (+ a (* b c))  => a + b*c ;  (+ a (- b))  => a + -b 
                if ( childFix === 'pre' && getPrefixBP(childOp)! > parentBP[0]
                  || childFix === 'post' && getPostfixBP(childOp)! > parentBP[0]){
                     return sString; 
                }
                const childBP = getInfixBP(childOp);
                if (childBP === null) { 
                    return '(' + sString + ')'; }
                // Only add brackets when child binding power is weaker than parent 
                if ( childBP[0] > parentBP[0] ){
                    return sString; }
                return '(' + sString + ')';
            } );
            // Merge any A * inv B into A/B using a stack method
            if (op === '*'){
                let stack: string[] = [];
                for (let cStr of childStrings){
                    if (stack.length === 0 || cStr.slice(0,3) !== 'inv' ){
                        stack.push(cStr);
                    }else{
                        let numeratorStr =  stack.pop();
                        // Strip numerator outermost PAREN
                        if (numeratorStr!.at(0) === '(' && numeratorStr!.at(-1) === ')'){
                            numeratorStr = numeratorStr!.slice(1,-1);
                        }
                        stack.push( `\\frac{${numeratorStr}}{${cStr.slice(4,-1)}}` );
                    }
                }  // Also convert first string to fraction
                if (stack[0].length >= 3 && stack[0].slice(0,3) === 'inv' ){
                    stack[0] = `\\frac{1}{${stack[0].slice(4,-1)}}`
                }
                childStrings = stack;
            } 
            else if (op === '=' || op === '+'){
                childStrings = childStrings.map( (cStr) => {
                    if (cStr.length >= 3 && cStr.slice(0,3) === 'inv' )
                        cStr = `\\frac{1}{${cStr.slice(4,-1)}}`
                    return cStr;
                })
            }
            return [ childStrings.join(op), op, 'in'];
        }
        // Unary operator
        let [sString, cOp, cFix] = displayHelper(sNode.rest[0]);
        if (op === '-'){
            if (cOp === null) return ['-' + sString, op, 'pre'];
            if (cFix === 'in'){
                let cBp = getInfixBP(cOp);
                if (cBp === null) return [`-(${sString})`, op, 'pre'];
                if (cBp[0] > getInfixBP('-')![0])  return ['-' + sString, op, 'pre'];
                return [`-(${sString})`, op, 'pre'];
            }
            return ['-' + sString, op, 'pre'];
        }
        else if (op === '√' ){
            return [ `\\sqrt{${sString}}`, op, 'pre']; }
        else if (op === 'inv' ){  //  a^(-1)
            return [ `inv(${sString})`, op, 'pre']; }
        else if (op === '!' ){  //  a^(-1)
            return [ `${sString}!`, op, 'post']; }
        // Other Prefix functions
        return [ `${op}(${sString})`, op, 'pre'];
    }     
    let [result, _1, _2] = displayHelper(sNode);
    result = result.replaceAll('+-', '-');
    console.log("display:", result)
    return '$$' + result + '$$';
}
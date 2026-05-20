import { type SExpression  } from "./parser";
import { getInfixBP, getPrefixBP, getPostfixBP, PREFIX_BINDING_POWERS } from "./binding-powers";

export function displayS(sNode: SExpression): string {
    // SExpression -> [Sstring, op, 'pre'|'in'|'post']
    function displayHelper(sNode: SExpression): [string, string | null, ('pre'|'in'|'post') | null] { 
        if ( sNode.type === 'Atom' || sNode.rest.length === 0){
            return [sNode.value, null, null];
        }
        const op = sNode.value;
        if (sNode.rest.length > 1){   // More than one child means infix operator
            const parentBP = getInfixBP(op);
            const result = sNode.rest.map( (s) => { 
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
            } ).join(op);
            return [ result, op, 'in'];
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
            return [ `\\frac{1}{${sString}}`, op, 'pre']; }
        else if (op === '!' ){  //  a^(-1)
            return [ `${sString}!`, op, 'post']; }
        // Other Prefix functions
        return [ `${op}(${sString})`, op, 'pre'];
    }     
    let [result, _1, _2] = displayHelper(sNode);
    result = result.replaceAll('+-', '-');
    console.log("res:", result)
    return '$$' + result + '$$';
}
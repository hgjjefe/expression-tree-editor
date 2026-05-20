import { type SExpression  } from "./parser";
import { getInfixBP, getPrefixBP, getPostfixBP, PREFIX_BINDING_POWERS } from "./binding-powers";

export function displayS(sNode: SExpression): string {
    function displayHelper(sNode: SExpression): [String, string | null] { // [Sstring, op]
        if ( sNode.type === 'Atom' || sNode.rest.length === 0){
            return [sNode.value, null];
        }
        const op = sNode.value;
        if (sNode.rest.length > 1){   // More than one child means infix operator
            const parentBP = getInfixBP(op);
            const result = sNode.rest.map( (s) => { 
                let [sString, childOp] = displayHelper(s);
                // Fallback wrap in brackets in case of some unknown op
                if (parentBP === null) { return '(' + sString + ')'; }
                // Atoms don't need brackets
                if (childOp === null) return sString; 
                // If child is prefix with larger BP then no brackets around it
                // eg. (+ a (* b c))  => a + b*c ;  (+ a (- b))  => a + -b 
                if ( childOp in PREFIX_BINDING_POWERS && getPrefixBP(childOp)! > parentBP[0]){
                     return sString; 
                }
                const childBP = getInfixBP(childOp);
                if (childBP === null) { 
                    return '(' + sString + ')'; }
                // Only add brackets when child binding power is weaker than parent 
                if ( childBP > parentBP ){
                    return sString;
                }
                return '(' + sString + ')';
            } ).join(op);
            return [ result, op];
        }
        // Unary operator
        let [sString, _] = displayHelper(sNode.rest[0]);
        if (op === '-' && sNode.rest[0].type === 'Atom'){ // Don't add brackets for -Atom
            return [ op + sString, op]; } 
        else if (op === '√' ){
            return [ `\\sqrt{${sString}}`, op]; }
        else if (op === 'inv' ){  //  a^(-1)
            return [ `\\frac{1}{${sString}}`, op]; }
        // Other Prefix functions
        return [ `${op}(${sString})`, op];
    }     
    let [result, _] = displayHelper(sNode);
    result = result.replaceAll('+-', '-');
    console.log("res:", result)
    return '$$' + result + '$$';
}
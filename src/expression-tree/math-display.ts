import { type SExpression  } from "./parser";
import { getInfixBP, getPrefixBP, getPostfixBP } from "./binding-powers";

export function displayS(sNode: SExpression): string {
    function displayHelper(sNode: SExpression): [String, string | null] { // [Sstring, op]
        if ( sNode.type === 'Atom'){
            return [sNode.value, null];
        }
        const op = sNode.value;
        const result = sNode.rest.map( (s) => { 
            let [sString, childOp] = displayHelper(s);
            if (childOp === null) return sString;
            if ( getInfixBP(childOp) > getInfixBP(op) ){
                return sString;
            }
            return '(' + sString + ')';
        } ).join(op);
        return [ result, op];
        }
    const [result, _] = displayHelper(sNode);
    return '$$' + result + '$$';
}
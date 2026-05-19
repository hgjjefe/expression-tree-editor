import { type SExpression  } from "./parser";

export function displayS(sNode: SExpression): string {
    function displayHelper(sNode: SExpression): String {
        if ( sNode.type === 'Atom'){
            return sNode.value;
        }
        const op = sNode.value;
        return sNode.rest.map( s => displayHelper(s)  ).join(op);
        }
    return '$$' + displayHelper(sNode) + '$$';
}
interface InfixBP { left: number; right: number; }
interface PrefixBP  { right: number; }
interface PostfixBP { left: number; }
// type BindingPower = InfixBP | PrefixBP | PostfixBP;

// Dictionary for infix binding powers
const INFIX_BINDING_POWERS: Record<string, InfixBP> = {
    '+': { left: 1, right: 2 },
    '-': { left: 1, right: 2 },
    '*': { left: 3, right: 4 },
    '/': { left: 3, right: 4 },
    '^': { left: 10, right: 9 },
    '.': { left: 11, right: 12 },
}

const PREFIX_BINDING_POWERS: Record<string, PrefixBP> = {
    '~': { right: 5 },
}

const POSTFIX_BINDING_POWERS: Record<string, PostfixBP> = {
    '!': { left: 7 }
}

export const getInfixBP = (op: string): InfixBP | null => {
    return (op in INFIX_BINDING_POWERS) ? INFIX_BINDING_POWERS[op as keyof typeof INFIX_BINDING_POWERS] : null;
}
export const getPrefixBP = (op: string): PrefixBP | null => {
    return (op in PREFIX_BINDING_POWERS) ? PREFIX_BINDING_POWERS[op as keyof typeof PREFIX_BINDING_POWERS] : null;
}
export const getPostfixBP = (op: string): PostfixBP | null => {
    return (op in POSTFIX_BINDING_POWERS) ? POSTFIX_BINDING_POWERS[op as keyof typeof POSTFIX_BINDING_POWERS] : null;
}
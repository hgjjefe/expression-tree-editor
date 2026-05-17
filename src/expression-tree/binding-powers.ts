
// Dictionary for infix binding powers
const INFIX_BINDING_POWERS: Record<string, [number, number]> = {
    '=': [2, 1],
    '+': [5, 6],
    '-': [5, 6],
    '*': [7, 8],
    '/': [7, 8],
    '^': [12,11],
    '.': [15,16],
}

const PREFIX_BINDING_POWERS: Record<string, number> = {
    '+': 9,
    '-': 9,
}

const POSTFIX_BINDING_POWERS: Record<string, number> = {
    '!': 11
}

export const getInfixBP = (op: string): [number, number] | null => {
    return (op in INFIX_BINDING_POWERS) ? INFIX_BINDING_POWERS[op as keyof typeof INFIX_BINDING_POWERS] : null;
}
export const getPrefixBP = (op: string): number | null => {
    return (op in PREFIX_BINDING_POWERS) ? PREFIX_BINDING_POWERS[op as keyof typeof PREFIX_BINDING_POWERS] : null;
}
export const getPostfixBP = (op: string): number | null => {
    return (op in POSTFIX_BINDING_POWERS) ? POSTFIX_BINDING_POWERS[op as keyof typeof POSTFIX_BINDING_POWERS] : null;
}
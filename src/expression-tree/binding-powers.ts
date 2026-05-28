// Dictionary for infix binding powers
const INFIX_BINDING_POWERS: Record<string, [number, number]> = {
    '=': [2, 1],
    '∨': [3, 4],
    '+': [5, 6],
    '-': [5, 6],
    '*': [7, 8],
    '/': [7, 8],
    '^': [14,13],
    '.': [15,16],
}

export const PREFIX_BINDING_POWERS: Record<string, number> = {
    '+': 5,
    '-': 9,
    '√': 11,
    'inv': 13
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
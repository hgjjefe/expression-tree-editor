import { Node, setCoordinates, drawTree, constructTree } from './tree'
import { convertSToTree, renderPipeline } from './tree-nary';
import { infixToPostfix } from './infixToPostfix';
import Swal from 'sweetalert2';
import { parseExpression, formatS, type SExpression  } from './parser'
import { Lexer } from './lexer';
import { displayS } from './math-display';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const expressionInput = document.getElementById('expression-input') as HTMLInputElement;
const mathDisplay = document.getElementById('math-display');

// Button functions
function generateNaryTree(){
    let expression = expressionInput.value
    if (typeof expression !== 'undefined' && null != expression) {
        try {
            let s_expr = generateS(expression);
            printS(s_expr);
            renderPipeline(expression, ctx);
        } catch (error) {
            if (error instanceof SyntaxError){
                const errorMessage: string = error.message;
                displayErrorMessageNary(errorMessage);
                console.log(error)
            } else{
                displayErrorMessageNary();
            }

        }
    }
}
function randomizeExpression(){
    expressionInput.value = SAMPLE_EXPRESSIONS2[Math.floor(Math.random() * SAMPLE_EXPRESSIONS2.length)]
    generateNaryTree()
}

function canonicalizeTree(){
    let expression = expressionInput.value
    if (typeof expression !== 'undefined' && null != expression) {
        try {
            let s_expr = generateS(expression);
            printS(s_expr);
            s_expr =  renderPipeline(expression, ctx, true);
            console.log('s_expr', s_expr)
            mathDisplay!.textContent = displayS(s_expr);
            if ((window as any).MathJax) {
                (window as any).MathJax.typesetPromise([mathDisplay])
                    .catch((err: any) => console.log('MathJax typeset failed: ', err));
            }
        } catch (error) {
            if (error instanceof SyntaxError){
                const errorMessage: string = error.message;
                displayErrorMessageNary(errorMessage);
                console.log(error)
            } else{
                displayErrorMessageNary();
            }
        }
    }
}

const SAMPLE_EXPRESSIONS = [
    '(a + b)*c - (x - y)/z',
    '(a * b) - c + z / x',
    'x - y + (c / (a + b))',
    '(a / y) + b - (c * x)',
    '(a - b) * (c + d) / z',
    '(a * b) - (x / y)'
]

const SAMPLE_EXPRESSIONS2 = [
    "a + b * c * d + e",
    "f . g . h",
    " 1 + 2 + f . g . h * 3 * 4",
    "--1 * 2",
    "(((0)))",
    "x[0][1]"
]

function clearCanvas() { 
    ctx.clearRect(0, 0, canvas.width, canvas.height) }

function init() {

    
    if (!canvas) {
        console.error("Could not find the canvas element in the DOM!");
        return;
    }
    if (!ctx){
        console.error("Canvas Context is missing!");
        return
    }
    let currentRoot : Node | null = null;


    function render() {
        // 1. Resize the canvas to match its HTML container layout
        const container = document.getElementById('canvas-container');
        if (!container){
            console.log("Container is missing!");
            return;
        }
        canvas.height = container.offsetHeight;
        canvas.width = container.offsetWidth;
        clearCanvas();
        if (currentRoot) {
            setCoordinates(currentRoot);
            drawTree(currentRoot, ctx);
        }
    }
    document.getElementById('generate-tree')!.addEventListener('click', () => {
        let expression = expressionInput.value
        if (typeof expression !== 'undefined' && null != expression) {
            try {
                let s_expr = generateS(expression);
                printS(s_expr);
                let tree = convertSToTree(s_expr);
            } catch (e) {
                console.log(e)
            }
            
            expression = expression.replace(/\s+/g, '')
            expression = expression.toLowerCase()
            let postfix = infixToPostfix(expression);
            if (null !== postfix) {
                try {
                    currentRoot = constructTree(postfix) as Node
                    setCoordinates(currentRoot)
                    clearCanvas()
                    canvas.height = document.getElementById('canvas-container')!.offsetHeight;
                    canvas.width = document.getElementById('canvas-container')!.offsetWidth;
                    drawTree(currentRoot, ctx)
                } catch (e) {
                    displayErrorMessage()
                }
            } else {
                displayErrorMessage()
            }

        } else {
            displayErrorMessage()
        }
    })
    document.getElementById('generate-nary-tree')!.addEventListener('click', generateNaryTree);

    document.getElementById('clear-tree')!.addEventListener('click', () => {
        expressionInput.value = ''
        clearCanvas()
    })
    document.getElementById('randomize')!.addEventListener('click', randomizeExpression);
    document.getElementById('canonicalize')!.addEventListener('click', canonicalizeTree);
    window.addEventListener('resize', render);

    expressionInput.value = SAMPLE_EXPRESSIONS[Math.floor(Math.random() * SAMPLE_EXPRESSIONS.length)]
    expressionInput.value = 'a+(b+c+d)'
    setTimeout(() => {
        document.getElementById('generate-tree')!.click()
    }, 500)
};
init();


function generateS(input: string){
    let lexer = new Lexer(input);
    return parseExpression(lexer, 0);
}
function printS(s: SExpression){
    console.log("S:", formatS(s));
}


function displayErrorMessage() {
    Swal.fire({
        icon: 'error',
        title: 'Invalid expression',
        html: `
            <div style="font-size:1.1em;text-align: left;margin:0px 0px 0px 60px;">
                - You may only use these brackets ( ). <br/>
                - Use * for multiplication and / for division. <br/>
                - Valid operators and operands are:<br/>
                <div style="margin-left: 10px;">
                    <i>Operators</i>: <b>[+ - * / ]</b><br/>
                    <i>Operands</i>: Any alphabetic letter.
                </div>
            </div>
        `,
        footer: '<a href="https://github.com/lnogueir/expression-tree-gen">Learn more</a>'
    })
}

function displayErrorMessageNary(message: string | undefined = undefined ) {
    if (message === undefined){
        message = 
            `You have some syntax error but I won\'t tell you why. <br/>
            - Good luck trying to figure it out. <br/>`
    }
    Swal.fire({
        icon: 'error',
        title: 'Syntax Error!',
        html: `
            <div style="font-size:1.1em;text-align: left;margin:0px 0px 0px 60px;">
                - ${message} <br/>
                - Valid operators and operands are:<br/>
                <div style="margin-left: 10px;">
                    <i>Operators</i>: <b>[+ - * / ^ ! . =]</b><br/>
                    <i>Operands</i>: Any alphanumeric single letter.
                </div>
            </div>
        `,
        footer: '<a href="https://github.com/lnogueir/expression-tree-gen">Learn more</a>'
    })
}

import { generateTreeOld } from './old/utils';
import Swal from 'sweetalert2';

import { convertSToTree, calculateTreeLayout, canonicalize, TreeNode, drawTree } from './tree-nary';
import { parseExpression, formatS, type SExpression  } from './parser'
import { Lexer } from './lexer';
import { displayS } from './math-display';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const expressionInput = document.getElementById('expression-input') as HTMLInputElement;
const mathDisplay = document.getElementById('math-display');



function clearCanvas() { 
    ctx.clearRect(0, 0, canvas.width, canvas.height) }

        
function renderPipeline(rawInput: string, ctx: CanvasRenderingContext2D, isCanonicalize: boolean = false) {
  // Clear the canvas window for a fresh frame
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // 1. Parse the string into an SExpression-Expression Tree
  let sExpression = parseExpression(new Lexer(rawInput), 0);
  if (isCanonicalize){
    sExpression = canonicalize(sExpression);
  }
  // 2. Convert pure data nodes into drawable layout nodes
  const visualRoot = convertSToTree(sExpression);
  // 3. Mutate the visual tree to append all x and y positions
  calculateTreeLayout(visualRoot, ctx.canvas.width, 60);
  // 4. Fire the paint loops onto the canvas context
  drawTree(ctx, visualRoot);
  return sExpression;
}


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
                displayErrorMessage(errorMessage);
                console.log(error)
            } else{
                displayErrorMessage();
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
                displayErrorMessage(errorMessage);
                console.log(error)
            } else{
                displayErrorMessage();
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
    "x^y^(z*a+d)"
]

function init() {

    if (!canvas) {
        console.error("Could not find the canvas element in the DOM!");
        return;
    }
    if (!ctx){
        console.error("Canvas Context is missing!");
        return
    }
    let currentVisualRoot : TreeNode | null = null;

   function render() {
        const container = document.getElementById('canvas-container');
        if (!container) return;
        canvas.height = container.offsetHeight;
        canvas.width = container.offsetWidth;
        generateTreeOld(ctx, expressionInput.value);
    }
    // GENERATE TREE (OLD)
    document.getElementById('generate-tree')!.addEventListener('click', ()=>{ generateTreeOld(ctx, expressionInput.value) })
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


function displayErrorMessage(message: string | undefined = undefined ) {
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

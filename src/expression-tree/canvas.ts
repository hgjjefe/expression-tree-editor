import { generateTreeOld } from './old/utils';
import Swal from 'sweetalert2';

import { convertSToTree, calculateTreeLayout, TreeNode, drawTree } from './tree';
import { parseExpression, formatS, type SExpression, canonicalize  } from './parser'
import { Lexer } from './lexer';
import { displayS } from './math-display';
import { Zipper } from './zipper';
import { selectNode } from './cursor';
import { exp } from 'mathjs';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const expressionInput = document.getElementById('expression-input') as HTMLInputElement;
const mathDisplay = document.getElementById('math-display');
let activeMode : 'old' | 'nary' = 'old';
let currentSExpression : SExpression | null;
let currentRoot: TreeNode | null;   // Current Visual Tree root
let currentZipper: Zipper | null = null;

function clearCanvas() { 
    ctx.clearRect(0, 0, canvas.width, canvas.height) }

function render() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    canvas.height = container.offsetHeight;
    canvas.width = container.offsetWidth;
    clearCanvas()
    if ( activeMode === 'old' ){
        generateTreeOld(ctx, expressionInput.value);
    } else if (activeMode === 'nary' && currentRoot) {
        calculateTreeLayout(currentRoot, canvas.width, 60);
        drawTree(ctx, currentRoot);
    }
}

// Make tree from new SExpression. Meant to offload the work of generateTree()
function updateTree(newZipper = false){
    if (currentZipper === null || newZipper)
        currentZipper = new Zipper(currentSExpression!);
    currentRoot = convertSToTree(currentSExpression!, currentZipper);
    mathDisplay!.textContent = displayS(currentSExpression!);
                if ((window as any).MathJax) {
                    (window as any).MathJax.typesetPromise([mathDisplay])
                        .catch((err: any) => console.log('MathJax typeset failed: ', err));
                } 
    render();
}

// Button functions
function generateTree(isCanonicalize = false){
    activeMode = 'nary';
    let expression = expressionInput.value
    if (typeof expression !== 'undefined' && null != expression) {
        try {
            currentSExpression = parseExpression(new Lexer(expression), 0);
            // Canonicalize and update mathDisplay
            if (isCanonicalize){
                currentSExpression = canonicalize(currentSExpression!);
                printS(currentSExpression!); 
            }
            updateTree(true);
            
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
    expressionInput.value = SAMPLE_EXPRESSIONS[Math.floor(Math.random() * SAMPLE_EXPRESSIONS.length)]
    generateTree()
}

const SAMPLE_EXPRESSIONS = [
    '(a + b)*c - (x - y)/z',
    '(a * b) - c + z / x',
    'x - y + (c / (a + b))',
    '(a / y) + b - (c * x)',
    '(a - b) * (c + d) / z',
    '(a * b) - (x / y)',
    "a + b * c * d + e",
    "f ^ g * h",
    " 1 + 2 + f ^ (g * h) * 3 * 4",
    "--1 * 2",
    "(a+b)^c+(e+f)/g",
    "x^y^(z*a+d)"
]

function init() {

    if (!canvas) {
        console.error("Could not find the canvas element in the DOM!");
        return; }
    if (!ctx){
        console.error("Canvas Context is missing!");
        return; }
   
    // GENERATE TREE (OLD)
    document.getElementById('generate-tree-old')!.addEventListener('click', ()=>{ activeMode = 'old'; generateTreeOld(ctx, expressionInput.value) })
    document.getElementById('generate-tree')!.addEventListener('click', ()=> { generateTree(false) });
    document.getElementById('clear-tree')!.addEventListener('click', () => {
        expressionInput.value = ''
        clearCanvas() })
    document.getElementById('randomize')!.addEventListener('click', randomizeExpression);
    document.getElementById('canonicalize')!.addEventListener('click', ()=> { generateTree(true) });
    window.addEventListener('resize', render);
    
    expressionInput.value = SAMPLE_EXPRESSIONS[Math.floor(Math.random() * SAMPLE_EXPRESSIONS.length)]
    expressionInput.value = 'a+(b+c+d)=t'
    setTimeout(() => {
        document.getElementById('generate-tree')!.click();
        // Add keyboard key detection for cursor control
        if (currentRoot !== null){
            window.addEventListener('keydown', (event)=> {
                if (currentZipper === null) return;
                const target = event.target as HTMLElement;
                if (    target.tagName === "INPUT" || 
                        target.tagName === "TEXTAREA" || 
                        target.isContentEditable
                    ) { return; }
                switch (event.key){
                    case "ArrowDown":
                        event.preventDefault();
                        currentZipper.goDown(0); break;
                    case "ArrowUp":
                        event.preventDefault();
                        currentZipper.goUp(); break;
                    case "ArrowLeft":
                        event.preventDefault();
                        currentZipper.goLeft(); break;
                    case "ArrowRight":
                        event.preventDefault();
                        currentZipper.goRight(); break;
                }
                switch (event.code){
                    case "Space":   // Select a node
                        event.preventDefault();
                        selectNode(currentZipper);  break;
                }
                updateTree(false);
            })
        }
    }, 500)
};
init();

function printS(s: SExpression){
    console.log("S:", formatS(s));
}


function displayErrorMessage(message: string | undefined = undefined ) {
    let errorTitle = 'Syntax Error!'
    if (message === undefined){
        message = 
            `A fatal error occurred. <br/>
            - Good luck trying to figure it out. <br/>`
        errorTitle = 'Fatal Error!'
    }
    Swal.fire({
        icon: 'error',
        title: errorTitle,
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

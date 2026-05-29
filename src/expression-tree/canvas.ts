import { generateTreeOld } from './old/utils';
import Swal from 'sweetalert2';

import { convertSToTree, calculateTreeLayout, TreeNode, drawTree } from './tree';
import { parseExpression, formatS, type SExpression, canonicalize, grammarCheck  } from './parser'
import { Lexer } from './lexer';
import { displayS } from './math-display';
import { Zipper } from './zipper';
import { isNumLiteral, selectNode, simplifyTree, swap } from './cursor';
import { EQUATION_LEVELS } from './levels';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const expressionInput = document.getElementById('expression-input') as HTMLInputElement;
const mathDisplay = document.getElementById('math-display');
const levelSelect = document.getElementById('level-select') as HTMLSelectElement;
let activeMode : 'old' | 'nary' = 'nary';
let currentSExpression : SExpression | null;
let currentRoot: TreeNode | null;   // Current Visual Tree root
let currentZipper: Zipper | null = null;
let isWonLevel: boolean = false;
let currentLevel: number = 0;

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
function updateTree(isCanonicalize = false, newZipper = false, isDisplay = true){
    // Canonicalize and update mathDisplay
    if (isCanonicalize){
        currentSExpression = canonicalize(currentSExpression!);
        printS(currentSExpression!); 
        grammarCheck(currentSExpression!);
        isWonLevel = false;
    }

    if (currentZipper === null || newZipper)
        currentZipper = new Zipper(currentSExpression!);
    currentRoot = convertSToTree(currentSExpression!, currentZipper);
    if (isDisplay){
        mathDisplay!.textContent = displayS(currentSExpression!);
                if ((window as any).MathJax) {
                    (window as any).MathJax.typesetPromise([mathDisplay])
                        .catch((err: any) => console.log('MathJax typeset failed: ', err));
                } 
    }

    // Check level win (only once)
    if (!isWonLevel && checkLevelWin()){
        displayWinMessage();
        isWonLevel = true;
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
            updateTree(isCanonicalize, true);
            
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
    window.addEventListener('keydown', (e)=> { 
    if (e.code==='KeyR'){
        const target = e.target as HTMLElement;
        if ( target.tagName === "INPUT" || target.tagName === "TEXTAREA" ||target.isContentEditable) { return; }
        e.preventDefault();  document.getElementById('canonicalize')!.click();
    } else if (e.code === 'KeyE'){  // Swap both sides of equation
        if (currentZipper === null || currentZipper.root.type==='Atom') return;
        swap(currentZipper.root.rest, 0, 1);
        updateTree(false, true);
    } else if (e.code === 'KeyL'){  // Go to next level
        if (currentLevel === EQUATION_LEVELS.length - 3) return;
        isWonLevel = false;
        currentLevel += 1;
        expressionInput.value = EQUATION_LEVELS.at(currentLevel)!;
        document.getElementById('canonicalize')!.click();
        levelSelect.value = currentLevel.toString();
    }else if (e.code === 'KeyK'){  // Go to next level
        if (currentLevel === 1) return;
        isWonLevel = false;
        currentLevel -= 1;
        expressionInput.value = EQUATION_LEVELS.at(currentLevel)!;
        document.getElementById('canonicalize')!.click();
        levelSelect.value = currentLevel.toString();
    }

} );
    
    expressionInput.value = SAMPLE_EXPRESSIONS[Math.floor(Math.random() * SAMPLE_EXPRESSIONS.length)]
    expressionInput.value = "(a - b) * (c + d) / z=t";
    expressionInput.value = " 5+c*(a*b)+2 - (a*b) - 3 = 5"
    setTimeout(() => {
        document.getElementById('canonicalize')!.click();
        // Add keyboard key detection for cursor control
        if (currentRoot !== null){
            window.addEventListener('keydown', (event)=> {
                if (currentZipper === null) return;
                const target = event.target as HTMLElement;
                if (    target.tagName === "INPUT" || 
                        target.tagName === "TEXTAREA" || 
                        target.isContentEditable
                    ) { return; }
                if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyF']
                    .includes( event.code )
                  ) return;
                let isDisplay = true; 
                switch (event.key){
                    case "ArrowDown":
                        event.preventDefault();
                        let midIndex = currentZipper.focus.type === 'Cons' ? Math.floor((currentZipper.focus.rest.length-1) / 2)  : 0
                        currentZipper.goDown(midIndex); isDisplay=false; break;
                    case "ArrowUp":
                        event.preventDefault();
                        currentZipper.goUp(); isDisplay=false; break;
                    case "ArrowLeft":
                        event.preventDefault();
                        currentZipper.goLeft(); isDisplay=false; break;
                    case "ArrowRight":
                        event.preventDefault();
                        currentZipper.goRight(); isDisplay=false; break;
                }
                let isNewZipper = false;
                switch (event.code){
                    case "Space":   // Select a node
                        event.preventDefault();
                        if (currentZipper.selected === null) isDisplay = false;
                        isNewZipper =  selectNode(currentZipper, 'plus');  break;
                    case "KeyF":   // Select a node
                        event.preventDefault();
                        isNewZipper =  selectNode(currentZipper, 'mult');  break;
                }
                if (isNewZipper)
                    currentSExpression = simplifyTree(currentSExpression!);
                updateTree(false, isNewZipper, isDisplay);
            })
        }
    }, 500);
    /* ====== LEVEL SELECTION ====== */
    levelSelect.addEventListener('change', (event) => {
        const selectedLevel = (event.target as HTMLSelectElement).value;
        if (selectedLevel === "") {
            return; 
        }
        let intLevel = parseInt(selectedLevel);
        currentLevel = intLevel;
        console.log(`Switching to: ${selectedLevel}`);
        isWonLevel = false;
        expressionInput.value = EQUATION_LEVELS.at(currentLevel)!;
        document.getElementById('canonicalize')!.click();
    });
    for (let i=1;i<EQUATION_LEVELS.length-2;i++){
        const option = document.createElement('option');
        option.value = i.toString();
        option.textContent = `Level ${i}`;
        levelSelect.appendChild(option);
    }
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

function checkLevelWin(): boolean{  // Only win if equation is in the form " x = Num "
    if (currentSExpression === null || currentSExpression.value !== '=' 
        || currentSExpression.type === 'Atom') return false;
    let lhs = currentSExpression.rest[0]; let rhs = currentSExpression.rest[1];
    if (lhs.type !== 'Atom' || !/^[a-zA-Z]$/.test(lhs.value) ) return false;
    if ( rhs.value === '∨' ){
        if (rhs.type==='Atom')return false;
        return  isNumLiteral(rhs.rest[0]) && isNumLiteral(rhs.rest[1])
    }
    if ( !isNumLiteral(rhs)) return false;
    return true;
}

function displayWinMessage(){
    Swal.fire({
        icon: 'success',
        title: 'You win the level!',
        html: `
            <div style="font-size:1.1em;text-align: left;margin:0px 0px 0px 60px;">
                Good work! <br/>`
    })
}




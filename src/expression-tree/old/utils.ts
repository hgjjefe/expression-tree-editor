import Swal from 'sweetalert2';
import { infixToPostfix } from './infixToPostfix';
import { constructTree, Node, setCoordinates, drawTreeOld } from './tree'; 

let currentRoot: Node | null = null;

export const generateTreeOld = (ctx: CanvasRenderingContext2D, expression:string) => {

    if (typeof expression === 'undefined' || expression === null || expression.trim() === '') {
        displayErrorMessage();
        return; }
    expression = expression.replace(/\s+/g, '').toLowerCase()
    let postfix = infixToPostfix(expression);
    if (postfix === null) {
        displayErrorMessage();
        return; }
    try {
        let currentRoot = constructTree(postfix) as Node
        setCoordinates(currentRoot)
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        const container = document.getElementById('canvas-container')!;
        ctx.canvas.height = container.offsetHeight;
        ctx.canvas.width = container.offsetWidth;
        drawTreeOld(currentRoot, ctx)
        return currentRoot;
    } catch (e) {
        displayErrorMessage()
    }
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
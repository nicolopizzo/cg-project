function getXY(canvas, event) { //adjust mouse click to canvas coordinates
    const rect = canvas.getBoundingClientRect()
    const y = event.pageY - rect.top
    const x = event.pageX - rect.left

    return [x, y]
}


function newButton(ctx, info, text) {
    const btn = new Path2D();
    btn.rect(info.x, info.y, info.w, info.h);
    btn.closePath();

    ctx.beginPath()
    ctx.fillStyle = "#769dbf";
    ctx.rect(info.x, info.y, info.w, info.h);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#000000";
    // roundRect(ctx, 10, 10, 100, 50, 10, true);
    const size = Math.min(info.h, info.w)
    ctx.font = `${size / 2}px Georgia`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000000";
    ctx.fillText(text || "U", info.x + (info.w / 2), info.y + (info.h / 2));
    ctx.closePath();

    // ctx.fillStyle = '#769dbf';

    return btn
}

function main() {
    /** @type {HTMLCanvasElement} */
    const canvas = document.getElementById("controls");
    const ctx = canvas.getContext("2d");

    const container = document.getElementById("controls-container")
    let wMult = 1
    let hMult = .25
    if (window.innerWidth <= 1200) {
        wMult = window.innerWidth / 1200
    }
    if (window.innerWidth < window.innerHeight && window.innerWidth <= 720) {
        wMult = .5;
        hMult = 1;
        console.log('ok')
    }

    const maxWidth = container.clientWidth * wMult
    const maxHeight = container.clientHeight * hMult
    console.log(maxWidth)
    canvas.width = maxWidth
    canvas.height = maxHeight
    let w = maxWidth / 4, h = maxHeight / 4;
    const centerX = maxWidth / 2 - w / 2;
    const centerY = maxHeight / 2 - h / 2;

    let x = centerX, y = h / 4;
    const zoomIn = newButton(ctx, {x, y, w, h}, "+")

    x = centerX - 1.2 * w;
    y = centerY;
    const rotateLeft = newButton(ctx, {x, y, w, h}, "⟳")
    x = centerX + 1.2 * w;
    const rotateRight = newButton(ctx, {x, y, w, h}, "⟲")
    y = maxHeight - h * 5 / 4;
    x = centerX;
    const zoomOut = newButton(ctx, {x, y, w, h}, "-")

    x = centerX;
    y = centerY;
    const playBus = newButton(ctx, {x, y, w, h}, "▶")

    /* CONTROL KEYS POSITION */

    function handlePress(event) {
        const [x, y] = getXY(canvas, event)
        if (ctx.isPointInPath(zoomIn, x, y)) {
            console.log("in");
            radius = Math.max(radius - 1, 5)
        }
        if (ctx.isPointInPath(rotateLeft, x, y)) {
            console.log("left")
            u_world = m4.yRotate(u_world, 0.08)
            busTransformation = m4.yRotate(busTransformation, 0.08)
        }
        if (ctx.isPointInPath(rotateRight, x, y)) {
            console.log("right")
            u_world = m4.yRotate(u_world, -0.08)
            busTransformation = m4.yRotate(busTransformation, -0.08)
        }
        if (ctx.isPointInPath(zoomOut, x, y)) {
            console.log("out")
            radius = Math.min(radius + 1, 19)
        }
        if (ctx.isPointInPath(playBus, x, y)) {
            canMoveBus = !canMoveBus
        }
    }


    canvas.addEventListener("mousedown", handlePress)
    canvas.addEventListener("touchend", handlePress)

}

main();
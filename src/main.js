const models = ['palazzo', 'strada', 'strada_casa', 'marciapiedi', 'prato', 'bus', 'piscina', 'cristallo']

let x = 0
let canMove = false
let canMoveBus = false

async function main() {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    const canvas = document.querySelector("#canvas");
    const gl = canvas.getContext("webgl");
    if (!gl) {
        alert("WebGL not supported")
        return;
    }

    // compiles and links the shaders, looks up attribute and uniform locations
    const vs = document.querySelector("#vs").text
    const fs = document.querySelector("#fs").text
    const meshProgramInfo = webglUtils.createProgramInfo(gl, [vs, fs]);


    let Materials = {};
    let Parts = {};

    for (let model of models) {
        const {materials, parts} = await setInScene(model, gl)

        Materials = {...Materials, ...materials}
        Parts = {...Parts, ...parts}
    }


    const cameraTarget = [0, 0, 0];
    // figure out how far away to move the camera so we can likely
    // see the object.
    let radius = 15;

    // Set zNear and dof to something hopefully appropriate
    // for the size of this object.
    const zNear = radius * 0.001;
    const dof = radius * 3;

    function degToRad(deg) {
        return deg * Math.PI / 180;
    }

    let u_world = m4.yRotation(Math.PI)
    u_world = m4.xRotate(u_world, -Math.PI / 8)
    let busTransformation = u_world

    /** @type Element */
    const canvasRef = document.querySelector("#canvas")
    canvasRef.addEventListener("mousedown", (event) => {
        canMove = true;
        x = event.x;
    })

    canvasRef.addEventListener("dblclick", (e) => {
        canMoveBus = !canMoveBus
    })

    canvasRef.addEventListener("mouseup", () => {
        canMove = false
    })

    canvasRef.addEventListener("mousemove", (event) => {
        if (!canMove) {
            return
        }

        const yMove = event.x - x

        u_world = m4.yRotate(u_world, yMove * 0.005)
        busTransformation = m4.yRotate(busTransformation, yMove * 0.005)
        x = event.x
    })
    canvasRef.addEventListener("wheel", (event) => {
        const dy = event.deltaY
        if (dy < 0) {
            radius = Math.max(radius - 1, 5)
        } else {
            radius = Math.min(radius + 1, 19)
        }
        console.log(radius)
    })

    const lightPosition = [10, 10, 15]

    const busVelocity = -0.01

    function render() {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        webglUtils.resizeCanvasToDisplaySize(gl.canvas);

        const fieldOfViewRadians = degToRad(60);
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        let projection = m4.perspective(fieldOfViewRadians, aspect, zNear, dof);

        const up = [0, 1, 0];
        // Compute the camera's matrix using look at.
        const cameraPosition = m4.addVectors(cameraTarget, [0, 0, radius]);
        const camera = m4.lookAt(cameraPosition, cameraTarget, up);


        // Make a view matrix from the camera matrix.
        const view = m4.inverse(camera);

        const sharedUniforms = {
            u_lightDirection: m4.normalize([1, 2, 4]),
            u_view: view,
            u_projection: projection,
            u_viewWorldPosition: cameraPosition,
            u_lightPosition: lightPosition,
        };

        // calls gl.uniform
        for (let model of models) {
            switch (model) {
                case 'bus':
                    // TODO: enable moveBus with double click
                    // if (canMoveBus)
                    busTransformation = m4.yRotate(busTransformation, busVelocity)
                    renderMesh(model, gl, sharedUniforms, meshProgramInfo, Parts, busTransformation)
                    break
                default:
                    renderMesh(model, gl, sharedUniforms, meshProgramInfo, Parts, u_world)
            }
        }

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();

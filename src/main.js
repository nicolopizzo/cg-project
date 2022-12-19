const models = ['palazzo', 'strada', 'strada_casa', 'marciapiedi', 'prato', 'bus', 'piscina', 'foto']

let x = 0
let canMove = false;
let canMoveBus = true;
let colorProgramInfo;
let textureProgramInfo;

let lightPosition = [5, 6, 16]
let lightTarget = [0.8, 1, 1]
let shadowEnabled = false;
let transaprencyEnabled = true;
let radius;
let u_world;
let busTransformation;

const SPACEBAR_KEY = ' ';

async function main() {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    const canvas = document.querySelector("#canvas");
    const gl = canvas.getContext("webgl");
    if (!gl) {
        alert("WebGL not supported")
        return;
    }

    let ext = gl.getExtension('WEBGL_depth_texture');
    if (!ext) {
        alert("DEPTH TEXTURE NOT SUPPORTED")
        return
    }

    // compiles and links the shaders, looks up attribute and uniform locations
    const vs = document.querySelector("#vs").text
    const fs = document.querySelector("#fs").text
    const meshProgramInfo = webglUtils.createProgramInfo(gl, [vs, fs]);


    /* MODELS SETUP */
    let Materials = {};
    let Parts = {};

    for (let model of [...models, 'cristallo']) {
        const {materials, parts} = await setInScene(model, gl)

        Materials = {...Materials, ...materials}
        Parts = {...Parts, ...parts}
    }

    function degToRad(deg) {
        return deg * Math.PI / 180;
    }


    /* CAMERA SETTINGS */
    const cameraTarget = [0, 0, 0];
    radius = 15;
    const zNear = radius * 0.001;
    const dof = radius * 3;
    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, dof);
    const up = [0, 1, 0];
    // Compute the camera's matrix using look at.
    let cameraPosition = m4.addVectors(cameraTarget, [0, 0, radius]);
    let camera = m4.lookAt(cameraPosition, cameraTarget, up);
    // Make a view matrix from the camera matrix.
    let view = m4.inverse(camera);


    /* LIGHT SETTINGS */
    const lightDirection = m4.normalize([-1, 2, 4])

    /* BUS SETTINGS */
    u_world = m4.yRotation(Math.PI)
    u_world = m4.xRotate(u_world, -Math.PI / 8)
    busTransformation = u_world
    const busVelocity = -0.01

    /* SHADOWS */
    const shadow = prepareShadows();

    function prepareShadows() {
        // Obj containing all variables used for shadows
        let shadow = {};

        // Program used to draw from the light perspective
        colorProgramInfo = webglUtils.createProgramInfo(gl, ['color-vertex-shader', 'color-fragment-shader']);

        // Program used to draw from the camera perspective
        textureProgramInfo = webglUtils.createProgramInfo(gl, ['vertex-shader-3d', 'fragment-shader-3d']);

        // Shadow map texture
        shadow.depthTexture = gl.createTexture();
        shadow.depthTextureSize = 4096; // Texture resolution
        gl.bindTexture(gl.TEXTURE_2D, shadow.depthTexture);
        gl.texImage2D(gl.TEXTURE_2D,      // target
            0,                  // mip level
            gl.DEPTH_COMPONENT, // internal format
            shadow.depthTextureSize,   // width
            shadow.depthTextureSize,   // height
            0,                  // border
            gl.DEPTH_COMPONENT, // format
            gl.UNSIGNED_INT,    // type
            null);              // data                   // data
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        shadow.depthFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadow.depthFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,            // target
            gl.DEPTH_ATTACHMENT,       // attachment point
            gl.TEXTURE_2D,             // texture target
            shadow.depthTexture,       // texture
            0);                          // mip level                   // mip level
        // Shadow settings
        shadow.enable = false;
        shadow.fov = 60;
        shadow.projWidth = 2;
        shadow.projHeight = 2;
        shadow.zFarProj = 200;
        shadow.bias = -0.001;
        shadow.showFrustum = false;

        return shadow;
    }


    function bindFrameBufferNull() {
        // draw scene to the canvas projecting the depth texture into the scene
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.46, 0.61, 0.73, 1);
        // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    /* KEY CONTROLS */
    /** @type Element */
    function handleRotate(event) {
        if (!canMove) {
            return
        }
        const yMove = event.x ? event.x - x : event.touches[0].clientX - x;
        u_world = m4.yRotate(u_world, yMove * 0.005)
        busTransformation = m4.yRotate(busTransformation, yMove * 0.005)
        x = event.x || event.touches[0].clientX
    }

    function handleZoom(event) {
        const dy = event.deltaY
        if (dy < 0) {
            radius = Math.max(radius - 1, 5)
            cameraPosition = m4.addVectors(cameraPosition, [0, 0, -1])
        } else {
            radius = Math.min(radius + 1, 19)
            cameraPosition = m4.addVectors(cameraPosition, [0, 0, 1])
        }
        camera = m4.lookAt(cameraPosition, cameraTarget, up);
    }

    function startEvent(event) {
        canMove = true;
        x = event.x;
        if (!event.x) {
            x = event.touches[0].clientX
        }
    }

    function endEvent() {
        canMove = false;
    }

    const canvasRef = document.getElementById("canvas")
    canvasRef.addEventListener("mousedown", startEvent)
    canvasRef.addEventListener("touchstart", startEvent)
    canvasRef.addEventListener("mouseup", endEvent);
    // canvasRef.addEventListener("touchend", endEvent)
    canvasRef.addEventListener("dblclick", (e) => {
        canMoveBus = !canMoveBus

    })

    // canvasRef.addEventListener("")

    function debounce(f) {
        let timer;
        return function (event) {
            if (timer) {
                clearTimeout(timer)
            }
            timer = setTimeout(f, 500, event)
        }
    }

    window.addEventListener("resize", (e) => {
        location.reload();
    })


    canvasRef.addEventListener("mousemove", handleRotate)
    canvasRef.addEventListener("touchmove", handleRotate)
    canvasRef.addEventListener("wheel", handleZoom)
    document.addEventListener("keydown", (event) => {
        canMove = true;
        switch (event.key) {
            case 'ArrowLeft':
            case 'a':
                handleRotate({x: x + 10})
                break
            case 'ArrowRight':
            case 'd':
                handleRotate({x: x - 10})
                break
            case 'ArrowUp':
            case 'w':
                handleZoom({deltaY: -1})
                break
            case 'ArrowDown':
            case 's':
                handleZoom({deltaY: 1})
                break
            case SPACEBAR_KEY:
                canMoveBus = !canMoveBus
        }
        canMove = false
    })

    function render() {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);

        bindFrameBufferNull();

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        if (transaprencyEnabled) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        } else {
            gl.disable(gl.BLEND)
        }

        let cameraPosition = m4.addVectors(cameraTarget, [0, 0, radius]);
        const camera = m4.lookAt(cameraPosition, cameraTarget, up);
        // Make a view matrix from the camera matrix.
        let view = m4.inverse(camera);
        if (!shadowEnabled) {
            const sharedUniforms = {
                u_lightDirection: lightDirection,
                u_view: view,
                u_projection: projection,
                u_viewWorldPosition: cameraPosition,
                u_lightPosition: lightPosition,
            };

            //
            // // calls gl.uniform
            for (let model of [...models, 'cristallo']) {
                switch (model) {
                    case 'bus':
                        if (canMoveBus)
                            busTransformation = m4.yRotate(busTransformation, busVelocity)
                        renderMesh(model, gl, sharedUniforms, meshProgramInfo, Parts, busTransformation)
                        break
                    default:
                        renderMesh(model, gl, sharedUniforms, meshProgramInfo, Parts, u_world)
                }
            }
        } else {

            const lightWorldMatrix = m4.lookAt(lightPosition,       // position
                lightTarget,      // target
                up,                  // up
            );

            const lightProjectionMatrix = m4.perspective(degToRad(shadow.fov), shadow.projWidth / shadow.projHeight, 3,                        // near
                shadow.zFarProj);     // far

            let sharedUniforms = {
                u_view: m4.inverse(lightWorldMatrix),                  // View Matrix
                u_projection: lightProjectionMatrix,                   // Projection Matrix
                u_bias: shadow.bias,
                u_textureMatrix: m4.identity(),
                u_projectedTexture: shadow.depthTexture,
                u_reverseLightDirection: lightWorldMatrix.slice(8, 11),
                u_lightPosition: lightPosition,
            };

            // draw to the depth texture
            gl.bindFramebuffer(gl.FRAMEBUFFER, shadow.depthFramebuffer);
            gl.viewport(0, 0, shadow.depthTextureSize, shadow.depthTextureSize);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            models.forEach(model => {
                if (model === 'bus') {
                    const move = -0.01
                    if (canMoveBus)
                        busTransformation = m4.yRotate(busTransformation, move)
                    renderMesh(model, gl, sharedUniforms, colorProgramInfo, Parts, busTransformation);
                } else
                    renderMesh(model, gl, sharedUniforms, colorProgramInfo, Parts, u_world)
            });
            if (!transaprencyEnabled) {
                renderMesh('cristallo', gl, sharedUniforms, colorProgramInfo, Parts, u_world)
            }

            bindFrameBufferNull()

            let textureMatrix = m4.identity();
            textureMatrix = m4.translate(textureMatrix, 0.5, 0.5, 0.5);
            textureMatrix = m4.scale(textureMatrix, 0.5, 0.5, 0.5);
            textureMatrix = m4.multiply(textureMatrix, lightProjectionMatrix);
            // use the inverse of this world matrix to make
            // a matrix that will transform other positions
            // to be relative this world space.
            textureMatrix = m4.multiply(textureMatrix, m4.inverse(lightWorldMatrix));


            sharedUniforms = {
                u_view: view,
                u_projection: projection,
                u_bias: shadow.bias,
                u_textureMatrix: textureMatrix,
                u_projectedTexture: shadow.depthTexture,
                u_reverseLightDirection: lightWorldMatrix.slice(8, 11),
                u_worldCameraPosition: camera,
                u_lightPosition: lightPosition
            };

            models.forEach(model => {
                if (model === 'bus') {
                    const move = -0.004
                    if (canMoveBus)
                        busTransformation = m4.yRotate(busTransformation, move)
                    renderMesh(model, gl, sharedUniforms, textureProgramInfo, Parts, busTransformation);
                } else
                    renderMesh(model, gl, sharedUniforms, textureProgramInfo, Parts, u_world)
            });
            if (!transaprencyEnabled) {
                renderMesh('cristallo', gl, sharedUniforms, textureProgramInfo, Parts, u_world)
            }

            bindFrameBufferNull()

            // render "cristallo" mesh outside textureProgramInfo to avoid shadows
            if (transaprencyEnabled) {
                sharedUniforms = {
                    u_lightDirection: lightDirection,
                    u_view: view,
                    u_projection: projection,
                    u_viewWorldPosition: cameraPosition,
                    u_lightPosition: lightPosition,
                };

                renderMesh('cristallo', gl, sharedUniforms, meshProgramInfo, Parts, u_world)
            }
        }

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();

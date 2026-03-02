const canvas = document.querySelector("canvas");
const gl = canvas.getContext("webgl");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

if (!gl) {
    alert("WebGL not supported in this browser.");
    throw new Error("WebGL not supported");
}

const angleInstancedArraysExt = gl.getExtension('ANGLE_instanced_arrays');
if (!angleInstancedArraysExt) {
    alert("ANGLE_instanced_arrays extension not supported.");
    throw new Error("ANGLE_instanced_arrays extension not supported");
}

const vertexShaderSource = `
precision mediump float;

attribute vec3 a_position;
attribute vec2 a_uv;
attribute vec3 a_normal;
attribute float a_layer;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;

varying vec2 v_uv;
varying float v_layer;

void main() {
    vec3 displaced = a_position + a_normal * a_layer * 0.2;
    gl_Position = u_projection * u_view * u_model * vec4(displaced, 1.0);

    v_uv = a_uv;
    v_layer = a_layer;
}
`;

const fragmentShaderSource = `
precision mediump float;

uniform sampler2D u_texture;
uniform vec3 u_color;
uniform float u_time;

varying vec2 v_uv;
varying float v_layer;

void main() {
    vec4 texel = texture2D(u_texture, v_uv);
    float alpha = texel.a * (1.0 - v_layer);
    gl_FragColor = vec4(texel.rgb * u_color, alpha);
}
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
}
gl.useProgram(program);

function createCube(size = 1) {
    const hs = size / 2;
    const positions = [
        // Front face
        -hs, -hs, hs, hs, -hs, hs, hs, hs, hs, -hs, hs, hs,
        // Back face
        -hs, -hs, -hs, -hs, hs, -hs, hs, hs, -hs, hs, -hs, -hs,
        // Top face
        -hs, hs, -hs, -hs, hs, hs, hs, hs, hs, hs, hs, -hs,
        // Bottom face
        -hs, -hs, -hs, hs, -hs, -hs, hs, -hs, hs, -hs, -hs, hs,
        // Right face
        hs, -hs, -hs, hs, hs, -hs, hs, hs, hs, hs, -hs, hs,
        // Left face
        -hs, -hs, -hs, -hs, -hs, hs, -hs, hs, hs, -hs, hs, -hs
    ];

    const uvs = [
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1
    ];

    const normals = [
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,      // Front
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,   // Back
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,       // Top
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,   // Bottom
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,       // Right
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0    // Left
    ];

    const indices = [
        0, 1, 2, 0, 2, 3,
        4, 5, 6, 4, 6, 7,
        8, 9, 10, 8, 10, 11,
        12, 13, 14, 12, 14, 15,
        16, 17, 18, 16, 18, 19,
        20, 21, 22, 20, 22, 23
    ];

    const data = [];
    for (let i = 0; i < indices.length; i++) {
        const idx = indices[i];
        data.push(positions[idx * 3], positions[idx * 3 + 1], positions[idx * 3 + 2]);
        data.push(uvs[idx * 2], uvs[idx * 2 + 1]);
        data.push(normals[idx * 3], normals[idx * 3 + 1], normals[idx * 3 + 2]);
    }

    return new Float32Array(data);
}

function createPlane(size = 1) {
    const hs = size / 2;

    return new Float32Array([
        // Positions    // UVs   // Normals
        -hs, 0.0, -hs, 0.0, 0.0, 0, 1, 0,
        hs, 0.0, -hs, 1.0, 0.0, 0, 1, 0,
        -hs, 0.0, hs, 0.0, 1.0, 0, 1, 0,

        -hs, 0.0, hs, 0.0, 1.0, 0, 1, 0,
        hs, 0.0, -hs, 1.0, 0.0, 0, 1, 0,
        hs, 0.0, hs, 1.0, 1.0, 0, 1, 0,
    ]);
}

const vertices = createPlane(2.0);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const positionLoc = gl.getAttribLocation(program, "a_position");
const uvLoc = gl.getAttribLocation(program, "a_uv");
const normalLoc = gl.getAttribLocation(program, "a_normal");

const stride = 8 * Float32Array.BYTES_PER_ELEMENT; // 3 position + 2 uv + 3 normal
gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, stride, 0);

const uvOffset = 3 * Float32Array.BYTES_PER_ELEMENT;
gl.enableVertexAttribArray(uvLoc);
gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, stride, uvOffset);

const normalOffset = 5 * Float32Array.BYTES_PER_ELEMENT;
gl.enableVertexAttribArray(normalLoc);
gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, stride, normalOffset);

const uProjection = gl.getUniformLocation(program, "u_projection");
const uView = gl.getUniformLocation(program, "u_view");
const uModel = gl.getUniformLocation(program, "u_model");
const uColor = gl.getUniformLocation(program, "u_color");
const uvLayer = gl.getUniformLocation(program, "u_layer");
const uTexture = gl.getUniformLocation(program, "u_texture");
const uTime = gl.getUniformLocation(program, "u_time");

function perspective(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);

    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, (2 * far * near) * nf, 0
    ]);
}
function lookAt(eye, center, up) {
    const z = normalize(subtract(eye, center));
    const x = normalize(cross(up, z));
    const y = cross(z, x);

    return new Float32Array([
        x[0], y[0], z[0], 0,
        x[1], y[1], z[1], 0,
        x[2], y[2], z[2], 0,
        -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
    ]);
}

function identity() {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}

function subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(v) {
    const length = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / length, v[1] / length, v[2] / length];
}

function loadTexture(url, onLoad) {
    const texture = gl.createTexture();
    const image = new Image();

    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        onLoad?.()
    };
    image.src = url;
    return texture;
}

let cameraRadius = 2.5;
let cameraTheta = 0;
let cameraPhi = 0.8;

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});
window.addEventListener("mouseup", () => isDragging = false);
window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    cameraTheta += dx * 0.01;
    cameraPhi -= dy * 0.01;
    cameraPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraPhi));
});
window.addEventListener("wheel", (e) => {
    cameraRadius -= e.deltaY * 0.01;
    cameraRadius = Math.max(1.0, Math.min(10.0, cameraRadius));
});

const projMat = perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
const modelMat = identity();
let accentColor = [0.0, 0.0, 0.0];

window.addEventListener("message", (e) => {
    if (e.data.accentColor) {
        const rgb = e.data.accentColor.match(/\d+/g).map(Number);
        accentColor = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
        gl.uniform3fv(uColor, accentColor);
    }
});

gl.uniformMatrix4fv(uProjection, false, projMat);
gl.uniformMatrix4fv(uModel, false, modelMat);
gl.uniform3f(uColor, 1.0, 1.0, 1.0);

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE);


const texture = loadTexture("../assets/cat.svg", () => requestAnimationFrame(render));
const numShells = 20;
const layerData = new Float32Array(numShells);
for (let i = 0; i < numShells; i++) {
    layerData[i] = i / numShells;
}

const layerBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, layerBuffer);
gl.bufferData(gl.ARRAY_BUFFER, layerData, gl.STATIC_DRAW);

const layerLoc = gl.getAttribLocation(program, "a_layer");
gl.enableVertexAttribArray(layerLoc);
gl.vertexAttribPointer(layerLoc, 1, gl.FLOAT, false, 0, 0);
angleInstancedArraysExt.vertexAttribDivisorANGLE(layerLoc, 1);


function render(time) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const x = cameraRadius * Math.sin(cameraPhi) * Math.cos(cameraTheta);
    const y = cameraRadius * Math.cos(cameraPhi);
    const z = cameraRadius * Math.sin(cameraPhi) * Math.sin(cameraTheta);
    const eye = [x, y, z];
    const center = [0, 0, 0];
    const up = [0, 1, 0];

    const viewMat = lookAt(eye, center, up);
    gl.uniformMatrix4fv(uView, false, viewMat);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uTexture, 0);

    gl.uniform1f(uTime, time * 0.001);

    angleInstancedArraysExt.drawArraysInstancedANGLE(gl.TRIANGLES, 0, vertices.length / 8, numShells);

    requestAnimationFrame(render);
}
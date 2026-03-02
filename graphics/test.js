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

const vertexShaderSource = `
attribute vec2 a_position;
uniform float u_angle;
void main() {
    float c = cos(u_angle);
    float s = sin(u_angle);
    mat2 rotation = mat2(c, -s, s, c);
    gl_Position = vec4(rotation * a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision mediump float;
uniform vec3 u_color;
void main() {
    gl_FragColor = vec4(u_color, 1.0);
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

const vertices = new Float32Array([
    0, 0.5,
    -0.5, -0.5,
    0.5, -0.5,
]);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const positionLoc = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

const colorLoc = gl.getUniformLocation(program, "u_color");
const angleLoc = gl.getUniformLocation(program, "u_angle");

let angle = 0.0;

function render() {
    angle += 0.01;
    gl.uniform1f(angleLoc, angle);

    const r = (Math.sin(angle * 0.7) + 1) / 2;
    const g = (Math.sin(angle * 0.9 + 2) + 1) / 2;
    const b = (Math.sin(angle * 1.3 + 4) + 1) / 2;
    gl.uniform3f(colorLoc, r, g, b);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(render);
}

render();
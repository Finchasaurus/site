import { ObjMesh } from "./obj.js";

const canvas = document.querySelector("canvas");
const gl = canvas.getContext("webgl");

if (!gl) {
	alert("WebGL not supported");
	throw new Error("WebGL not supported");
}

function resize() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener("resize", resize);
resize();

gl.enable(gl.DEPTH_TEST);
gl.clearColor(0.0, 0.0, 0.0, 0.0);

const vertexShaderSource = `
precision mediump float;

attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;
uniform mat3 u_normalMatrix;

varying vec3 v_normal;
varying vec3 v_pos;

void main() {
    vec4 worldPos = u_model * vec4(a_position, 1.0);
    v_pos = worldPos.xyz;
    v_normal = normalize(u_normalMatrix * a_normal);

    gl_Position = u_projection * u_view * worldPos;
}
`;

const fragmentShaderSource = `
precision mediump float;

varying vec3 v_normal;
varying vec3 v_pos;

uniform vec3 u_lightDir;
uniform vec3 u_color;
uniform float u_shininess;
uniform vec3 u_eye;

void main() {
    vec3 N = normalize(v_normal);
    vec3 L = normalize(u_lightDir);
    vec3 V = normalize(u_eye - v_pos);
    vec3 H = normalize(L + V);

    float diff = max(dot(N, L), 0.0);
    float spec = pow(max(dot(N, H), 0.0), u_shininess);

    vec3 ambient = 0.15 * u_color;
    vec3 color = ambient + u_color * diff + vec3(1.0) * spec;

    gl_FragColor = vec4(color, 1.0);
}
`;

function createShader(gl, type, source) {
	const s = gl.createShader(type);
	gl.shaderSource(s, source);
	gl.compileShader(s);
	if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
		console.error(gl.getShaderInfoLog(s));
		return null;
	}
	return s;
}

function createProgram(gl, vsSrc, fsSrc) {
	const vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
	const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);
	const p = gl.createProgram();
	gl.attachShader(p, vs);
	gl.attachShader(p, fs);
	gl.linkProgram(p);
	if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
		console.error(gl.getProgramInfoLog(p));
		return null;
	}
	return p;
}

const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
gl.useProgram(program);

const aPos = gl.getAttribLocation(program, "a_position");
const aNorm = gl.getAttribLocation(program, "a_normal");

const uProj = gl.getUniformLocation(program, "u_projection");
const uView = gl.getUniformLocation(program, "u_view");
const uModel = gl.getUniformLocation(program, "u_model");
const uNormal = gl.getUniformLocation(program, "u_normalMatrix");
const uLight = gl.getUniformLocation(program, "u_lightDir");
const uColor = gl.getUniformLocation(program, "u_color");
const uEye = gl.getUniformLocation(program, "u_eye");
const uShiny = gl.getUniformLocation(program, "u_shininess");

function perspective(fov, aspect, near, far) {
	const f = 1 / Math.tan(fov / 2);
	return new Float32Array([
		f / aspect,
		0,
		0,
		0,
		0,
		f,
		0,
		0,
		0,
		0,
		(far + near) / (near - far),
		-1,
		0,
		0,
		(2 * far * near) / (near - far),
		0,
	]);
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (v) => {
	const l = Math.hypot(v[0], v[1], v[2]);
	return [v[0] / l, v[1] / l, v[2] / l];
};

function lookAt(e, c, u) {
	const z = normalize(sub(e, c));
	const x = normalize(cross(u, z));
	const y = cross(z, x);

	return new Float32Array([
		x[0],
		x[1],
		x[2],
		0,
		y[0],
		y[1],
		y[2],
		0,
		z[0],
		z[1],
		z[2],
		0,
		-dot(x, e),
		-dot(y, e),
		-dot(z, e),
		1,
	]);
}

let radius = 30.0;
let theta = Math.PI / 4;
let phi = Math.PI / 2;

let dragging = false;
let lastX = 0,
	lastY = 0;

canvas.addEventListener("mousedown", (e) => {
	dragging = true;
	lastX = e.clientX;
	lastY = e.clientY;
});
window.addEventListener("mouseup", () => (dragging = false));
window.addEventListener("mousemove", (e) => {
	if (!dragging) return;
	theta += (e.clientX - lastX) * 0.01;
	phi -= (e.clientY - lastY) * 0.01;
	phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
	lastX = e.clientX;
	lastY = e.clientY;
});
window.addEventListener("wheel", (e) => {
	radius += e.deltaY * 0.01;
	radius = Math.max(1.5, Math.min(8.0, radius));
});

let drawCount = 0;

const mesh = new ObjMesh();
mesh.load("../assets/teapot.obj");

function initMesh() {
	if (mesh.vpos.length === 0) {
		requestAnimationFrame(initMesh);
		return;
	}

	const buffers = mesh.getVertexBuffers();

	const box = mesh.getBoundingBox();
	if (!box) return;

	const size = Math.max(box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]);

	mesh.shiftAndScale([-(box.min[0] + box.max[0]) / 2, -box.min[1], -(box.min[2] + box.max[2]) / 2], 1 / size);

	const vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buffers.positionBuffer), gl.STATIC_DRAW);
	gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(aPos);

	const nbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buffers.normalBuffer), gl.STATIC_DRAW);
	gl.vertexAttribPointer(aNorm, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(aNorm);

	drawCount = buffers.positionBuffer.length / 3;
}
initMesh();

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const eye = [
		radius * Math.sin(phi) * Math.cos(theta),
		radius * Math.cos(phi),
		radius * Math.sin(phi) * Math.sin(theta),
	];

	gl.uniformMatrix4fv(uProj, false, perspective(Math.PI / 4, canvas.width / canvas.height, 0.01, 100));
	gl.uniformMatrix4fv(uView, false, lookAt(eye, [0, 0, 0], [0, 1, 0]));
	gl.uniformMatrix4fv(uModel, false, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
	gl.uniformMatrix3fv(uNormal, false, new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]));

	gl.uniform3f(uLight, 0.6, 1.0, 0.8);
	gl.uniform3f(uColor, 0.9, 0.9, 0.9);
	gl.uniform3fv(uEye, eye);
	gl.uniform1f(uShiny, 64.0);

	if (drawCount) {
		gl.drawArrays(gl.TRIANGLES, 0, drawCount);
	}

	requestAnimationFrame(render);
}

render();

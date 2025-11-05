const canvas = document.getElementById("canvas");
canvas.width = 1200;
canvas.height = 800;

var pitch = 0;
var yaw = Math.PI;
var sensitivity = 0.002;
var eyePosition = vec3.fromValues(16, 16, -8);
var pressedKeys = {
	w: false,
	a: false,
	s: false,
	d: false,
	space: false,
	shift: false,
};

canvas.addEventListener('click', () => {
	canvas.requestPointerLock();
});

// When pointer is locked, capture mouse movement
document.addEventListener('pointerlockchange', () => {
	if (document.pointerLockElement === canvas) {
		console.log('Pointer locked');
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mousedown', onMouseDown);
	} else {
		console.log('Pointer released');
		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('mousedown', onMouseDown);
	}
});

function onMouseMove(e) {
	// movementX and movementY give relative mouse motion
	yaw -= e.movementX * sensitivity;
	pitch -= e.movementY * sensitivity;

	// Clamp pitch to prevent flipping
	const maxPitch = Math.PI / 2;
	pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
}

function onMouseDown(e) {
	const forward = vec3.fromValues(
		-Math.cos(pitch) * Math.sin(yaw),
		Math.sin(pitch),
		-Math.cos(pitch) * Math.cos(yaw),
	);
	const [pos, norm] = raycast(eyePosition, forward);
	if(e.button == 0) {
		setVoxel(pos[0], pos[1], pos[2], false);
		generateBuffers(generateMesh());
	} else if (e.button == 2) {
		setVoxel(pos[0] + norm[0], pos[1] + norm[1], pos[2] + norm[2], true);
		generateBuffers(generateMesh());
	}
}

function raycast(pos, dir) {
	function abs(out, a) {
		out[0] = Math.abs(a[0]);
		out[1] = Math.abs(a[1]);
		out[2] = Math.abs(a[2]);
		return out;
	}
	var deltaDist = abs([], vec3.inverse([], dir));
	var rayStep = vec3.fromValues(Math.sign(dir[0]), Math.sign(dir[1]), Math.sign(dir[2]));
	var mapPos = vec3.floor([], pos);
	let sideDist = vec3.create();
	for (let i = 0; i < 3; i++) {
		if (dir[i] < 0) {
			sideDist[i] = (pos[i] - mapPos[i]) * deltaDist[i];
		} else {
			sideDist[i] = (mapPos[i] + 1.0 - pos[i]) * deltaDist[i];
		}
	}
	var normal = vec3.fromValues(0, 0, 0);

	for(var i = 0; i < 100; i++) {
		if(getVoxel(mapPos[0], mapPos[1], mapPos[2]) || outOfBounds(mapPos[0], mapPos[1], mapPos[2])) break;
		if (sideDist[0] < sideDist[1]) {
			if (sideDist[0] < sideDist[2]) {
				sideDist[0] += deltaDist[0];
				mapPos[0] += rayStep[0];
				normal = [1, 0, 0];
			} else {
				sideDist[2] += deltaDist[2];
				mapPos[2] += rayStep[2];
				normal = [0, 0, 1];
			}
		} else {
			if (sideDist[1] < sideDist[2]) {
				sideDist[1] += deltaDist[1];
				mapPos[1] += rayStep[1];
				normal = [0, 1, 0];
			} else {
				sideDist[2] += deltaDist[2];
				mapPos[2] += rayStep[2];
				normal = [0, 0, 1];
			}
		}
	}

	vec3.mul(normal, normal, rayStep);
	vec3.negate(normal, normal);
	return [mapPos, normal];
}

function calculateViewMatrix() {
	var view = mat4.create();
	mat4.rotateX(view, view, -pitch);
	mat4.rotateY(view, view, -yaw);
	mat4.translate(view, view, vec3.negate([], eyePosition));
	return view;
}

document.addEventListener('keydown', (e) => {
	e.keyCode
	switch(e.key) {
		case 'w': case 'W': pressedKeys.w = true; break;
		case 'a': case 'A': pressedKeys.a = true; break;
		case 's': case 'S': pressedKeys.s = true; break;
		case 'd': case 'D': pressedKeys.d = true; break;
		case ' ': pressedKeys.space = true; break;
		case 'Shift': pressedKeys.shift = true; break;
	}
});

document.addEventListener('keyup', (e) => {
	switch(e.key) {
		case 'w': case 'W': pressedKeys.w = false; break;
		case 'a': case 'A': pressedKeys.a = false; break;
		case 's': case 'S': pressedKeys.s = false; break;
		case 'd': case 'D': pressedKeys.d = false; break;
		case ' ': pressedKeys.space = false; break;
		case 'Shift': pressedKeys.shift = false; break;
	}
});

var gl = canvas.getContext("webgl2");
if (!gl) {
    console.error("WebGL 2 not available");
    document.body.innerHTML = "This example requires WebGL 2 which is unavailable on this system."
}
if (!gl.getExtension("EXT_color_buffer_float")) {
    console.error("FLOAT color buffer not available");
    document.body.innerHTML = "This example requires EXT_color_buffer_float which is unavailable on this system."
}

gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
gl.clearColor(0.25, 0.765625, 1, 1.0);
gl.enable(gl.DEPTH_TEST);

var NEAR = 0.1;
var FAR = 100.0;

var allTextures = ['assets/textures/stone.png']

var CHUNK_SIZE = 32;
var map = new Array(CHUNK_SIZE*CHUNK_SIZE*CHUNK_SIZE);

for(var z = 0; z < CHUNK_SIZE; z++) {
	for(var y = 0; y < CHUNK_SIZE; y++) {
		for(var x = 0; x < CHUNK_SIZE; x++) {
			map[z*CHUNK_SIZE*CHUNK_SIZE+y*CHUNK_SIZE+x] = y<8;
		}
	}
}

function outOfBounds(x, y, z) {
	return x < 0 || x > CHUNK_SIZE - 1 || y < 0 || y > CHUNK_SIZE - 1 || z < 0 || z > CHUNK_SIZE - 1;
}

function getVoxel(x, y, z) {
	if (outOfBounds(x, y, z)) {
		return false;
	}
	return map[z*CHUNK_SIZE*CHUNK_SIZE+y*CHUNK_SIZE+x];
}

function setVoxel(x, y, z, block) {
	if (outOfBounds(x, y, z)) {
		return;
	}
	map[z*CHUNK_SIZE*CHUNK_SIZE+y*CHUNK_SIZE+x] = block;
}

function generateMesh() {
	const blockVerts = [
		[0, 0, 0],
		[1, 0, 0],
		[1, 1, 0],
		[0, 1, 0],
		[0, 0, 1],
		[1, 0, 1],
		[1, 1, 1],
		[0, 1, 1],
	];
	const blockNormals = [
		[0, 0, -1],
		[0, 0, 1],
		[0, 1, 0],
		[0, -1, 0],
		[-1, 0, 0],
		[1, 0, 0],
	];
	const blockQuads = [
		[0, 3, 1, 2],
		[5, 6, 4, 7],
		[3, 7, 2, 6],
		[1, 5, 0, 4],
		[4, 7, 0, 3],
		[1, 2, 5, 6],
	];
	const blockUvs = [
		[0, 0],
		[0, 1],
		[1, 0],
		[1, 1],
	];
	var vertices = [];
	var normals = [];
	var uvs = [];
	var indices = [];
	var vertexIndex = 0;
	for(var z = 0; z < CHUNK_SIZE; z++) {
		for(var y = 0; y < CHUNK_SIZE; y++) {
			for(var x = 0; x < CHUNK_SIZE; x++) {
				if(!getVoxel(x, y, z)) continue;
				for(var p = 0; p < 6; p++) {
					if(getVoxel(x + blockNormals[p][0], y + blockNormals[p][1], z + blockNormals[p][2])) {
						continue;
					}
					
					for(var i = 0; i < 4; i++) {
						vertices.push(x + blockVerts[blockQuads[p][i]][0]);
						vertices.push(y + blockVerts[blockQuads[p][i]][1]);
						vertices.push(z + blockVerts[blockQuads[p][i]][2]);
						
						normals.push(blockNormals[p][0]);
						normals.push(blockNormals[p][1]);
						normals.push(blockNormals[p][2]);
						
						uvs.push(blockUvs[i][0]);
						uvs.push(blockUvs[i][1]);
					}

					indices.push(vertexIndex);
					indices.push(vertexIndex + 1);
					indices.push(vertexIndex + 2);
					indices.push(vertexIndex + 2);
					indices.push(vertexIndex + 1);
					indices.push(vertexIndex + 3);
					vertexIndex += 4;
				}
			}
		}
	}
	return {
		positions: new Float32Array(vertices),
		normals: new Float32Array(normals),
		uvs: new Float32Array(uvs),
		indices: new Uint32Array(indices),
	};
}

function generateBuffers(chunk) {
	gl.bindVertexArray(chunkArray);

	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, chunk.positions, gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);

	gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, chunk.uvs, gl.STATIC_DRAW);
	gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(1);

	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, chunk.normals, gl.STATIC_DRAW);
	gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(2);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, chunk.indices, gl.STATIC_DRAW);
	numIndices = chunk.indices.length;
}

var numNoisePixels = gl.drawingBufferWidth * gl.drawingBufferHeight;
var noiseTextureData = new Float32Array(numNoisePixels * 2);

for (var i = 0; i < numNoisePixels; ++i) {
    var index = i * 2;
    noiseTextureData[index]     = Math.random() * 2.0 - 1.0;
    noiseTextureData[index + 1] = Math.random() * 2.0 - 1.0;
}

var depthRange = vec2.fromValues(NEAR, FAR);

/////////////////////
// SET UP PROGRAM
/////////////////////

var colorgeoVsSource =  document.getElementById("vertex-colorgeo").text.trim();
var colorgeoFsSource =  document.getElementById("fragment-colorgeo").text.trim();

var colorgeoVertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(colorgeoVertexShader, colorgeoVsSource);
gl.compileShader(colorgeoVertexShader);

if (!gl.getShaderParameter(colorgeoVertexShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(colorgeoVertexShader));
}

var colorgeoFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(colorgeoFragmentShader, colorgeoFsSource);
gl.compileShader(colorgeoFragmentShader);

if (!gl.getShaderParameter(colorgeoFragmentShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(colorgeoFragmentShader));
}

var colorGeoProgram = gl.createProgram();
gl.attachShader(colorGeoProgram, colorgeoVertexShader);
gl.attachShader(colorGeoProgram, colorgeoFragmentShader);
gl.linkProgram(colorGeoProgram);

if (!gl.getProgramParameter(colorGeoProgram, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(colorGeoProgram));
}

/////////////////////
// SSAO PROGRAMS
/////////////////////

var quadVsSource =  document.getElementById("vertex-quad").text.trim();
var ssaoFsSource = document.getElementById("fragment-ssao").text.trim();
var aoBlendFsSource = document.getElementById("fragment-aoblend").text.trim();
var noSSAOFsSource = document.getElementById("fragment-color").text.trim();

var quadVertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(quadVertexShader, quadVsSource);
gl.compileShader(quadVertexShader);

if (!gl.getShaderParameter(quadVertexShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(quadVertexShader));
}

var ssaoFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(ssaoFragmentShader, ssaoFsSource);
gl.compileShader(ssaoFragmentShader);

if (!gl.getShaderParameter(ssaoFragmentShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(ssaoFragmentShader));
}

var aoBlendFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(aoBlendFragmentShader, aoBlendFsSource);
gl.compileShader(aoBlendFragmentShader);

if (!gl.getShaderParameter(aoBlendFragmentShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(aoBlendFragmentShader));
}

var noSSAOFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(noSSAOFragmentShader, noSSAOFsSource);
gl.compileShader(noSSAOFragmentShader);

if (!gl.getShaderParameter(noSSAOFragmentShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(noSSAOFragmentShader));
}

// Calculate occlusion
var ssaoProgram = gl.createProgram();
gl.attachShader(ssaoProgram, quadVertexShader);
gl.attachShader(ssaoProgram, ssaoFragmentShader);
gl.linkProgram(ssaoProgram);

if (!gl.getProgramParameter(ssaoProgram, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(ssaoProgram));
}

// Blend color/occlusion
var aoBlendProgram = gl.createProgram();
gl.attachShader(aoBlendProgram, quadVertexShader);
gl.attachShader(aoBlendProgram, aoBlendFragmentShader);
gl.linkProgram(aoBlendProgram);

if (!gl.getProgramParameter(aoBlendProgram, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(aoBlendProgram));
}

// SSAO disabled
var noSSAOProgram = gl.createProgram();
gl.attachShader(noSSAOProgram, quadVertexShader);
gl.attachShader(noSSAOProgram, noSSAOFragmentShader);
gl.linkProgram(noSSAOProgram);

if (!gl.getProgramParameter(noSSAOProgram, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(noSSAOProgram));
}

/////////////////////////
// GET UNIFORM LOCATIONS
/////////////////////////

var sceneUniformsLocation = gl.getUniformBlockIndex(colorGeoProgram, "SceneUniforms");
gl.uniformBlockBinding(colorGeoProgram, sceneUniformsLocation, 0);

var modelMatrixLocation = gl.getUniformLocation(colorGeoProgram, "uModel");
var textureLocation = gl.getUniformLocation(colorGeoProgram, "uTexture");

var ssaoUniformsLocation = gl.getUniformBlockIndex(ssaoProgram, "SSAOUniforms");
gl.uniformBlockBinding(ssaoProgram, ssaoUniformsLocation, 1);

var positionBufferLocation = gl.getUniformLocation(ssaoProgram, "uPositionBuffer");
var normalBufferLocation = gl.getUniformLocation(ssaoProgram, "uNormalBuffer");
var noiseBufferLocation = gl.getUniformLocation(ssaoProgram, "uNoiseBuffer");

var colorBufferLocation = gl.getUniformLocation(aoBlendProgram, "uColorBuffer");
var occlustionBufferLocation = gl.getUniformLocation(aoBlendProgram, "uOcclusionBuffer");

var noSSAOColorBufferLocation = gl.getUniformLocation(noSSAOProgram, "uColorBuffer");

////////////////////////////////
//  SET UP FRAMEBUFFERS
////////////////////////////////

var colorGeoBuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, colorGeoBuffer);
gl.activeTexture(gl.TEXTURE0);

var colorTarget = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, colorTarget);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, gl.drawingBufferWidth, gl.drawingBufferHeight);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTarget, 0);

var positionTarget = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, positionTarget);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, positionTarget, 0);

var normalTarget = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, normalTarget);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, normalTarget, 0);

var depthTarget = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, depthTarget);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTarget, 0);

    gl.drawBuffers([
    gl.COLOR_ATTACHMENT0,
    gl.COLOR_ATTACHMENT1,
    gl.COLOR_ATTACHMENT2
]);

var occlusionBuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, occlusionBuffer);

var occlusionTarget = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, occlusionTarget);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, gl.drawingBufferWidth, gl.drawingBufferHeight);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, occlusionTarget, 0);

gl.bindFramebuffer(gl.FRAMEBUFFER, null);

/////////////////////
// SET UP GEOMETRY
/////////////////////


var chunkArray = gl.createVertexArray();
gl.bindVertexArray(chunkArray);

var positionBuffer = gl.createBuffer();
var uvBuffer = gl.createBuffer();
var normalBuffer = gl.createBuffer();
var indices = gl.createBuffer();
var numIndices;

generateBuffers(generateMesh());

// Quad for screen-space passes
var quadArray = gl.createVertexArray();
gl.bindVertexArray(quadArray);

var quadPositionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadPositionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, 1,
    -1, -1,
    1, -1,
    -1, 1,
    1, -1,
    1, 1,
]), gl.STATIC_DRAW);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(0);

//////////////////////
// SET UP UNIFORMS
//////////////////////

var projMatrix = mat4.create();
mat4.perspective(projMatrix, Math.PI / 2, canvas.width / canvas.height, NEAR, FAR);

var viewMatrix = calculateViewMatrix();

var viewProjMatrix = mat4.create();
mat4.multiply(viewProjMatrix, projMatrix, viewMatrix);

var lightPosition = vec3.fromValues(16, 48, 16);

var sceneUniformData = new Float32Array(40);
sceneUniformData.set(viewMatrix);
sceneUniformData.set(projMatrix, 16);
sceneUniformData.set(eyePosition, 32);
sceneUniformData.set(lightPosition, 36);

var sceneUniformBuffer = gl.createBuffer();
gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, sceneUniformBuffer);
gl.bufferData(gl.UNIFORM_BUFFER, sceneUniformData, gl.STATIC_DRAW);

var ssaoUniformData = new Float32Array(8);
ssaoUniformData[0] = 16.0; // sample radius
ssaoUniformData[1] = 0.04; // bias
ssaoUniformData.set(vec2.fromValues(1, 1), 2); // attenuation
ssaoUniformData.set(depthRange, 4);

var ssaoUniformBuffer = gl.createBuffer();
gl.bindBufferBase(gl.UNIFORM_BUFFER, 1, ssaoUniformBuffer);
gl.bufferData(gl.UNIFORM_BUFFER, ssaoUniformData, gl.STATIC_DRAW);

var rotationMatrix = mat4.create();

async function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.crossOrigin = ''; // allow CORS if needed
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}

async function loadImagesInChunks(urls, chunkSize = 100) {
  const result = [];
  for (let i = 0; i < urls.length; i += chunkSize) {
    const chunk = urls.slice(i, i + chunkSize);
    const imgs = await Promise.all(chunk.map(loadImage));
    result.push(...imgs);
    await new Promise(r => requestAnimationFrame(r)); // yield to browser
  }
  return result;
}

async function createTextureArray(gl, imageURLs) {
  // Load all images first
  const images = await loadImagesInChunks(imageURLs);

  const width = images[0].width;
  const height = images[0].height;
  const layers = images.length;

  // Check that all images have same dimensions
  for (const img of images) {
    if (img.width !== width || img.height !== height) {
      throw new Error('All images must have the same dimensions for TEXTURE_2D_ARRAY');
    }
  }

  // Create texture
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);

  // Allocate storage
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, width, height, layers);

  // Upload each image to its layer
  images.forEach((img, i) => {
    gl.texSubImage3D(
      gl.TEXTURE_2D_ARRAY,
      0,             // mip level
      0, 0, i,       // xoffset, yoffset, zoffset (layer)
      width,
      height,
      1,             // depth (just one layer)
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      img
    );
  });

  // Set texture parameters
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);

  return texture;
}

const maxLayers = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS);

var lastTime;

async function main() {
	var textureArray = await createTextureArray(gl, allTextures);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureArray);

	var noiseTexture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, noiseTexture);

	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG16F, gl.drawingBufferWidth, gl.drawingBufferHeight);
	gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RG, gl.FLOAT, noiseTextureData);

	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, colorTarget);

	gl.activeTexture(gl.TEXTURE3);
	gl.bindTexture(gl.TEXTURE_2D, positionTarget);

	gl.activeTexture(gl.TEXTURE4);
	gl.bindTexture(gl.TEXTURE_2D, normalTarget);

	gl.activeTexture(gl.TEXTURE5);
	gl.bindTexture(gl.TEXTURE_2D, occlusionTarget);

	gl.useProgram(colorGeoProgram);
	gl.uniform1i(textureLocation, 0);

	var modelMatrix = mat4.create();
	mat4.identity(modelMatrix);
	gl.uniformMatrix4fv(modelMatrixLocation, false, modelMatrix);

	gl.useProgram(ssaoProgram);
	gl.uniform1i(positionBufferLocation, 3);
	gl.uniform1i(normalBufferLocation, 4);
	gl.uniform1i(noiseBufferLocation, 1);

	gl.useProgram(aoBlendProgram);
	gl.uniform1i(colorBufferLocation, 2);
	gl.uniform1i(occlustionBufferLocation, 5);

	gl.useProgram(noSSAOProgram);
	gl.uniform1i(noSSAOColorBufferLocation, 2);

	function draw(now) {
		if (!lastTime) { lastTime = now; }
		var dt = (now - lastTime)/1000.0;
		////////////////////
		// DRAW BOXES
		////////////////////

		var speed = 4;

		if(pressedKeys.w) {
			const forw = vec2.fromValues(-Math.sin(yaw)*speed*dt, -Math.cos(yaw)*speed*dt);
			eyePosition[0] += forw[0];
			eyePosition[2] += forw[1];
		}
		if(pressedKeys.s) {
			const forw = vec2.fromValues(-Math.sin(yaw)*speed*dt, -Math.cos(yaw)*speed*dt);
			eyePosition[0] -= forw[0];
			eyePosition[2] -= forw[1];
		}
		if(pressedKeys.d) {
			const forw = vec2.fromValues(Math.sin(yaw + Math.PI / 2)*speed*dt, Math.cos(yaw + Math.PI / 2)*speed*dt);
			eyePosition[0] += forw[0];
			eyePosition[2] += forw[1];
		}
		if(pressedKeys.a) {
			const forw = vec2.fromValues(Math.sin(yaw + Math.PI / 2)*speed*dt, Math.cos(yaw + Math.PI / 2)*speed*dt);
			eyePosition[0] -= forw[0];
			eyePosition[2] -= forw[1];
		}
		if(pressedKeys.space) {
			eyePosition[1] += speed*dt;
		}
		if(pressedKeys.shift) {
			eyePosition[1] -= speed*dt;
		}

		var viewMatrix = calculateViewMatrix();
		
		var sceneUniformData = new Float32Array(40);
		sceneUniformData.set(viewMatrix);
		sceneUniformData.set(projMatrix, 16);
		sceneUniformData.set(eyePosition, 32);
		sceneUniformData.set(lightPosition, 36);

		gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, sceneUniformBuffer);
		gl.bufferData(gl.UNIFORM_BUFFER, sceneUniformData, gl.STATIC_DRAW);

		gl.bindFramebuffer(gl.FRAMEBUFFER, colorGeoBuffer);
		gl.useProgram(colorGeoProgram);
		gl.bindVertexArray(chunkArray);

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.drawElements(gl.TRIANGLES, numIndices, gl.UNSIGNED_INT, 0);

		gl.bindVertexArray(quadArray);

		//////////////////
		// OCCLUSION PASS
		//////////////////

		gl.bindFramebuffer(gl.FRAMEBUFFER, occlusionBuffer);
		gl.useProgram(ssaoProgram);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		//////////////////
		// BLEND PASS
		//////////////////

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.useProgram(aoBlendProgram);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		requestAnimationFrame(draw);
		lastTime = now;
	}

	requestAnimationFrame(draw);
}

main();
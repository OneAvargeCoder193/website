const canvas = document.getElementById("canvas");
canvas.width = screen.width;
canvas.height = screen.height;

const renderDistance = 3;
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
		enterFullscreen();
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mousedown', onMouseDown);
	} else {
		console.log('Pointer released');
		exitFullscren();
		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('mousedown', onMouseDown);
	}
});

function enterFullscreen() {
	// If not in fullscreen, request fullscreen for the canvas
	if (canvas.requestFullscreen) {
		canvas.requestFullscreen();
	} else if (canvas.webkitRequestFullscreen) { /* Safari */
		canvas.webkitRequestFullscreen();
	} else if (canvas.msRequestFullscreen) { /* IE11 */
		canvas.msRequestFullscreen();
	}
}
function exitFullscren() {
	// If in fullscreen, exit fullscreen
	if (document.exitFullscreen) {
		document.exitFullscreen();
	} else if (document.webkitExitFullscreen) { /* Safari */
		document.webkitExitFullscreen();
	} else if (document.msExitFullscreen) { /* IE11 */
		document.msExitFullscreen();
	}
}

var lastMoveX = 0;

function onMouseMove(e) {
	if(Math.abs(e.movementX - lastMoveX) > 50) { // Idk why but it glitches sometiems
		return;
	}

	// movementX and movementY give relative mouse motion
	yaw -= e.movementX * sensitivity;
	pitch -= e.movementY * sensitivity;

	lastMoveX = e.movementX;

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
	const [pos, norm] = game.raycast(eyePosition, forward);
	if(pos == undefined) return;
	if(e.button == 0) {
		game.setAndUpdate(eyePosition, ...pos, getBlock("game:air"));
	} else if (e.button == 2) {
		game.setAndUpdate(eyePosition, ...vec3.add([], pos, norm), getBlock("game:stone"));
	}
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

var allTextures = getUniqueTexturePaths();

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
var transparentFsSource =  document.getElementById("fragment-transparent").text.trim();

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

var transparentColorgeoVertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(transparentColorgeoVertexShader, colorgeoVsSource);
gl.compileShader(transparentColorgeoVertexShader);

if (!gl.getShaderParameter(transparentColorgeoVertexShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(transparentColorgeoVertexShader));
}

var transparentFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(transparentFragmentShader, colorgeoFsSource);
gl.compileShader(transparentFragmentShader);

if (!gl.getShaderParameter(transparentFragmentShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(transparentFragmentShader));
}

var transparentProgram = gl.createProgram();
gl.attachShader(transparentProgram, transparentColorgeoVertexShader);
gl.attachShader(transparentProgram, transparentFragmentShader);
gl.linkProgram(transparentProgram);

if (!gl.getProgramParameter(transparentProgram, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(transparentProgram));
}

/////////////////////
// SSAO PROGRAMS
/////////////////////

var quadVsSource =  document.getElementById("vertex-quad").text.trim();
var ssaoFsSource = document.getElementById("fragment-ssao").text.trim();
var aoBlendFsSource = document.getElementById("fragment-aoblend").text.trim();
var depthFsSource = document.getElementById("fragment-depth").text.trim();
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

var depthFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(depthFragmentShader, depthFsSource);
gl.compileShader(depthFragmentShader);

if (!gl.getShaderParameter(depthFragmentShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(depthFragmentShader));
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

var depthProgram = gl.createProgram();
gl.attachShader(depthProgram, quadVertexShader);
gl.attachShader(depthProgram, depthFragmentShader);
gl.linkProgram(depthProgram);

if (!gl.getProgramParameter(depthProgram, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(depthProgram));
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

var transparentSceneUniformsLocation = gl.getUniformBlockIndex(transparentProgram, "SceneUniforms");
gl.uniformBlockBinding(transparentProgram, transparentSceneUniformsLocation, 0);

var modelMatrixLocation = gl.getUniformLocation(colorGeoProgram, "uModel");
var textureLocation = gl.getUniformLocation(colorGeoProgram, "uTexture");

var transparentModelMatrixLocation = gl.getUniformLocation(transparentProgram, "uModel");
var transparentTextureLocation = gl.getUniformLocation(transparentProgram, "uTexture");

var ssaoUniformsLocation = gl.getUniformBlockIndex(ssaoProgram, "SSAOUniforms");
gl.uniformBlockBinding(ssaoProgram, ssaoUniformsLocation, 1);

var positionBufferLocation = gl.getUniformLocation(ssaoProgram, "uPositionBuffer");
var normalBufferLocation = gl.getUniformLocation(ssaoProgram, "uNormalBuffer");
var noiseBufferLocation = gl.getUniformLocation(ssaoProgram, "uNoiseBuffer");

var colorBufferLocation = gl.getUniformLocation(aoBlendProgram, "uColorBuffer");
var occlustionBufferLocation = gl.getUniformLocation(aoBlendProgram, "uOcclusionBuffer");

var depthBufferLocation = gl.getUniformLocation(depthProgram, "uDepthBuffer");

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
var textureBuffer = gl.createBuffer();
var normalBuffer = gl.createBuffer();
var indicesList = gl.createBuffer();
var numIndices;

const game = new world(0, 0, 0);
game.loadRenderDistance(eyePosition, renderDistance);

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

var lightDirection = vec3.fromValues(1, 3, 2);
vec3.normalize(lightDirection, lightDirection);

var sceneUniformData = new Float32Array(40);
sceneUniformData.set(viewMatrix);
sceneUniformData.set(projMatrix, 16);
sceneUniformData.set(eyePosition, 32);
sceneUniformData.set(lightDirection, 36);

var sceneUniformBuffer = gl.createBuffer();
gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, sceneUniformBuffer);
gl.bufferData(gl.UNIFORM_BUFFER, sceneUniformData, gl.STATIC_DRAW);

var transparentSceneUniformBuffer = gl.createBuffer();
gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, transparentSceneUniformBuffer);
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
    const slice = urls.slice(i, i + chunkSize);
    const imgs = await Promise.all(slice.map(loadImage));
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
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);

  gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);

  return texture;
}

const maxLayers = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS);

var lastTime;
var lastPosBlock = vec3.create();

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
	
	gl.activeTexture(gl.TEXTURE6);
	gl.bindTexture(gl.TEXTURE_2D, depthTarget);

	gl.useProgram(colorGeoProgram);
	gl.uniform1i(textureLocation, 0);

	gl.useProgram(transparentProgram);
	gl.uniform1i(transparentTextureLocation, 0);

	gl.useProgram(ssaoProgram);
	gl.uniform1i(positionBufferLocation, 3);
	gl.uniform1i(normalBufferLocation, 4);
	gl.uniform1i(noiseBufferLocation, 1);

	gl.useProgram(aoBlendProgram);
	gl.uniform1i(colorBufferLocation, 2);
	gl.uniform1i(occlustionBufferLocation, 5);

	gl.useProgram(depthProgram);
	gl.uniform1i(depthBufferLocation, 6);

	gl.useProgram(noSSAOProgram);
	gl.uniform1i(noSSAOColorBufferLocation, 2);

	function draw(now) {
		if (!lastTime) { lastTime = now; }
		var dt = (now - lastTime)/1000.0;
		////////////////////
		// DRAW BOXES
		////////////////////

		var speed = 16;

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

		game.update(eyePosition, renderDistance);

		if(!vec3.equals(vec3.floor([], eyePosition), lastPosBlock)) {
			lastPosBlock = vec3.floor([], eyePosition);
			game.updateTransparentMeshes(lastPosBlock);
		}
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, colorGeoBuffer);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(colorGeoProgram);

		var viewMatrix = calculateViewMatrix();
		
		var sceneUniformData = new Float32Array(40);
		sceneUniformData.set(viewMatrix);
		sceneUniformData.set(projMatrix, 16);
		sceneUniformData.set(eyePosition, 32);
		sceneUniformData.set(lightDirection, 36);

		gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, sceneUniformBuffer);
		gl.bufferData(gl.UNIFORM_BUFFER, sceneUniformData, gl.STATIC_DRAW);

		game.render();

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
		
		gl.useProgram(depthProgram);
		gl.depthFunc(gl.ALWAYS);
		gl.depthMask(true);
		gl.colorMask(false, false, false, false);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
		gl.colorMask(true, true, true, true);
		gl.depthFunc(gl.LESS);
		
		gl.useProgram(transparentProgram);
		gl.depthMask(false);
		gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, transparentSceneUniformBuffer);
		gl.bufferData(gl.UNIFORM_BUFFER, sceneUniformData, gl.STATIC_DRAW);
		game.renderTransparent();
		gl.depthMask(true);

		requestAnimationFrame(draw);
		lastTime = now;
	}

	requestAnimationFrame(draw);
}

main();
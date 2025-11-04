const canvas = document.getElementById("canvas");
canvas.width = 600;
canvas.height = 400;

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
gl.clearColor(0.0, 0.0, 0.0, 1.0)
gl.enable(gl.DEPTH_TEST);

var NEAR = 0.1;
var FAR = 100.0;

const allLetters = ['assets/letters/A.png', 'assets/letters/B.png', 'assets/letters/C.png', 'assets/letters/D.png', 'assets/letters/E.png', 'assets/letters/F.png', 'assets/letters/G.png', 'assets/letters/H.png', 'assets/letters/I.png', 'assets/letters/J.png', 'assets/letters/K.png', 'assets/letters/L.png', 'assets/letters/M.png', 'assets/letters/N.png', 'assets/letters/O.png', 'assets/letters/P.png', 'assets/letters/Q.png', 'assets/letters/R.png', 'assets/letters/S.png', 'assets/letters/T.png', 'assets/letters/U.png', 'assets/letters/V.png', 'assets/letters/W.png', 'assets/letters/X.png', 'assets/letters/Y.png', 'assets/letters/Z.png', 'assets/letters/a.png', 'assets/letters/b.png', 'assets/letters/c.png', 'assets/letters/d.png', 'assets/letters/e.png', 'assets/letters/f.png', 'assets/letters/g.png', 'assets/letters/h.png', 'assets/letters/i.png', 'assets/letters/j.png', 'assets/letters/k.png', 'assets/letters/l.png', 'assets/letters/m.png', 'assets/letters/n.png', 'assets/letters/o.png', 'assets/letters/p.png', 'assets/letters/q.png', 'assets/letters/r.png', 'assets/letters/s.png', 'assets/letters/t.png', 'assets/letters/u.png', 'assets/letters/v.png', 'assets/letters/w.png', 'assets/letters/x.png', 'assets/letters/y.png', 'assets/letters/z.png', 'assets/letters/Α.png', 'assets/letters/Β.png', 'assets/letters/Γ.png', 'assets/letters/Δ.png', 'assets/letters/Ε.png', 'assets/letters/Ζ.png', 'assets/letters/Η.png', 'assets/letters/Θ.png', 'assets/letters/Ι.png', 'assets/letters/Κ.png', 'assets/letters/Λ.png', 'assets/letters/Μ.png', 'assets/letters/Ν.png', 'assets/letters/Ξ.png', 'assets/letters/Ο.png', 'assets/letters/Π.png', 'assets/letters/Ρ.png', 'assets/letters/Σ.png', 'assets/letters/Τ.png', 'assets/letters/Υ.png', 'assets/letters/Φ.png', 'assets/letters/Χ.png', 'assets/letters/Ψ.png', 'assets/letters/Ω.png', 'assets/letters/α.png', 'assets/letters/β.png', 'assets/letters/γ.png', 'assets/letters/δ.png', 'assets/letters/ε.png', 'assets/letters/ζ.png', 'assets/letters/η.png', 'assets/letters/θ.png', 'assets/letters/ι.png', 'assets/letters/κ.png', 'assets/letters/λ.png', 'assets/letters/μ.png', 'assets/letters/ν.png', 'assets/letters/ξ.png', 'assets/letters/ο.png', 'assets/letters/π.png', 'assets/letters/ρ.png', 'assets/letters/σ.png', 'assets/letters/τ.png', 'assets/letters/υ.png', 'assets/letters/φ.png', 'assets/letters/χ.png', 'assets/letters/ψ.png', 'assets/letters/ω.png', 'assets/letters/А.png', 'assets/letters/Б.png', 'assets/letters/В.png', 'assets/letters/Г.png', 'assets/letters/Д.png', 'assets/letters/Е.png', 'assets/letters/Ё.png', 'assets/letters/Ж.png', 'assets/letters/З.png', 'assets/letters/И.png', 'assets/letters/Й.png', 'assets/letters/К.png', 'assets/letters/Л.png', 'assets/letters/М.png', 'assets/letters/Н.png', 'assets/letters/О.png', 'assets/letters/П.png', 'assets/letters/Р.png', 'assets/letters/С.png', 'assets/letters/Т.png', 'assets/letters/У.png', 'assets/letters/Ф.png', 'assets/letters/Х.png', 'assets/letters/Ц.png', 'assets/letters/Ч.png', 'assets/letters/Ш.png', 'assets/letters/Щ.png', 'assets/letters/Ъ.png', 'assets/letters/Ы.png', 'assets/letters/Ь.png', 'assets/letters/Э.png', 'assets/letters/Ю.png', 'assets/letters/Я.png', 'assets/letters/а.png', 'assets/letters/б.png', 'assets/letters/в.png', 'assets/letters/г.png', 'assets/letters/д.png', 'assets/letters/е.png', 'assets/letters/ё.png', 'assets/letters/ж.png', 'assets/letters/з.png', 'assets/letters/и.png', 'assets/letters/й.png', 'assets/letters/к.png', 'assets/letters/л.png', 'assets/letters/м.png', 'assets/letters/н.png', 'assets/letters/о.png', 'assets/letters/п.png', 'assets/letters/р.png', 'assets/letters/с.png', 'assets/letters/т.png', 'assets/letters/у.png', 'assets/letters/ф.png', 'assets/letters/х.png', 'assets/letters/ц.png', 'assets/letters/ч.png', 'assets/letters/ш.png', 'assets/letters/щ.png', 'assets/letters/ъ.png', 'assets/letters/ы.png', 'assets/letters/ь.png', 'assets/letters/э.png', 'assets/letters/ю.png', 'assets/letters/я.png'];

var NUM_SPHERES = allLetters.length;
var spheres = new Array(NUM_SPHERES);

var modelMatrixData = new Float32Array(NUM_SPHERES * 16);

for (var i = 0; i < NUM_SPHERES; ++i) {
    spheres[i] = {
        scale: [1, 1, 1],
        rotate: [0, 0, 0], // Will be used for global rotation
        translate: [0, 0, 0],
        modelMatrix: mat4.create()
    };
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
var timeLocation = gl.getUniformLocation(colorGeoProgram, "uTime");

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

var sphere = utils.createPlane({size: [1, 5], resolution: [20, 1], position: [0.5, 0, 0]});
var numVertices = sphere.positions.length / 3;

var sphereArray = gl.createVertexArray();
gl.bindVertexArray(sphereArray);

var positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(0);

var uvBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
gl.bufferData(gl.ARRAY_BUFFER, sphere.uvs, gl.STATIC_DRAW);
gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(1);

var normalBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.bufferData(gl.ARRAY_BUFFER, sphere.normals, gl.STATIC_DRAW);
gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(2);

// Columns of matrix as separate attributes for instancing
var matrixBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, matrixBuffer);
gl.bufferData(gl.ARRAY_BUFFER, modelMatrixData, gl.DYNAMIC_DRAW);
gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 64, 0);
gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 64, 16);
gl.vertexAttribPointer(6, 4, gl.FLOAT, false, 64, 32);
gl.vertexAttribPointer(7, 4, gl.FLOAT, false, 64, 48);

gl.vertexAttribDivisor(4, 1);
gl.vertexAttribDivisor(5, 1);
gl.vertexAttribDivisor(6, 1);
gl.vertexAttribDivisor(7, 1);

gl.enableVertexAttribArray(4);
gl.enableVertexAttribArray(5);
gl.enableVertexAttribArray(6);
gl.enableVertexAttribArray(7);

var indices = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

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

var viewMatrix = mat4.create();
var eyePosition = vec3.fromValues(0, 6, 4);
mat4.lookAt(viewMatrix, eyePosition, vec3.fromValues(0, 2, 0), vec3.fromValues(0, 1, 0));

var viewProjMatrix = mat4.create();
mat4.multiply(viewProjMatrix, projMatrix, viewMatrix);

var lightPosition = vec3.fromValues(0, 6, 0);

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
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);

  return texture;
}

const maxLayers = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS);
console.log(allLetters.length + '/' + maxLayers);

async function main() {
	var textureArray = await createTextureArray(gl, allLetters);
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

	gl.useProgram(ssaoProgram);
	gl.uniform1i(positionBufferLocation, 3);
	gl.uniform1i(normalBufferLocation, 4);
	gl.uniform1i(noiseBufferLocation, 1);

	gl.useProgram(aoBlendProgram);
	gl.uniform1i(colorBufferLocation, 2);
	gl.uniform1i(occlustionBufferLocation, 5);

	gl.useProgram(noSSAOProgram);
	gl.uniform1i(noSSAOColorBufferLocation, 2);

	function draw(timestamp) {
		////////////////////
		// DRAW BOXES
		////////////////////

		gl.bindFramebuffer(gl.FRAMEBUFFER, colorGeoBuffer);
		gl.useProgram(colorGeoProgram);
		gl.bindVertexArray(sphereArray);

		gl.uniform1f(timeLocation, timestamp / 1000);

		for (var i = 0, len = spheres.length; i < len; ++i) {
			utils.xformMatrix(spheres[i].modelMatrix, spheres[i].translate, null, spheres[i].scale);
			mat4.fromYRotation(rotationMatrix, spheres[i].rotate[1]);
			mat4.multiply(spheres[i].modelMatrix, rotationMatrix, spheres[i].modelMatrix);

			modelMatrixData.set(spheres[i].modelMatrix, i * 16);
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, matrixBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, modelMatrixData);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.drawElementsInstanced(gl.TRIANGLES, sphere.indices.length, gl.UNSIGNED_SHORT, 0, spheres.length);

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
	}

	requestAnimationFrame(draw);
}

main();
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

var NUM_SPHERES = 1012;
var NUM_PER_ROW = 8;
var RADIUS = 0.6;
var spheres = new Array(NUM_SPHERES);

var modelMatrixData = new Float32Array(NUM_SPHERES * 16);

for (var i = 0; i < NUM_SPHERES; ++i) {
    var angle = 2 * Math.PI * (i % NUM_PER_ROW) / NUM_PER_ROW;
    var x = Math.sin(angle) * RADIUS;
    var y = Math.floor(i / NUM_PER_ROW) / (NUM_PER_ROW / 4) - 0.75;
    var z = Math.cos(angle) * RADIUS;
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

const allPokemon = ['assets/pokemon_artwork/abomasnow.png', 'assets/pokemon_artwork/abra.png', 'assets/pokemon_artwork/absol.png', 'assets/pokemon_artwork/accelgor.png', 'assets/pokemon_artwork/aegislash.png', 'assets/pokemon_artwork/aerodactyl.png', 'assets/pokemon_artwork/aggron.png', 'assets/pokemon_artwork/aipom.png', 'assets/pokemon_artwork/alakazam.png', 'assets/pokemon_artwork/alcremie.png', 'assets/pokemon_artwork/alomomola.png', 'assets/pokemon_artwork/altaria.png', 'assets/pokemon_artwork/amaura.png', 'assets/pokemon_artwork/ambipom.png', 'assets/pokemon_artwork/amoonguss.png', 'assets/pokemon_artwork/ampharos.png', 'assets/pokemon_artwork/annihilape.png', 'assets/pokemon_artwork/anorith.png', 'assets/pokemon_artwork/appletun.png', 'assets/pokemon_artwork/applin.png', 'assets/pokemon_artwork/araquanid.png', 'assets/pokemon_artwork/arbok.png', 'assets/pokemon_artwork/arboliva.png', 'assets/pokemon_artwork/arcanine.png', 'assets/pokemon_artwork/arceus.png', 'assets/pokemon_artwork/archaludon.png', 'assets/pokemon_artwork/archen.png', 'assets/pokemon_artwork/archeops.png', 'assets/pokemon_artwork/arctibax.png', 'assets/pokemon_artwork/arctovish.png', 'assets/pokemon_artwork/arctozolt.png', 'assets/pokemon_artwork/ariados.png', 'assets/pokemon_artwork/armaldo.png', 'assets/pokemon_artwork/armarouge.png', 'assets/pokemon_artwork/aromatisse.png', 'assets/pokemon_artwork/aron.png', 'assets/pokemon_artwork/arrokuda.png', 'assets/pokemon_artwork/articuno.png', 'assets/pokemon_artwork/audino.png', 'assets/pokemon_artwork/aurorus.png', 'assets/pokemon_artwork/avalugg.png', 'assets/pokemon_artwork/axew.png', 'assets/pokemon_artwork/azelf.png', 'assets/pokemon_artwork/azumarill.png', 'assets/pokemon_artwork/azurill.png', 'assets/pokemon_artwork/bagon.png', 'assets/pokemon_artwork/baltoy.png', 'assets/pokemon_artwork/banette.png', 'assets/pokemon_artwork/barbaracle.png', 'assets/pokemon_artwork/barboach.png', 'assets/pokemon_artwork/barraskewda.png', 'assets/pokemon_artwork/basculegion.png', 'assets/pokemon_artwork/basculin.png', 'assets/pokemon_artwork/bastiodon.png', 'assets/pokemon_artwork/baxcalibur.png', 'assets/pokemon_artwork/bayleef.png', 'assets/pokemon_artwork/beartic.png', 'assets/pokemon_artwork/beautifly.png', 'assets/pokemon_artwork/beedrill.png', 'assets/pokemon_artwork/beheeyem.png', 'assets/pokemon_artwork/beldum.png', 'assets/pokemon_artwork/bellibolt.png', 'assets/pokemon_artwork/bellossom.png', 'assets/pokemon_artwork/bellsprout.png', 'assets/pokemon_artwork/bergmite.png', 'assets/pokemon_artwork/bewear.png', 'assets/pokemon_artwork/bibarel.png', 'assets/pokemon_artwork/bidoof.png', 'assets/pokemon_artwork/binacle.png', 'assets/pokemon_artwork/bisharp.png', 'assets/pokemon_artwork/blacephalon.png', 'assets/pokemon_artwork/blastoise.png', 'assets/pokemon_artwork/blaziken.png', 'assets/pokemon_artwork/blipbug.png', 'assets/pokemon_artwork/blissey.png', 'assets/pokemon_artwork/blitzle.png', 'assets/pokemon_artwork/boldore.png', 'assets/pokemon_artwork/boltund.png', 'assets/pokemon_artwork/bombirdier.png', 'assets/pokemon_artwork/bonsly.png', 'assets/pokemon_artwork/bouffalant.png', 'assets/pokemon_artwork/bounsweet.png', 'assets/pokemon_artwork/braixen.png', 'assets/pokemon_artwork/brambleghast.png', 'assets/pokemon_artwork/bramblin.png', 'assets/pokemon_artwork/braviary.png', 'assets/pokemon_artwork/breloom.png', 'assets/pokemon_artwork/brionne.png', 'assets/pokemon_artwork/bronzong.png', 'assets/pokemon_artwork/bronzor.png', 'assets/pokemon_artwork/brute-bonnet.png', 'assets/pokemon_artwork/bruxish.png', 'assets/pokemon_artwork/budew.png', 'assets/pokemon_artwork/buizel.png', 'assets/pokemon_artwork/bulbasaur.png', 'assets/pokemon_artwork/buneary.png', 'assets/pokemon_artwork/bunnelby.png', 'assets/pokemon_artwork/burmy.png', 'assets/pokemon_artwork/butterfree.png', 'assets/pokemon_artwork/buzzwole.png', 'assets/pokemon_artwork/cacnea.png', 'assets/pokemon_artwork/cacturne.png', 'assets/pokemon_artwork/calyrex.png', 'assets/pokemon_artwork/camerupt.png', 'assets/pokemon_artwork/capsakid.png', 'assets/pokemon_artwork/carbink.png', 'assets/pokemon_artwork/carkol.png', 'assets/pokemon_artwork/carnivine.png', 'assets/pokemon_artwork/carracosta.png', 'assets/pokemon_artwork/carvanha.png', 'assets/pokemon_artwork/cascoon.png', 'assets/pokemon_artwork/castform.png', 'assets/pokemon_artwork/caterpie.png', 'assets/pokemon_artwork/celebi.png', 'assets/pokemon_artwork/celesteela.png', 'assets/pokemon_artwork/centiskorch.png', 'assets/pokemon_artwork/ceruledge.png', 'assets/pokemon_artwork/cetitan.png', 'assets/pokemon_artwork/cetoddle.png', 'assets/pokemon_artwork/chandelure.png', 'assets/pokemon_artwork/chansey.png', 'assets/pokemon_artwork/charcadet.png', 'assets/pokemon_artwork/charizard.png', 'assets/pokemon_artwork/charjabug.png', 'assets/pokemon_artwork/charmander.png', 'assets/pokemon_artwork/charmeleon.png', 'assets/pokemon_artwork/chatot.png', 'assets/pokemon_artwork/cherrim.png', 'assets/pokemon_artwork/cherubi.png', 'assets/pokemon_artwork/chesnaught.png', 'assets/pokemon_artwork/chespin.png', 'assets/pokemon_artwork/chewtle.png', 'assets/pokemon_artwork/chi-yu.png', 'assets/pokemon_artwork/chien-pao.png', 'assets/pokemon_artwork/chikorita.png', 'assets/pokemon_artwork/chimchar.png', 'assets/pokemon_artwork/chimecho.png', 'assets/pokemon_artwork/chinchou.png', 'assets/pokemon_artwork/chingling.png', 'assets/pokemon_artwork/cinccino.png', 'assets/pokemon_artwork/cinderace.png', 'assets/pokemon_artwork/clamperl.png', 'assets/pokemon_artwork/clauncher.png', 'assets/pokemon_artwork/clawitzer.png', 'assets/pokemon_artwork/claydol.png', 'assets/pokemon_artwork/clefable.png', 'assets/pokemon_artwork/clefairy.png', 'assets/pokemon_artwork/cleffa.png', 'assets/pokemon_artwork/clobbopus.png', 'assets/pokemon_artwork/clodsire.png', 'assets/pokemon_artwork/cloyster.png', 'assets/pokemon_artwork/coalossal.png', 'assets/pokemon_artwork/cobalion.png', 'assets/pokemon_artwork/cofagrigus.png', 'assets/pokemon_artwork/combee.png', 'assets/pokemon_artwork/combusken.png', 'assets/pokemon_artwork/comfey.png', 'assets/pokemon_artwork/conkeldurr.png', 'assets/pokemon_artwork/copperajah.png', 'assets/pokemon_artwork/corphish.png', 'assets/pokemon_artwork/corsola.png', 'assets/pokemon_artwork/corviknight.png', 'assets/pokemon_artwork/corvisquire.png', 'assets/pokemon_artwork/cosmoem.png', 'assets/pokemon_artwork/cosmog.png', 'assets/pokemon_artwork/cottonee.png', 'assets/pokemon_artwork/crabominable.png', 'assets/pokemon_artwork/crabrawler.png', 'assets/pokemon_artwork/cradily.png', 'assets/pokemon_artwork/cramorant.png', 'assets/pokemon_artwork/cranidos.png', 'assets/pokemon_artwork/crawdaunt.png', 'assets/pokemon_artwork/cresselia.png', 'assets/pokemon_artwork/croagunk.png', 'assets/pokemon_artwork/crobat.png', 'assets/pokemon_artwork/crocalor.png', 'assets/pokemon_artwork/croconaw.png', 'assets/pokemon_artwork/crustle.png', 'assets/pokemon_artwork/cryogonal.png', 'assets/pokemon_artwork/cubchoo.png', 'assets/pokemon_artwork/cubone.png', 'assets/pokemon_artwork/cufant.png', 'assets/pokemon_artwork/cursola.png', 'assets/pokemon_artwork/cutiefly.png', 'assets/pokemon_artwork/cyclizar.png', 'assets/pokemon_artwork/cyndaquil.png', 'assets/pokemon_artwork/dachsbun.png', 'assets/pokemon_artwork/darkrai.png', 'assets/pokemon_artwork/darmanitan.png', 'assets/pokemon_artwork/dartrix.png', 'assets/pokemon_artwork/darumaka.png', 'assets/pokemon_artwork/decidueye.png', 'assets/pokemon_artwork/dedenne.png', 'assets/pokemon_artwork/deerling.png', 'assets/pokemon_artwork/deino.png', 'assets/pokemon_artwork/delcatty.png', 'assets/pokemon_artwork/delibird.png', 'assets/pokemon_artwork/delphox.png', 'assets/pokemon_artwork/deoxys.png', 'assets/pokemon_artwork/dewgong.png', 'assets/pokemon_artwork/dewott.png', 'assets/pokemon_artwork/dewpider.png', 'assets/pokemon_artwork/dhelmise.png', 'assets/pokemon_artwork/dialga.png', 'assets/pokemon_artwork/diancie.png', 'assets/pokemon_artwork/diggersby.png', 'assets/pokemon_artwork/diglett.png', 'assets/pokemon_artwork/dipplin.png', 'assets/pokemon_artwork/ditto.png', 'assets/pokemon_artwork/dodrio.png', 'assets/pokemon_artwork/doduo.png', 'assets/pokemon_artwork/dolliv.png', 'assets/pokemon_artwork/dondozo.png', 'assets/pokemon_artwork/donphan.png', 'assets/pokemon_artwork/dottler.png', 'assets/pokemon_artwork/doublade.png', 'assets/pokemon_artwork/dracovish.png', 'assets/pokemon_artwork/dracozolt.png', 'assets/pokemon_artwork/dragalge.png', 'assets/pokemon_artwork/dragapult.png', 'assets/pokemon_artwork/dragonair.png', 'assets/pokemon_artwork/dragonite.png', 'assets/pokemon_artwork/drakloak.png', 'assets/pokemon_artwork/drampa.png', 'assets/pokemon_artwork/drapion.png', 'assets/pokemon_artwork/dratini.png', 'assets/pokemon_artwork/drednaw.png', 'assets/pokemon_artwork/dreepy.png', 'assets/pokemon_artwork/drifblim.png', 'assets/pokemon_artwork/drifloon.png', 'assets/pokemon_artwork/drilbur.png', 'assets/pokemon_artwork/drizzile.png', 'assets/pokemon_artwork/drowzee.png', 'assets/pokemon_artwork/druddigon.png', 'assets/pokemon_artwork/dubwool.png', 'assets/pokemon_artwork/ducklett.png', 'assets/pokemon_artwork/dudunsparce.png', 'assets/pokemon_artwork/dugtrio.png', 'assets/pokemon_artwork/dunsparce.png', 'assets/pokemon_artwork/duosion.png', 'assets/pokemon_artwork/duraludon.png', 'assets/pokemon_artwork/durant.png', 'assets/pokemon_artwork/dusclops.png', 'assets/pokemon_artwork/dusknoir.png', 'assets/pokemon_artwork/duskull.png', 'assets/pokemon_artwork/dustox.png', 'assets/pokemon_artwork/dwebble.png', 'assets/pokemon_artwork/eelektrik.png', 'assets/pokemon_artwork/eelektross.png', 'assets/pokemon_artwork/eevee.png', 'assets/pokemon_artwork/ekans.png', 'assets/pokemon_artwork/eldegoss.png', 'assets/pokemon_artwork/electabuzz.png', 'assets/pokemon_artwork/electivire.png', 'assets/pokemon_artwork/electrike.png', 'assets/pokemon_artwork/electrode.png', 'assets/pokemon_artwork/elekid.png', 'assets/pokemon_artwork/elgyem.png', 'assets/pokemon_artwork/emboar.png', 'assets/pokemon_artwork/emolga.png', 'assets/pokemon_artwork/empoleon.png', 'assets/pokemon_artwork/entei.png', 'assets/pokemon_artwork/escavalier.png', 'assets/pokemon_artwork/espathra.png', 'assets/pokemon_artwork/espeon.png', 'assets/pokemon_artwork/espurr.png', 'assets/pokemon_artwork/eternatus.png', 'assets/pokemon_artwork/excadrill.png', 'assets/pokemon_artwork/exeggcute.png', 'assets/pokemon_artwork/exeggutor.png', 'assets/pokemon_artwork/exploud.png', 'assets/pokemon_artwork/falinks.png', 'assets/pokemon_artwork/farfetchd.png', 'assets/pokemon_artwork/farigiraf.png', 'assets/pokemon_artwork/fearow.png', 'assets/pokemon_artwork/feebas.png', 'assets/pokemon_artwork/fennekin.png', 'assets/pokemon_artwork/feraligatr.png', 'assets/pokemon_artwork/ferroseed.png', 'assets/pokemon_artwork/ferrothorn.png', 'assets/pokemon_artwork/fezandipiti.png', 'assets/pokemon_artwork/fidough.png', 'assets/pokemon_artwork/finizen.png', 'assets/pokemon_artwork/finneon.png', 'assets/pokemon_artwork/flaaffy.png', 'assets/pokemon_artwork/flabebe.png', 'assets/pokemon_artwork/flamigo.png', 'assets/pokemon_artwork/flapple.png', 'assets/pokemon_artwork/flareon.png', 'assets/pokemon_artwork/fletchinder.png', 'assets/pokemon_artwork/fletchling.png', 'assets/pokemon_artwork/flittle.png', 'assets/pokemon_artwork/floatzel.png', 'assets/pokemon_artwork/floette.png', 'assets/pokemon_artwork/floragato.png', 'assets/pokemon_artwork/florges.png', 'assets/pokemon_artwork/flutter-mane.png', 'assets/pokemon_artwork/flygon.png', 'assets/pokemon_artwork/fomantis.png', 'assets/pokemon_artwork/foongus.png', 'assets/pokemon_artwork/forretress.png', 'assets/pokemon_artwork/fraxure.png', 'assets/pokemon_artwork/frigibax.png', 'assets/pokemon_artwork/frillish.png', 'assets/pokemon_artwork/froakie.png', 'assets/pokemon_artwork/frogadier.png', 'assets/pokemon_artwork/froslass.png', 'assets/pokemon_artwork/frosmoth.png', 'assets/pokemon_artwork/fuecoco.png', 'assets/pokemon_artwork/furfrou.png', 'assets/pokemon_artwork/furret.png', 'assets/pokemon_artwork/gabite.png', 'assets/pokemon_artwork/gallade.png', 'assets/pokemon_artwork/galvantula.png', 'assets/pokemon_artwork/garbodor.png', 'assets/pokemon_artwork/garchomp.png', 'assets/pokemon_artwork/gardevoir.png', 'assets/pokemon_artwork/garganacl.png', 'assets/pokemon_artwork/gastly.png', 'assets/pokemon_artwork/gastrodon.png', 'assets/pokemon_artwork/genesect.png', 'assets/pokemon_artwork/gengar.png', 'assets/pokemon_artwork/geodude.png', 'assets/pokemon_artwork/gholdengo.png', 'assets/pokemon_artwork/gible.png', 'assets/pokemon_artwork/gigalith.png', 'assets/pokemon_artwork/gimmighoul.png', 'assets/pokemon_artwork/girafarig.png', 'assets/pokemon_artwork/glaceon.png', 'assets/pokemon_artwork/glalie.png', 'assets/pokemon_artwork/glameow.png', 'assets/pokemon_artwork/glastrier.png', 'assets/pokemon_artwork/gligar.png', 'assets/pokemon_artwork/glimmet.png', 'assets/pokemon_artwork/glimmora.png', 'assets/pokemon_artwork/gliscor.png', 'assets/pokemon_artwork/gloom.png', 'assets/pokemon_artwork/gogoat.png', 'assets/pokemon_artwork/golbat.png', 'assets/pokemon_artwork/goldeen.png', 'assets/pokemon_artwork/golduck.png', 'assets/pokemon_artwork/golem.png', 'assets/pokemon_artwork/golett.png', 'assets/pokemon_artwork/golisopod.png', 'assets/pokemon_artwork/golurk.png', 'assets/pokemon_artwork/goodra.png', 'assets/pokemon_artwork/goomy.png', 'assets/pokemon_artwork/gorebyss.png', 'assets/pokemon_artwork/gossifleur.png', 'assets/pokemon_artwork/gothita.png', 'assets/pokemon_artwork/gothitelle.png', 'assets/pokemon_artwork/gothorita.png', 'assets/pokemon_artwork/gourgeist.png', 'assets/pokemon_artwork/grafaiai.png', 'assets/pokemon_artwork/granbull.png', 'assets/pokemon_artwork/grapploct.png', 'assets/pokemon_artwork/graveler.png', 'assets/pokemon_artwork/great-tusk.png', 'assets/pokemon_artwork/greavard.png', 'assets/pokemon_artwork/greedent.png', 'assets/pokemon_artwork/greninja.png', 'assets/pokemon_artwork/grimer.png', 'assets/pokemon_artwork/grimmsnarl.png', 'assets/pokemon_artwork/grookey.png', 'assets/pokemon_artwork/grotle.png', 'assets/pokemon_artwork/groudon.png', 'assets/pokemon_artwork/grovyle.png', 'assets/pokemon_artwork/growlithe.png', 'assets/pokemon_artwork/grubbin.png', 'assets/pokemon_artwork/grumpig.png', 'assets/pokemon_artwork/gulpin.png', 'assets/pokemon_artwork/gumshoos.png', 'assets/pokemon_artwork/gurdurr.png', 'assets/pokemon_artwork/guzzlord.png', 'assets/pokemon_artwork/gyarados.png', 'assets/pokemon_artwork/hakamo-o.png', 'assets/pokemon_artwork/happiny.png', 'assets/pokemon_artwork/hariyama.png', 'assets/pokemon_artwork/hatenna.png', 'assets/pokemon_artwork/hatterene.png', 'assets/pokemon_artwork/hattrem.png', 'assets/pokemon_artwork/haunter.png', 'assets/pokemon_artwork/hawlucha.png', 'assets/pokemon_artwork/haxorus.png', 'assets/pokemon_artwork/heatmor.png', 'assets/pokemon_artwork/heatran.png', 'assets/pokemon_artwork/heliolisk.png', 'assets/pokemon_artwork/helioptile.png', 'assets/pokemon_artwork/heracross.png', 'assets/pokemon_artwork/herdier.png', 'assets/pokemon_artwork/hippopotas.png', 'assets/pokemon_artwork/hippowdon.png', 'assets/pokemon_artwork/hitmonchan.png', 'assets/pokemon_artwork/hitmonlee.png', 'assets/pokemon_artwork/hitmontop.png', 'assets/pokemon_artwork/ho-oh.png', 'assets/pokemon_artwork/honchkrow.png', 'assets/pokemon_artwork/honedge.png', 'assets/pokemon_artwork/hoopa.png', 'assets/pokemon_artwork/hoothoot.png', 'assets/pokemon_artwork/hoppip.png', 'assets/pokemon_artwork/horsea.png', 'assets/pokemon_artwork/houndoom.png', 'assets/pokemon_artwork/houndour.png', 'assets/pokemon_artwork/houndstone.png', 'assets/pokemon_artwork/huntail.png', 'assets/pokemon_artwork/hydreigon.png', 'assets/pokemon_artwork/hypno.png', 'assets/pokemon_artwork/igglybuff.png', 'assets/pokemon_artwork/illumise.png', 'assets/pokemon_artwork/impidimp.png', 'assets/pokemon_artwork/incineroar.png', 'assets/pokemon_artwork/indeedee.png', 'assets/pokemon_artwork/infernape.png', 'assets/pokemon_artwork/inkay.png', 'assets/pokemon_artwork/inteleon.png', 'assets/pokemon_artwork/iron-bundle.png', 'assets/pokemon_artwork/iron-crown.png', 'assets/pokemon_artwork/iron-hands.png', 'assets/pokemon_artwork/iron-jugulis.png', 'assets/pokemon_artwork/iron-leaves.png', 'assets/pokemon_artwork/iron-moth.png', 'assets/pokemon_artwork/iron-thorns.png', 'assets/pokemon_artwork/iron-treads.png', 'assets/pokemon_artwork/iron-valiant.png', 'assets/pokemon_artwork/ivysaur.png', 'assets/pokemon_artwork/jangmo-o.png', 'assets/pokemon_artwork/jellicent.png', 'assets/pokemon_artwork/jigglypuff.png', 'assets/pokemon_artwork/jirachi.png', 'assets/pokemon_artwork/jolteon.png', 'assets/pokemon_artwork/joltik.png', 'assets/pokemon_artwork/jumpluff.png', 'assets/pokemon_artwork/jynx.png', 'assets/pokemon_artwork/kabuto.png', 'assets/pokemon_artwork/kabutops.png', 'assets/pokemon_artwork/kadabra.png', 'assets/pokemon_artwork/kakuna.png', 'assets/pokemon_artwork/kangaskhan.png', 'assets/pokemon_artwork/karrablast.png', 'assets/pokemon_artwork/kartana.png', 'assets/pokemon_artwork/kecleon.png', 'assets/pokemon_artwork/keldeo.png', 'assets/pokemon_artwork/kilowattrel.png', 'assets/pokemon_artwork/kingambit.png', 'assets/pokemon_artwork/kingdra.png', 'assets/pokemon_artwork/kingler.png', 'assets/pokemon_artwork/kirlia.png', 'assets/pokemon_artwork/klang.png', 'assets/pokemon_artwork/klawf.png', 'assets/pokemon_artwork/kleavor.png', 'assets/pokemon_artwork/klefki.png', 'assets/pokemon_artwork/klink.png', 'assets/pokemon_artwork/klinklang.png', 'assets/pokemon_artwork/koffing.png', 'assets/pokemon_artwork/komala.png', 'assets/pokemon_artwork/kommo-o.png', 'assets/pokemon_artwork/koraidon.png', 'assets/pokemon_artwork/krabby.png', 'assets/pokemon_artwork/kricketot.png', 'assets/pokemon_artwork/kricketune.png', 'assets/pokemon_artwork/krokorok.png', 'assets/pokemon_artwork/krookodile.png', 'assets/pokemon_artwork/kubfu.png', 'assets/pokemon_artwork/kyogre.png', 'assets/pokemon_artwork/kyurem.png', 'assets/pokemon_artwork/lairon.png', 'assets/pokemon_artwork/lampent.png', 'assets/pokemon_artwork/landorus.png', 'assets/pokemon_artwork/lanturn.png', 'assets/pokemon_artwork/lapras.png', 'assets/pokemon_artwork/larvesta.png', 'assets/pokemon_artwork/larvitar.png', 'assets/pokemon_artwork/latias.png', 'assets/pokemon_artwork/latios.png', 'assets/pokemon_artwork/leafeon.png', 'assets/pokemon_artwork/leavanny.png', 'assets/pokemon_artwork/lechonk.png', 'assets/pokemon_artwork/ledian.png', 'assets/pokemon_artwork/ledyba.png', 'assets/pokemon_artwork/lickilicky.png', 'assets/pokemon_artwork/lickitung.png', 'assets/pokemon_artwork/liepard.png', 'assets/pokemon_artwork/lileep.png', 'assets/pokemon_artwork/lilligant.png', 'assets/pokemon_artwork/lillipup.png', 'assets/pokemon_artwork/linoone.png', 'assets/pokemon_artwork/litleo.png', 'assets/pokemon_artwork/litten.png', 'assets/pokemon_artwork/litwick.png', 'assets/pokemon_artwork/lokix.png', 'assets/pokemon_artwork/lombre.png', 'assets/pokemon_artwork/lopunny.png', 'assets/pokemon_artwork/lotad.png', 'assets/pokemon_artwork/loudred.png', 'assets/pokemon_artwork/lucario.png', 'assets/pokemon_artwork/ludicolo.png', 'assets/pokemon_artwork/lugia.png', 'assets/pokemon_artwork/lumineon.png', 'assets/pokemon_artwork/lunala.png', 'assets/pokemon_artwork/lunatone.png', 'assets/pokemon_artwork/lurantis.png', 'assets/pokemon_artwork/luvdisc.png', 'assets/pokemon_artwork/luxio.png', 'assets/pokemon_artwork/luxray.png', 'assets/pokemon_artwork/mabosstiff.png', 'assets/pokemon_artwork/machamp.png', 'assets/pokemon_artwork/machoke.png', 'assets/pokemon_artwork/machop.png', 'assets/pokemon_artwork/magby.png', 'assets/pokemon_artwork/magcargo.png', 'assets/pokemon_artwork/magearna.png', 'assets/pokemon_artwork/magikarp.png', 'assets/pokemon_artwork/magmar.png', 'assets/pokemon_artwork/magmortar.png', 'assets/pokemon_artwork/magnemite.png', 'assets/pokemon_artwork/magneton.png', 'assets/pokemon_artwork/magnezone.png', 'assets/pokemon_artwork/makuhita.png', 'assets/pokemon_artwork/malamar.png', 'assets/pokemon_artwork/mamoswine.png', 'assets/pokemon_artwork/manaphy.png', 'assets/pokemon_artwork/mandibuzz.png', 'assets/pokemon_artwork/manectric.png', 'assets/pokemon_artwork/mankey.png', 'assets/pokemon_artwork/mantine.png', 'assets/pokemon_artwork/mantyke.png', 'assets/pokemon_artwork/maractus.png', 'assets/pokemon_artwork/mareanie.png', 'assets/pokemon_artwork/mareep.png', 'assets/pokemon_artwork/marill.png', 'assets/pokemon_artwork/marowak.png', 'assets/pokemon_artwork/marshadow.png', 'assets/pokemon_artwork/marshtomp.png', 'assets/pokemon_artwork/maschiff.png', 'assets/pokemon_artwork/masquerain.png', 'assets/pokemon_artwork/maushold.png', 'assets/pokemon_artwork/mawile.png', 'assets/pokemon_artwork/medicham.png', 'assets/pokemon_artwork/meditite.png', 'assets/pokemon_artwork/meganium.png', 'assets/pokemon_artwork/melmetal.png', 'assets/pokemon_artwork/meloetta.png', 'assets/pokemon_artwork/meltan.png', 'assets/pokemon_artwork/meowscarada.png', 'assets/pokemon_artwork/meowstic.png', 'assets/pokemon_artwork/meowth.png', 'assets/pokemon_artwork/mesprit.png', 'assets/pokemon_artwork/metagross.png', 'assets/pokemon_artwork/metang.png', 'assets/pokemon_artwork/metapod.png', 'assets/pokemon_artwork/mew.png', 'assets/pokemon_artwork/mewtwo.png', 'assets/pokemon_artwork/mienfoo.png', 'assets/pokemon_artwork/mienshao.png', 'assets/pokemon_artwork/mightyena.png', 'assets/pokemon_artwork/milcery.png', 'assets/pokemon_artwork/milotic.png', 'assets/pokemon_artwork/miltank.png', 'assets/pokemon_artwork/mime-jr.png', 'assets/pokemon_artwork/mimikyu.png', 'assets/pokemon_artwork/minccino.png', 'assets/pokemon_artwork/minior.png', 'assets/pokemon_artwork/minun.png', 'assets/pokemon_artwork/miraidon.png', 'assets/pokemon_artwork/misdreavus.png', 'assets/pokemon_artwork/mismagius.png', 'assets/pokemon_artwork/moltres.png', 'assets/pokemon_artwork/monferno.png', 'assets/pokemon_artwork/morelull.png', 'assets/pokemon_artwork/morgrem.png', 'assets/pokemon_artwork/mothim.png', 'assets/pokemon_artwork/mr-mime.png', 'assets/pokemon_artwork/mr-rime.png', 'assets/pokemon_artwork/mudbray.png', 'assets/pokemon_artwork/mudkip.png', 'assets/pokemon_artwork/mudsdale.png', 'assets/pokemon_artwork/muk.png', 'assets/pokemon_artwork/munchlax.png', 'assets/pokemon_artwork/munkidori.png', 'assets/pokemon_artwork/munna.png', 'assets/pokemon_artwork/murkrow.png', 'assets/pokemon_artwork/musharna.png', 'assets/pokemon_artwork/nacli.png', 'assets/pokemon_artwork/naclstack.png', 'assets/pokemon_artwork/naganadel.png', 'assets/pokemon_artwork/natu.png', 'assets/pokemon_artwork/necrozma.png', 'assets/pokemon_artwork/nickit.png', 'assets/pokemon_artwork/nidoking.png', 'assets/pokemon_artwork/nidoqueen.png', 'assets/pokemon_artwork/nidoran-f.png', 'assets/pokemon_artwork/nidoran-m.png', 'assets/pokemon_artwork/nidorina.png', 'assets/pokemon_artwork/nidorino.png', 'assets/pokemon_artwork/nihilego.png', 'assets/pokemon_artwork/nincada.png', 'assets/pokemon_artwork/ninetales.png', 'assets/pokemon_artwork/ninjask.png', 'assets/pokemon_artwork/noctowl.png', 'assets/pokemon_artwork/noibat.png', 'assets/pokemon_artwork/noivern.png', 'assets/pokemon_artwork/nosepass.png', 'assets/pokemon_artwork/numel.png', 'assets/pokemon_artwork/nuzleaf.png', 'assets/pokemon_artwork/nymble.png', 'assets/pokemon_artwork/obstagoon.png', 'assets/pokemon_artwork/octillery.png', 'assets/pokemon_artwork/oddish.png', 'assets/pokemon_artwork/ogerpon.png', 'assets/pokemon_artwork/oinkologne.png', 'assets/pokemon_artwork/okidogi.png', 'assets/pokemon_artwork/omanyte.png', 'assets/pokemon_artwork/omastar.png', 'assets/pokemon_artwork/onix.png', 'assets/pokemon_artwork/oranguru.png', 'assets/pokemon_artwork/orbeetle.png', 'assets/pokemon_artwork/orthworm.png', 'assets/pokemon_artwork/oshawott.png', 'assets/pokemon_artwork/overqwil.png', 'assets/pokemon_artwork/pachirisu.png', 'assets/pokemon_artwork/palafin.png', 'assets/pokemon_artwork/palkia.png', 'assets/pokemon_artwork/palossand.png', 'assets/pokemon_artwork/palpitoad.png', 'assets/pokemon_artwork/pancham.png', 'assets/pokemon_artwork/pangoro.png', 'assets/pokemon_artwork/panpour.png', 'assets/pokemon_artwork/pansage.png', 'assets/pokemon_artwork/pansear.png', 'assets/pokemon_artwork/paras.png', 'assets/pokemon_artwork/parasect.png', 'assets/pokemon_artwork/passimian.png', 'assets/pokemon_artwork/patrat.png', 'assets/pokemon_artwork/pawmi.png', 'assets/pokemon_artwork/pawmo.png', 'assets/pokemon_artwork/pawmot.png', 'assets/pokemon_artwork/pawniard.png', 'assets/pokemon_artwork/pecharunt.png', 'assets/pokemon_artwork/pelipper.png', 'assets/pokemon_artwork/perrserker.png', 'assets/pokemon_artwork/persian.png', 'assets/pokemon_artwork/petilil.png', 'assets/pokemon_artwork/phanpy.png', 'assets/pokemon_artwork/phantump.png', 'assets/pokemon_artwork/pheromosa.png', 'assets/pokemon_artwork/phione.png', 'assets/pokemon_artwork/pichu.png', 'assets/pokemon_artwork/pidgeot.png', 'assets/pokemon_artwork/pidgeotto.png', 'assets/pokemon_artwork/pidgey.png', 'assets/pokemon_artwork/pidove.png', 'assets/pokemon_artwork/pignite.png', 'assets/pokemon_artwork/pikachu.png', 'assets/pokemon_artwork/pikipek.png', 'assets/pokemon_artwork/piloswine.png', 'assets/pokemon_artwork/pincurchin.png', 'assets/pokemon_artwork/pineco.png', 'assets/pokemon_artwork/pinsir.png', 'assets/pokemon_artwork/piplup.png', 'assets/pokemon_artwork/plusle.png', 'assets/pokemon_artwork/poipole.png', 'assets/pokemon_artwork/politoed.png', 'assets/pokemon_artwork/poliwag.png', 'assets/pokemon_artwork/poliwhirl.png', 'assets/pokemon_artwork/poliwrath.png', 'assets/pokemon_artwork/poltchageist.png', 'assets/pokemon_artwork/polteageist.png', 'assets/pokemon_artwork/ponyta.png', 'assets/pokemon_artwork/poochyena.png', 'assets/pokemon_artwork/popplio.png', 'assets/pokemon_artwork/porygon-z.png', 'assets/pokemon_artwork/porygon.png', 'assets/pokemon_artwork/porygon2.png', 'assets/pokemon_artwork/primarina.png', 'assets/pokemon_artwork/primeape.png', 'assets/pokemon_artwork/prinplup.png', 'assets/pokemon_artwork/probopass.png', 'assets/pokemon_artwork/psyduck.png', 'assets/pokemon_artwork/pumpkaboo.png', 'assets/pokemon_artwork/pupitar.png', 'assets/pokemon_artwork/purrloin.png', 'assets/pokemon_artwork/purugly.png', 'assets/pokemon_artwork/pyroar.png', 'assets/pokemon_artwork/pyukumuku.png', 'assets/pokemon_artwork/quagsire.png', 'assets/pokemon_artwork/quaquaval.png', 'assets/pokemon_artwork/quaxly.png', 'assets/pokemon_artwork/quaxwell.png', 'assets/pokemon_artwork/quilava.png', 'assets/pokemon_artwork/quilladin.png', 'assets/pokemon_artwork/qwilfish.png', 'assets/pokemon_artwork/raboot.png', 'assets/pokemon_artwork/rabsca.png', 'assets/pokemon_artwork/raging-bolt.png', 'assets/pokemon_artwork/raichu.png', 'assets/pokemon_artwork/raikou.png', 'assets/pokemon_artwork/ralts.png', 'assets/pokemon_artwork/rampardos.png', 'assets/pokemon_artwork/rapidash.png', 'assets/pokemon_artwork/raticate.png', 'assets/pokemon_artwork/rattata.png', 'assets/pokemon_artwork/rayquaza.png', 'assets/pokemon_artwork/regice.png', 'assets/pokemon_artwork/regidrago.png', 'assets/pokemon_artwork/regieleki.png', 'assets/pokemon_artwork/regigigas.png', 'assets/pokemon_artwork/regirock.png', 'assets/pokemon_artwork/registeel.png', 'assets/pokemon_artwork/relicanth.png', 'assets/pokemon_artwork/rellor.png', 'assets/pokemon_artwork/remoraid.png', 'assets/pokemon_artwork/reshiram.png', 'assets/pokemon_artwork/reuniclus.png', 'assets/pokemon_artwork/revavroom.png', 'assets/pokemon_artwork/rhydon.png', 'assets/pokemon_artwork/rhyhorn.png', 'assets/pokemon_artwork/rhyperior.png', 'assets/pokemon_artwork/ribombee.png', 'assets/pokemon_artwork/rillaboom.png', 'assets/pokemon_artwork/riolu.png', 'assets/pokemon_artwork/roaring-moon.png', 'assets/pokemon_artwork/rockruff.png', 'assets/pokemon_artwork/roggenrola.png', 'assets/pokemon_artwork/rolycoly.png', 'assets/pokemon_artwork/rookidee.png', 'assets/pokemon_artwork/roselia.png', 'assets/pokemon_artwork/roserade.png', 'assets/pokemon_artwork/rotom.png', 'assets/pokemon_artwork/rowlet.png', 'assets/pokemon_artwork/rufflet.png', 'assets/pokemon_artwork/runerigus.png', 'assets/pokemon_artwork/sableye.png', 'assets/pokemon_artwork/salamence.png', 'assets/pokemon_artwork/salandit.png', 'assets/pokemon_artwork/salazzle.png', 'assets/pokemon_artwork/samurott.png', 'assets/pokemon_artwork/sandaconda.png', 'assets/pokemon_artwork/sandile.png', 'assets/pokemon_artwork/sandshrew.png', 'assets/pokemon_artwork/sandslash.png', 'assets/pokemon_artwork/sandy-shocks.png', 'assets/pokemon_artwork/sandygast.png', 'assets/pokemon_artwork/sawk.png', 'assets/pokemon_artwork/sawsbuck.png', 'assets/pokemon_artwork/scatterbug.png', 'assets/pokemon_artwork/sceptile.png', 'assets/pokemon_artwork/scizor.png', 'assets/pokemon_artwork/scolipede.png', 'assets/pokemon_artwork/scorbunny.png', 'assets/pokemon_artwork/scovillain.png', 'assets/pokemon_artwork/scrafty.png', 'assets/pokemon_artwork/scraggy.png', 'assets/pokemon_artwork/scream-tail.png', 'assets/pokemon_artwork/scyther.png', 'assets/pokemon_artwork/seadra.png', 'assets/pokemon_artwork/seaking.png', 'assets/pokemon_artwork/sealeo.png', 'assets/pokemon_artwork/seedot.png', 'assets/pokemon_artwork/seel.png', 'assets/pokemon_artwork/seismitoad.png', 'assets/pokemon_artwork/sentret.png', 'assets/pokemon_artwork/serperior.png', 'assets/pokemon_artwork/servine.png', 'assets/pokemon_artwork/seviper.png', 'assets/pokemon_artwork/sewaddle.png', 'assets/pokemon_artwork/sharpedo.png', 'assets/pokemon_artwork/shedinja.png', 'assets/pokemon_artwork/shelgon.png', 'assets/pokemon_artwork/shellder.png', 'assets/pokemon_artwork/shellos.png', 'assets/pokemon_artwork/shelmet.png', 'assets/pokemon_artwork/shieldon.png', 'assets/pokemon_artwork/shiftry.png', 'assets/pokemon_artwork/shiinotic.png', 'assets/pokemon_artwork/shinx.png', 'assets/pokemon_artwork/shroodle.png', 'assets/pokemon_artwork/shroomish.png', 'assets/pokemon_artwork/shuckle.png', 'assets/pokemon_artwork/shuppet.png', 'assets/pokemon_artwork/sigilyph.png', 'assets/pokemon_artwork/silcoon.png', 'assets/pokemon_artwork/silicobra.png', 'assets/pokemon_artwork/silvally.png', 'assets/pokemon_artwork/simipour.png', 'assets/pokemon_artwork/simisage.png', 'assets/pokemon_artwork/simisear.png', 'assets/pokemon_artwork/sinistea.png', 'assets/pokemon_artwork/sirfetchd.png', 'assets/pokemon_artwork/sizzlipede.png', 'assets/pokemon_artwork/skarmory.png', 'assets/pokemon_artwork/skeledirge.png', 'assets/pokemon_artwork/skiddo.png', 'assets/pokemon_artwork/skiploom.png', 'assets/pokemon_artwork/skitty.png', 'assets/pokemon_artwork/skorupi.png', 'assets/pokemon_artwork/skrelp.png', 'assets/pokemon_artwork/skuntank.png', 'assets/pokemon_artwork/skwovet.png', 'assets/pokemon_artwork/slaking.png', 'assets/pokemon_artwork/slakoth.png', 'assets/pokemon_artwork/sliggoo.png', 'assets/pokemon_artwork/slither-wing.png', 'assets/pokemon_artwork/slowbro.png', 'assets/pokemon_artwork/slowking.png', 'assets/pokemon_artwork/slowpoke.png', 'assets/pokemon_artwork/slugma.png', 'assets/pokemon_artwork/slurpuff.png', 'assets/pokemon_artwork/smeargle.png', 'assets/pokemon_artwork/smoliv.png', 'assets/pokemon_artwork/smoochum.png', 'assets/pokemon_artwork/sneasel.png', 'assets/pokemon_artwork/sneasler.png', 'assets/pokemon_artwork/snivy.png', 'assets/pokemon_artwork/snom.png', 'assets/pokemon_artwork/snorlax.png', 'assets/pokemon_artwork/snorunt.png', 'assets/pokemon_artwork/snover.png', 'assets/pokemon_artwork/snubbull.png', 'assets/pokemon_artwork/sobble.png', 'assets/pokemon_artwork/solgaleo.png', 'assets/pokemon_artwork/solosis.png', 'assets/pokemon_artwork/solrock.png', 'assets/pokemon_artwork/spearow.png', 'assets/pokemon_artwork/spectrier.png', 'assets/pokemon_artwork/spewpa.png', 'assets/pokemon_artwork/spheal.png', 'assets/pokemon_artwork/spidops.png', 'assets/pokemon_artwork/spinarak.png', 'assets/pokemon_artwork/spinda.png', 'assets/pokemon_artwork/spiritomb.png', 'assets/pokemon_artwork/spoink.png', 'assets/pokemon_artwork/sprigatito.png', 'assets/pokemon_artwork/spritzee.png', 'assets/pokemon_artwork/squawkabilly.png', 'assets/pokemon_artwork/squirtle.png', 'assets/pokemon_artwork/stakataka.png', 'assets/pokemon_artwork/stantler.png', 'assets/pokemon_artwork/staraptor.png', 'assets/pokemon_artwork/staravia.png', 'assets/pokemon_artwork/starly.png', 'assets/pokemon_artwork/starmie.png', 'assets/pokemon_artwork/staryu.png', 'assets/pokemon_artwork/steelix.png', 'assets/pokemon_artwork/steenee.png', 'assets/pokemon_artwork/stonjourner.png', 'assets/pokemon_artwork/stoutland.png', 'assets/pokemon_artwork/stufful.png', 'assets/pokemon_artwork/stunfisk.png', 'assets/pokemon_artwork/stunky.png', 'assets/pokemon_artwork/sudowoodo.png', 'assets/pokemon_artwork/suicune.png', 'assets/pokemon_artwork/sunflora.png', 'assets/pokemon_artwork/sunkern.png', 'assets/pokemon_artwork/surskit.png', 'assets/pokemon_artwork/swablu.png', 'assets/pokemon_artwork/swadloon.png', 'assets/pokemon_artwork/swalot.png', 'assets/pokemon_artwork/swampert.png', 'assets/pokemon_artwork/swanna.png', 'assets/pokemon_artwork/swellow.png', 'assets/pokemon_artwork/swinub.png', 'assets/pokemon_artwork/swirlix.png', 'assets/pokemon_artwork/swoobat.png', 'assets/pokemon_artwork/sylveon.png', 'assets/pokemon_artwork/tadbulb.png', 'assets/pokemon_artwork/taillow.png', 'assets/pokemon_artwork/talonflame.png', 'assets/pokemon_artwork/tandemaus.png', 'assets/pokemon_artwork/tangela.png', 'assets/pokemon_artwork/tangrowth.png', 'assets/pokemon_artwork/tapu-bulu.png', 'assets/pokemon_artwork/tapu-fini.png', 'assets/pokemon_artwork/tapu-koko.png', 'assets/pokemon_artwork/tapu-lele.png', 'assets/pokemon_artwork/tarountula.png', 'assets/pokemon_artwork/tatsugiri.png', 'assets/pokemon_artwork/tauros.png', 'assets/pokemon_artwork/teddiursa.png', 'assets/pokemon_artwork/tentacool.png', 'assets/pokemon_artwork/tentacruel.png', 'assets/pokemon_artwork/tepig.png', 'assets/pokemon_artwork/terapagos.png', 'assets/pokemon_artwork/terrakion.png', 'assets/pokemon_artwork/thievul.png', 'assets/pokemon_artwork/throh.png', 'assets/pokemon_artwork/thundurus.png', 'assets/pokemon_artwork/thwackey.png', 'assets/pokemon_artwork/timburr.png', 'assets/pokemon_artwork/ting-lu.png', 'assets/pokemon_artwork/tinkatink.png', 'assets/pokemon_artwork/tinkaton.png', 'assets/pokemon_artwork/tinkatuff.png', 'assets/pokemon_artwork/tirtouga.png', 'assets/pokemon_artwork/toedscool.png', 'assets/pokemon_artwork/toedscruel.png', 'assets/pokemon_artwork/togedemaru.png', 'assets/pokemon_artwork/togekiss.png', 'assets/pokemon_artwork/togepi.png', 'assets/pokemon_artwork/togetic.png', 'assets/pokemon_artwork/torchic.png', 'assets/pokemon_artwork/torkoal.png', 'assets/pokemon_artwork/tornadus.png', 'assets/pokemon_artwork/torracat.png', 'assets/pokemon_artwork/torterra.png', 'assets/pokemon_artwork/totodile.png', 'assets/pokemon_artwork/toucannon.png', 'assets/pokemon_artwork/toxapex.png', 'assets/pokemon_artwork/toxel.png', 'assets/pokemon_artwork/toxicroak.png', 'assets/pokemon_artwork/toxtricity.png', 'assets/pokemon_artwork/tranquill.png', 'assets/pokemon_artwork/trapinch.png', 'assets/pokemon_artwork/treecko.png', 'assets/pokemon_artwork/trevenant.png', 'assets/pokemon_artwork/tropius.png', 'assets/pokemon_artwork/trubbish.png', 'assets/pokemon_artwork/trumbeak.png', 'assets/pokemon_artwork/tsareena.png', 'assets/pokemon_artwork/turtonator.png', 'assets/pokemon_artwork/turtwig.png', 'assets/pokemon_artwork/tympole.png', 'assets/pokemon_artwork/tynamo.png', 'assets/pokemon_artwork/type-null.png', 'assets/pokemon_artwork/typhlosion.png', 'assets/pokemon_artwork/tyranitar.png', 'assets/pokemon_artwork/tyrantrum.png', 'assets/pokemon_artwork/tyrogue.png', 'assets/pokemon_artwork/tyrunt.png', 'assets/pokemon_artwork/umbreon.png', 'assets/pokemon_artwork/unfezant.png', 'assets/pokemon_artwork/unown.png', 'assets/pokemon_artwork/ursaluna.png', 'assets/pokemon_artwork/ursaring.png', 'assets/pokemon_artwork/uxie.png', 'assets/pokemon_artwork/vanillish.png', 'assets/pokemon_artwork/vanillite.png', 'assets/pokemon_artwork/vanilluxe.png', 'assets/pokemon_artwork/vaporeon.png', 'assets/pokemon_artwork/varoom.png', 'assets/pokemon_artwork/veluza.png', 'assets/pokemon_artwork/venipede.png', 'assets/pokemon_artwork/venomoth.png', 'assets/pokemon_artwork/venonat.png', 'assets/pokemon_artwork/venusaur.png', 'assets/pokemon_artwork/vespiquen.png', 'assets/pokemon_artwork/vibrava.png', 'assets/pokemon_artwork/victini.png', 'assets/pokemon_artwork/victreebel.png', 'assets/pokemon_artwork/vigoroth.png', 'assets/pokemon_artwork/vikavolt.png', 'assets/pokemon_artwork/vileplume.png', 'assets/pokemon_artwork/virizion.png', 'assets/pokemon_artwork/vivillon.png', 'assets/pokemon_artwork/volbeat.png', 'assets/pokemon_artwork/volcanion.png', 'assets/pokemon_artwork/volcarona.png', 'assets/pokemon_artwork/voltorb.png', 'assets/pokemon_artwork/vullaby.png', 'assets/pokemon_artwork/vulpix.png', 'assets/pokemon_artwork/wailmer.png', 'assets/pokemon_artwork/wailord.png', 'assets/pokemon_artwork/walking-wake.png', 'assets/pokemon_artwork/walrein.png', 'assets/pokemon_artwork/wartortle.png', 'assets/pokemon_artwork/watchog.png', 'assets/pokemon_artwork/wattrel.png', 'assets/pokemon_artwork/weavile.png', 'assets/pokemon_artwork/weedle.png', 'assets/pokemon_artwork/weepinbell.png', 'assets/pokemon_artwork/weezing.png', 'assets/pokemon_artwork/whimsicott.png', 'assets/pokemon_artwork/whirlipede.png', 'assets/pokemon_artwork/whiscash.png', 'assets/pokemon_artwork/whismur.png', 'assets/pokemon_artwork/wigglytuff.png', 'assets/pokemon_artwork/wiglett.png', 'assets/pokemon_artwork/wimpod.png', 'assets/pokemon_artwork/wingull.png', 'assets/pokemon_artwork/wo-chien.png', 'assets/pokemon_artwork/wobbuffet.png', 'assets/pokemon_artwork/woobat.png', 'assets/pokemon_artwork/wooloo.png', 'assets/pokemon_artwork/wooper.png', 'assets/pokemon_artwork/wormadam.png', 'assets/pokemon_artwork/wugtrio.png', 'assets/pokemon_artwork/wurmple.png', 'assets/pokemon_artwork/wynaut.png', 'assets/pokemon_artwork/wyrdeer.png', 'assets/pokemon_artwork/xatu.png', 'assets/pokemon_artwork/xerneas.png', 'assets/pokemon_artwork/xurkitree.png', 'assets/pokemon_artwork/yamask.png', 'assets/pokemon_artwork/yamper.png', 'assets/pokemon_artwork/yanma.png', 'assets/pokemon_artwork/yanmega.png', 'assets/pokemon_artwork/yungoos.png', 'assets/pokemon_artwork/yveltal.png', 'assets/pokemon_artwork/zacian.png', 'assets/pokemon_artwork/zamazenta.png', 'assets/pokemon_artwork/zangoose.png', 'assets/pokemon_artwork/zapdos.png', 'assets/pokemon_artwork/zarude.png', 'assets/pokemon_artwork/zebstrika.png', 'assets/pokemon_artwork/zekrom.png', 'assets/pokemon_artwork/zeraora.png', 'assets/pokemon_artwork/zigzagoon.png', 'assets/pokemon_artwork/zoroark.png', 'assets/pokemon_artwork/zorua.png', 'assets/pokemon_artwork/zubat.png', 'assets/pokemon_artwork/zweilous.png', 'assets/pokemon_artwork/zygarde.png'];

const maxLayers = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS);
console.log(allPokemon.length + '/' + maxLayers);

async function main() {
	var textureArray = await createTextureArray(gl, allPokemon);
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
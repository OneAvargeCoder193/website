const CHUNK_SIZE = 32;
const CHUNK_SIZE_B = CHUNK_SIZE + 2;

var genMeshPool = workerpool.pool('src/generateChunkMeshWorker.js', {maxWorkers: 4});
var sortPool = workerpool.pool('src/sortWorker.js', {maxWorkers: 4});

class chunkMesh {
	constructor(isTransparent) {
		this.isTransparent = isTransparent;
		this.chunkArray = gl.createVertexArray();
		gl.bindVertexArray(chunkArray);
		this.positionBuffer = gl.createBuffer();
		this.uvBuffer = gl.createBuffer();
		this.textureBuffer = gl.createBuffer();
		this.normalBuffer = gl.createBuffer();
		this.indices = gl.createBuffer();
		this.indicesList = [];
		this.vertsList = [];
		this.generated = false;
	}

	generateChunkMesh(parent) {
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
		const blockDirections = [
			"back",
			"front",
			"top",
			"bottom",
			"left",
			"right",
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
		this.vertsList = [];
		var normals = [];
		var uvs = [];
		var textures = [];
		this.indicesList = [];
		var vertexIndex = 0;
		for(var z = 0; z < CHUNK_SIZE; z++) {
			for(var y = 0; y < CHUNK_SIZE; y++) {
				for(var x = 0; x < CHUNK_SIZE; x++) {
					const block = blocks[parent.get(x, y, z)];
					if(!block.hasOwnProperty("textures")) continue;
					if(block.transparent != this.isTransparent) continue;
					for(var p = 0; p < 6; p++) {
						const otherBlock = blocks[parent.get(x + blockNormals[p][0], y + blockNormals[p][1], z + blockNormals[p][2])];
						if(otherBlock.hasOwnProperty("textures") && otherBlock.transparent == this.isTransparent) {
							continue;
						}
						
						for(var i = 0; i < 4; i++) {
							this.vertsList.push(x + blockVerts[blockQuads[p][i]][0]);
							this.vertsList.push(y + blockVerts[blockQuads[p][i]][1]);
							this.vertsList.push(z + blockVerts[blockQuads[p][i]][2]);
							
							normals.push(blockNormals[p][0]);
							normals.push(blockNormals[p][1]);
							normals.push(blockNormals[p][2]);
							
							uvs.push(blockUvs[i][0]);
							uvs.push(blockUvs[i][1]);

							textures.push(allTextures.indexOf(block.textures[blockDirections[p]]));
						}

						this.indicesList.push(vertexIndex);
						this.indicesList.push(vertexIndex + 1);
						this.indicesList.push(vertexIndex + 2);
						this.indicesList.push(vertexIndex + 2);
						this.indicesList.push(vertexIndex + 1);
						this.indicesList.push(vertexIndex + 3);
						vertexIndex += 4;
					}
				}
			}
		}
		return {
			positions: new Float32Array(this.vertsList),
			normals: new Float32Array(normals),
			textures: new Uint8Array(textures),
			uvs: new Float32Array(uvs),
		};
	}

	sortIndices(playerPos) {
		sortPool.exec('sortTriangles', [this.indicesList, this.vertsList, playerPos])
			.then(sorted => {
				// Use the sorted indices in WebGL
				gl.bindVertexArray(this.chunkArray);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indices);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sorted, gl.DYNAMIC_DRAW);
			})
			.catch(err => console.error('Worker error:', err));
	}
	
	generateMesh(parent, playerPos) {
		const mesh = genMeshPool.exec('generateChunkMesh', [parent.map, blocks, allTextures, this.isTransparent])
			.then(({positions, normals, textures, uvs, indices}) => {
				gl.bindVertexArray(this.chunkArray);

				gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
				gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
				gl.enableVertexAttribArray(0);

				gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
				gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
				gl.enableVertexAttribArray(1);

				gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, textures, gl.STATIC_DRAW);
				gl.vertexAttribIPointer(2, 1, gl.UNSIGNED_BYTE, 0, 0);
				gl.enableVertexAttribArray(2);

				gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
				gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 0, 0);
				gl.enableVertexAttribArray(3);

				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indices);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);

				this.indicesList = Array.from(indices);
				this.vertsList = Array.from(positions);
				this.sortIndices(playerPos);

				this.numIndices = this.indicesList.length;
				this.generated = true;
			})
			.catch(err => console.error('Worker error:', err));
	}

	render() {
		if(!this.generated) return;
		if(this.isTransparent) {
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		}
		gl.bindVertexArray(this.chunkArray);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indices);
		gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_INT, 0);
		if(this.isTransparent) {
			gl.disable(gl.BLEND);
		}
	}
}

class chunk {
	constructor(cx, cy, cz) {
		this.cx = cx;
		this.cy = cy;
		this.cz = cz;
		this.map = new Uint32Array(CHUNK_SIZE_B * CHUNK_SIZE_B * CHUNK_SIZE_B);
		this.mesh = new chunkMesh(false);
		this.transparentMesh = new chunkMesh(true);
		this.lastPlayerPos = [0, 0, 0];
	}

	getLocalPos(wx, wy, wz) {
		return [wx - this.cx * CHUNK_SIZE, wy - this.cy * CHUNK_SIZE, wz - this.cz * CHUNK_SIZE];
	}

	getWorldPos(x, y, z) {
		return [x + this.cx * CHUNK_SIZE, y + this.cy * CHUNK_SIZE, z + this.cz * CHUNK_SIZE];
	}
	
	outOfBounds(x, y, z) {
		return x < -1 || x > CHUNK_SIZE || y < -1 || y > CHUNK_SIZE || z < -1 || z > CHUNK_SIZE;
	}

	set(x, y, z, block) {
		if(this.outOfBounds(x, y, z)) return;
		this.map[(z+1)*CHUNK_SIZE_B*CHUNK_SIZE_B+(y+1)*CHUNK_SIZE_B+(x+1)] = block;
	}

	get(x, y, z) {
		if(this.outOfBounds(x, y, z)) return getBlock("game:air");
		return this.map[(z+1)*CHUNK_SIZE_B*CHUNK_SIZE_B+(y+1)*CHUNK_SIZE_B+(x+1)];
	}

	sortTransparent(playerPos) {
		this.transparentMesh.sortIndices(playerPos);
		this.lastPlayerPos = vec3.floor([], playerPos);
	}

	generateMesh(playerPos) {
		this.mesh.generateMesh(this, playerPos);
		this.transparentMesh.generateMesh(this, playerPos);
	}

	generate() {
		for(var lz = 0; lz < CHUNK_SIZE_B; lz++) {
			const z = lz + this.cz * CHUNK_SIZE - 1;
			for(var lx = 0; lx < CHUNK_SIZE_B; lx++) {
				const x = lx + this.cx * CHUNK_SIZE - 1;
				var height = noise.simplex2(x / 32, z / 32);
				var grassLayer = Math.floor(height*3 + 8);
				for(var ly = 0; ly < CHUNK_SIZE_B; ly++) {
					const y = ly + this.cy * CHUNK_SIZE - 1;
					var block = getBlock("game:air");
					if(y < grassLayer - 3) {
						block = getBlock("game:stone");
					} else if(y < grassLayer - 1) {
						block = getBlock("game:dirt");
					} else if(y < grassLayer) {
						block = getBlock("game:grass");
					} else if(y < 7) {
						block = getBlock("game:water");
					}
					
					this.map[lz*CHUNK_SIZE_B*CHUNK_SIZE_B+ly*CHUNK_SIZE_B+lx] = block;
				}
			}
		}
	}

	render() {
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		var modelMatrix = mat4.create();
		mat4.fromTranslation(modelMatrix, [this.cx * CHUNK_SIZE, this.cy * CHUNK_SIZE, this.cz * CHUNK_SIZE]);
		gl.uniformMatrix4fv(modelMatrixLocation, false, modelMatrix);
		this.mesh.render();
	}

	renderTransparent() {
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		var modelMatrix = mat4.create();
		mat4.fromTranslation(modelMatrix, [this.cx * CHUNK_SIZE, this.cy * CHUNK_SIZE, this.cz * CHUNK_SIZE]);
		gl.uniformMatrix4fv(transparentModelMatrixLocation, false, modelMatrix);
		this.transparentMesh.render();
	}
}
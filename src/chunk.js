const CHUNK_SIZE = 32;

noise.seed(0);

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
	}

	generateChunkMesh(parent, playerPos) {
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
		var vertices = [];
		var normals = [];
		var uvs = [];
		var textures = [];
		var indices = [];
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
							vertices.push(x + blockVerts[blockQuads[p][i]][0]);
							vertices.push(y + blockVerts[blockQuads[p][i]][1]);
							vertices.push(z + blockVerts[blockQuads[p][i]][2]);
							
							normals.push(blockNormals[p][0]);
							normals.push(blockNormals[p][1]);
							normals.push(blockNormals[p][2]);
							
							uvs.push(blockUvs[i][0]);
							uvs.push(blockUvs[i][1]);

							textures.push(allTextures.indexOf(block.textures[blockDirections[p]]));
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
		let chunks = [];
		for (let i = 0; i < indices.length; i += 3) {
			chunks.push(indices.slice(i, i + 3));
		}
		chunks.sort((a, b) => {
			const distA1 = Math.hypot(vertices[a[0]*3+0]-playerPos[0], vertices[a[0]*3+1]-playerPos[1], vertices[a[0]*3+2]-playerPos[2]);
			const distA2 = Math.hypot(vertices[a[1]*3+0]-playerPos[0], vertices[a[1]*3+1]-playerPos[1], vertices[a[1]*3+2]-playerPos[2]);
			const distA3 = Math.hypot(vertices[a[2]*3+0]-playerPos[0], vertices[a[2]*3+1]-playerPos[1], vertices[a[2]*3+2]-playerPos[2]);
			const distB1 = Math.hypot(vertices[b[0]*3+0]-playerPos[0], vertices[b[0]*3+1]-playerPos[1], vertices[b[0]*3+2]-playerPos[2]);
			const distB2 = Math.hypot(vertices[b[1]*3+0]-playerPos[0], vertices[b[1]*3+1]-playerPos[1], vertices[b[1]*3+2]-playerPos[2]);
			const distB3 = Math.hypot(vertices[b[2]*3+0]-playerPos[0], vertices[b[2]*3+1]-playerPos[1], vertices[b[2]*3+2]-playerPos[2]);
			return (distB1+distB2+distB3)-(distA1+distA2+distA3);
		});
		return {
			positions: new Float32Array(vertices),
			normals: new Float32Array(normals),
			textures: new Uint8Array(textures),
			uvs: new Float32Array(uvs),
			indices: new Uint32Array(chunks.flat()),
		};
	}
	
	generateMesh(parent, playerPos) {
		const mesh = this.generateChunkMesh(parent, playerPos);

		gl.bindVertexArray(this.chunkArray);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW);
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(1);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.textures, gl.STATIC_DRAW);
		gl.vertexAttribIPointer(2, 1, gl.UNSIGNED_BYTE, 0, 0);
		gl.enableVertexAttribArray(2);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
		gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(3);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indices);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
		this.numIndices = mesh.indices.length;
	}

	render() {
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
		this.map = new Uint32Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
		this.mesh = new chunkMesh(false);
		this.transparentMesh = new chunkMesh(true);
	}

	getLocalPos(wx, wy, wz) {
		return [wx - this.cx * CHUNK_SIZE, wy - this.cy * CHUNK_SIZE, wz - this.cz * CHUNK_SIZE];
	}

	getWorldPos(x, y, z) {
		return [x + this.cx * CHUNK_SIZE, y + this.cy * CHUNK_SIZE, z + this.cz * CHUNK_SIZE];
	}
	
	outOfBounds(x, y, z) {
		return x < 0 || x > CHUNK_SIZE - 1 || y < 0 || y > CHUNK_SIZE - 1 || z < 0 || z > CHUNK_SIZE - 1;
	}

	set(x, y, z, block) {
		if(this.outOfBounds(x, y, z)) return;
		this.map[z*CHUNK_SIZE*CHUNK_SIZE+y*CHUNK_SIZE+x] = block;
	}

	get(x, y, z, block) {
		if(this.outOfBounds(x, y, z)) return getBlock("game:air");
		return this.map[z*CHUNK_SIZE*CHUNK_SIZE+y*CHUNK_SIZE+x];
	}

	generateSolid(playerPos) {
		this.mesh.generateMesh(this, playerPos);
	}

	generateTransparent(playerPos) {
		this.transparentMesh.generateMesh(this, playerPos);
	}

	generateMesh(playerPos) {
		this.generateSolid(playerPos);
		this.generateTransparent(playerPos);
	}

	generate() {
		for(var lz = 0; lz < CHUNK_SIZE; lz++) {
			const z = lz + this.cz * CHUNK_SIZE;
			for(var lx = 0; lx < CHUNK_SIZE; lx++) {
				const x = lx + this.cx * CHUNK_SIZE;
				var height = noise.simplex2(x / 32, z / 32);
				var grassLayer = Math.floor(height*3 + 8);
				for(var ly = 0; ly < CHUNK_SIZE; ly++) {
					const y = ly + this.cy * CHUNK_SIZE;
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
					
					this.map[lz*CHUNK_SIZE*CHUNK_SIZE+ly*CHUNK_SIZE+lx] = block;
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
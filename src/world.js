class world {
	constructor(seed) {
		this.seed = seed;
		noise.seed(this.seed);

		this.chunks = {};
		this.chunkPos = [];

		this.oldPlayerChunk = [0, 0, 0];
	}

	updateTransparentMeshes(playerPos) {
		for(const [_, ch] of Object.entries(this.chunks)) {
			const clamped = vec3.fromValues(
				Math.min(Math.max(playerPos[0] - ch.cx * CHUNK_SIZE, 0), CHUNK_SIZE),
				Math.min(Math.max(playerPos[1] - ch.cy * CHUNK_SIZE, 0), CHUNK_SIZE),
				Math.min(Math.max(playerPos[2] - ch.cz * CHUNK_SIZE, 0), CHUNK_SIZE),
			);
			if(!vec3.equals(clamped, ch.lastPlayerPos)) {
				ch.sortTransparent(clamped);
			}
		};
	}

	set(x, y, z, block) {
		this.getAllUpdatedChunks(x, y, z).forEach(([ch, pos]) => {
			ch.set(...pos, block);
		});
	}

	get(x, y, z, block) {
		const [ch, pos] = this.getRelPos(x, y, z);
		return ch.get(...pos);
	}

	setAndUpdate(playerPos, x, y, z, block) {
		this.getAllUpdatedChunks(x, y, z).forEach(([ch, pos]) => {
			ch.set(...pos, block);
			ch.generateMesh(playerPos);
		});
	}

	getChunk(x, y, z) {
		const cx = Math.floor(x / CHUNK_SIZE);
		const cy = Math.floor(y / CHUNK_SIZE);
		const cz = Math.floor(z / CHUNK_SIZE);
		return this.chunks[[cx, cy, cz]];
	}

	getRelPos(x, y, z) {
		return [this.getChunk(x, y, z), this.getChunk(x, y, z).getLocalPos(x, y, z)];
	}

	getAllUpdatedChunks(x, y, z) {
		const [centerCh, centerPos] = this.getRelPos(x, y, z);
		const list = [];
		for(var i = -1; i < 2; i++) {
			for(var j = -1; j < 2; j++) {
				for(var k = -1; k < 2; k++) {
					list.push(this.getChunk(x + i, y + j, z + k));
				}
			}
		}

		const seen = new Set();
		list.forEach(ch => {
			seen.add(ch);
		});
		var allChunks = Array.from(seen);
		return allChunks.map(ch => {
			const mapX ={
				"-1": 32,
				"0": centerPos[0],
				"1": -1,
			};
			const mapY ={
				"-1": 32,
				"0": centerPos[1],
				"1": -1,
			};
			const mapZ ={
				"-1": 32,
				"0": centerPos[2],
				"1": -1,
			};
			return [ch, [
				mapX[(ch.cx - centerCh.cx).toString()],
				mapY[(ch.cy - centerCh.cy).toString()],
				mapZ[(ch.cz - centerCh.cz).toString()]
			]];
		});
	}

	isLoaded(x, y, z) {
		const cx = Math.floor(x / CHUNK_SIZE);
		const cy = Math.floor(y / CHUNK_SIZE);
		const cz = Math.floor(z / CHUNK_SIZE);
		return [cx, cy, cz] in this.chunks;
	}

	loadChunk(playerPos, cx, cy, cz) {
		if([cx, cy, cz] in this.chunks) return;
		const ch = new chunk(cx, cy, cz);
		ch.generate();
		ch.generateMesh(playerPos);
		this.chunks[[cx, cy, cz]] = ch;
		this.chunkPos.push([cx, cy, cz]);
	}

	render() {
		for(const [_, ch] of Object.entries(this.chunks)) {
			ch.render();
		};
	}

	renderTransparent() {
		for(const key of this.chunkPos) {
			this.chunks[key].renderTransparent();
		}
	}
	
	raycast(pos, dir) {
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
			if(!this.isLoaded(...mapPos) || blocks[this.get(...mapPos)].solid) break;
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
		return this.isLoaded(...mapPos)?[mapPos, normal]:[undefined, undefined];
	}

	loadRenderDistance(playerPos, renderDistance) {
		const cx = Math.floor(playerPos[0] / CHUNK_SIZE);
		const cy = Math.floor(playerPos[1] / CHUNK_SIZE);
		const cz = Math.floor(playerPos[2] / CHUNK_SIZE);
		this.chunkPos = this.chunkPos.filter(([x, y, z]) => {
			const dx = Math.abs(cx - x);
			const dy = Math.abs(cy - y);
			const dz = Math.abs(cz - z);
			return Math.max(dx, dy, dz) <= renderDistance;
		});
		this.chunks = this.chunkPos.reduce((obj, key) => {
			obj[key] = this.chunks[key];
			return obj;
		}, {});
		for(var x = -renderDistance; x <= renderDistance; x++) {
			for(var y = -renderDistance; y <= renderDistance; y++) {
				for(var z = -renderDistance; z <= renderDistance; z++) {
					this.loadChunk(eyePosition, cx + x, cy + y, cz + z);
				}
			}
		}
	}

	update(playerPos, renderDistance) {
		const playerChunk = vec3.fromValues(
			Math.floor(playerPos[0] / CHUNK_SIZE),
			Math.floor(playerPos[1] / CHUNK_SIZE),
			Math.floor(playerPos[2] / CHUNK_SIZE),
		);
		if(vec3.equals(playerChunk, this.oldPlayerChunk)) {
			return;
		}
		this.oldPlayerChunk = playerChunk;

		this.loadRenderDistance(playerPos, renderDistance);

		this.chunkPos.sort((a, b) => {
			return Math.hypot(...vec3.sub([], b, playerChunk)) - Math.hypot(...vec3.sub([], a, playerChunk));
		})
	}
}
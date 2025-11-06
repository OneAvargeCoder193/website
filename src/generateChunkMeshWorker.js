// load workerpool in the browser
if (typeof importScripts === 'function') {
  importScripts('workerpool.min.js'); // ensure correct path
}

const CHUNK_SIZE = 32;
const CHUNK_SIZE_B = CHUNK_SIZE + 2;

function get(map, x, y, z) {
	return map[(z+1)*CHUNK_SIZE_B*CHUNK_SIZE_B+(y+1)*CHUNK_SIZE_B+(x+1)];
}

// worker-safe function for generating chunk mesh
function generateChunkMesh(map, blocks, allTextures, isTransparent) {
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

    const vertsList = [];
    const normals = [];
    const uvs = [];
    const textures = [];
    const indicesList = [];
    let vertexIndex = 0;

    for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let y = 0; y < CHUNK_SIZE; y++) {
            for (let x = 0; x < CHUNK_SIZE; x++) {
                const block = blocks[get(map, x, y, z)];
                if (!block || !block.hasOwnProperty("textures")) continue;
                if (block.transparent != isTransparent) continue;

                for (let p = 0; p < 6; p++) {
                    const otherBlock = blocks[get(
						map,
                        x + blockNormals[p][0],
                        y + blockNormals[p][1],
                        z + blockNormals[p][2]
                    )];
                    if (otherBlock && otherBlock.hasOwnProperty("textures") && otherBlock.transparent == isTransparent) {
                        continue;
                    }

                    for (let i = 0; i < 4; i++) {
                        vertsList.push(
                            x + blockVerts[blockQuads[p][i]][0],
                            y + blockVerts[blockQuads[p][i]][1],
                            z + blockVerts[blockQuads[p][i]][2]
                        );

                        normals.push(...blockNormals[p]);
                        uvs.push(...blockUvs[i]);
                        textures.push(allTextures.indexOf(block.textures[blockDirections[p]]));
                    }

                    indicesList.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
                    indicesList.push(vertexIndex + 2, vertexIndex + 1, vertexIndex + 3);
                    vertexIndex += 4;
                }
            }
        }
    }

    return {
        positions: new Float32Array(vertsList),
        normals: new Float32Array(normals),
        textures: new Uint8Array(textures),
        uvs: new Float32Array(uvs),
        indices: new Uint32Array(indicesList)
    };
}

// register worker functions
workerpool.worker({
    generateChunkMesh
});
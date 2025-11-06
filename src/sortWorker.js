// load workerpool in the browser
if (typeof importScripts === 'function') {
  importScripts('workerpool.js'); // make sure path points to workerpool.js
}

function sortTriangles(indices, verts, playerPos) {
    const len = indices.length;
    const px = playerPos[0], py = playerPos[1], pz = playerPos[2];

    const vertDist = new Float32Array(verts.length / 3);
    for (let i = 0; i < verts.length; i += 3) {
        const dx = verts[i] - px;
        const dy = verts[i + 1] - py;
        const dz = verts[i + 2] - pz;
        vertDist[i / 3] = dx * dx + dy * dy + dz * dz; // squared Euclidean distance
    }

    const triCount = len / 3;
    const triData = new Array(triCount);
    for (let i = 0, t = 0; i < len; i += 3, t++) {
        const i0 = indices[i], i1 = indices[i + 1], i2 = indices[i + 2];
        // const avgDist = vertDist[i0] + vertDist[i1] + vertDist[i2];
        // triData[t] = { i0, i1, i2, d: avDIst };
		const cx = (verts[i0*3] + verts[i1*3] + verts[i2*3]) / 3;
		const cy = (verts[i0*3+1] + verts[i1*3+1] + verts[i2*3+1]) / 3;
		const cz = (verts[i0*3+2] + verts[i1*3+2] + verts[i2*3+2]) / 3;
		const d = (cx - px)**2 + (cy - py)**2 + (cz - pz)**2;
		triData[t] = { i0, i1, i2, d };
    }

    triData.sort((a, b) => b.d - a.d);

    const sorted = new Uint32Array(len);
    for (let t = 0, j = 0; t < triCount; t++) {
        const tri = triData[t];
        sorted[j++] = tri.i0;
        sorted[j++] = tri.i1;
        sorted[j++] = tri.i2;
    }

    return sorted;
}

// register worker functions
workerpool.worker({
  sortTriangles
});

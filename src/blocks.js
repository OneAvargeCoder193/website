var blocks = [
	{
		transparent: true,
		solid: false,
		id: "game:air",
	},
	{
		transparent: false,
		solid: true,
		id: "game:stone",
		textures: {
			top: "assets/textures/stone.png",
			bottom: "assets/textures/stone.png",
			left: "assets/textures/stone.png",
			right: "assets/textures/stone.png",
			front: "assets/textures/stone.png",
			back: "assets/textures/stone.png",
		},
	},
	{
		transparent: false,
		solid: true,
		id: "game:dirt",
		textures: {
			top: "assets/textures/dirt.png",
			bottom: "assets/textures/dirt.png",
			left: "assets/textures/dirt.png",
			right: "assets/textures/dirt.png",
			front: "assets/textures/dirt.png",
			back: "assets/textures/dirt.png",
		},
	},
	{
		transparent: false,
		solid: true,
		id: "game:grass",
		textures: {
			top: "assets/textures/grass_top.png",
			bottom: "assets/textures/dirt.png",
			left: "assets/textures/grass_top.png",
			right: "assets/textures/grass_top.png",
			front: "assets/textures/grass_top.png",
			back: "assets/textures/grass_top.png",
		},
	},
	{
		transparent: true,
		solid: true, //TODO: Remove when testing is done
		id: "game:water",
		textures: {
			top: "assets/textures/water.png",
			bottom: "assets/textures/water.png",
			left: "assets/textures/water.png",
			right: "assets/textures/water.png",
			front: "assets/textures/water.png",
			back: "assets/textures/water.png",
		},
	},
	{
		transparent: true,
		solid: true,
		id: "game:leaves",
		textures: {
			top: "assets/textures/leaves.png",
			bottom: "assets/textures/leaves.png",
			left: "assets/textures/leaves.png",
			right: "assets/textures/leaves.png",
			front: "assets/textures/leaves.png",
			back: "assets/textures/leaves.png",
		},
	},
];

function getUniqueTexturePaths() {
    const pathsSet = new Set();

    blocks.forEach(block => {
        for (const side in block.textures) {
            pathsSet.add(block.textures[side]);
        }
    });

    return Array.from(pathsSet);
}

function getBlock(id) {
	return blocks.findIndex(block => block.id === id);
}
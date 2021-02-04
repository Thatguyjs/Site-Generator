const Generator = require('./generator.js');


const argStart = process.argv.indexOf(process.cwd());

if(argStart === -1) {
	console.log("Unable to start the generator");
	process.exit(1);
}
else if(argStart + 1 === process.argv.length) {
	console.log("Missing the target directory");
	process.exit(1);
}

// Website directory path
const path = process.argv[argStart + 1];


// Create a generator instance
let genTime = null;
const startTime = Date.now();
const gen = new Generator(path);

gen.on('load', async () => {
	console.log("Loaded generator");

	await gen.clearBuild();

	console.log("Started generating pages");
	genTime = Date.now();
	
	gen.start();
});

gen.on('end', () => {
	const endTime = Date.now();
	console.log("Finished generating pages\n");

	console.log(`Total time taken: ${(endTime - startTime) / 1000} ms`);
	console.log(`Page generation time: ${(endTime - genTime) / 1000} ms`);
});

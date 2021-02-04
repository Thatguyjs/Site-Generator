// Parses & handles .generator files

const FileManager = require('./files.js');
const Formatter = require('./formatter.js');

const Preprocessor = require('./preprocessor.js');
const PageGenerator = require('./page.js');

const EventEmitter = require('events');
const fs = require('fs');



class Generator {

	// Event emitter
	#emitter = new EventEmitter();
	on = this.#emitter.on.bind(this.#emitter);
	once = this.#emitter.once.bind(this.#emitter);

	// File manager
	#fileManager;

	// Preprocessor
	#preprocessor;

	// Page generator
	#pageGen;

	// Directory of the website
	path = "";


	// Class constructor
	constructor(path="") {
		this.path = path.endsWith('/') ? path.slice(0, -1) : path;
		this.#fileManager = new FileManager(path);

		this.#preprocessor = new Preprocessor(this.#fileManager);
		this.#pageGen = new PageGenerator(this.#fileManager);

		if(this.path.length) this.load(this.path + '/.generator');
	}


	// Load the generator file
	async load(filepath) {
		await this.#preprocessor.extractFileCommands(filepath);
		this.#preprocessor.queueCommands();
		this.#preprocessor.pageGen = this.#pageGen;

		await this.#pageGen.extractFilePages(filepath);

		// File manager settings
		this.#fileManager.sourceDir = this.#preprocessor.settings.source_dir;
		this.#fileManager.buildDir = this.#preprocessor.settings.build_dir;
		this.#fileManager.ignoreFile = this.#preprocessor.settings.ignore_rules;

		this.#emitter.emit('load');
	}


	// Clear the build folder
	async clearBuild() {
		await this.#fileManager.clearDir(this.#preprocessor.settings.build_dir);
	}


	// Start generating website content
	async start() {
		await this.#preprocessor.execQueue();
		await this.#pageGen.generatePages();

		this.#emitter.emit('end');
	}

};


module.exports = Generator;

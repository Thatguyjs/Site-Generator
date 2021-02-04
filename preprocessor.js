// Parse preprocessor commands in generator files

const FileManager = require('./files.js');
const Formatter = require('./formatter.js');

const EventEmitter = require('events');
const fs = require('fs');



class Preprocessor {

	// Event emitter
	#emitter = new EventEmitter();
	on = this.#emitter.on.bind(this.#emitter);
	once = this.#emitter.once.bind(this.#emitter);

	// File manager
	#fileManager;

	// Page generator
	pageGen;

	// Site settings
	#settings = {
		source_dir: "",
		build_dir: "",
		ignore_rules: ""
	};

	// List of commands
	#commands = [];

	// Command queue
	#queue = [];


	// Init data
	constructor(fileManager, filepath) {
		this.#fileManager = fileManager;

		if(filepath) {
			this.extractFileCommands(filepath).then(() => {
				this.#emitter.emit('load');
			});
		}
	}


	// Extract commands from a file
	async extractFileCommands(filepath) {
		let res = null, rej = null;
		const promise = new Promise((resolve, reject) => { res = resolve, rej = reject; });

		fs.readFile(filepath, 'utf8', (err, data) => {
			if(err) rej(err);

			this.extractCommands(data);

			this.#emitter.emit('load', this.#commands);
			res(this.#commands);
		});

		return promise;
	}


	// Extract commands from a string
	extractCommands(string, mode='set') {
		if(mode.toLowerCase() === 'set') this.#commands = [];

		const lines = string.split('\n');

		for(let l in lines) {
			const line = lines[l].trim();

			if(line.startsWith(':')) {
				let command = { name: line.slice(1, line.indexOf(' ')), params: [] };
				command.params = line.slice(line.indexOf(' ') + 1).split(' ');

				this.#commands.push(command);
			}
		}
	}


	// Generate the command queue
	queueCommands() {
		this.#queue = [];

		for(let c in this.#commands) {
			const command = this.#commands[c];

			switch(command.name) {

				// Set the build directory (non-queued)
				case 'build':
					this.#settings.build_dir = command.params[0];
					break;

				// Set the source directory (non-queued)
				case 'source':
					this.#settings.source_dir = command.params[0];
					break;

				// Add ignored files (non-queued)
				case 'ignore_rules':
					this.#settings.ignore_rules = command.params[0];
					break;

				// Include files / directories (queued)
				case 'include':
				case 'include_dir':

				// Add redirects
				case 'redirect':

				// Add global content files
				case 'content':

					this.#queue.push(command);
					break;

				// Unknown command
				default:
					console.log("Unknown command:", command.name);

			}
		}
	}


	// Execute the queue of commands
	async execQueue() {
		for(let c in this.#queue) {
			const command = this.#queue[c];

			switch(command.name) {

				// Include a file
				case 'include':
					await this.#fileManager.copyFile(command.params[0], command.params[1]);
					break;

				// Include a directory
				case 'include_dir':
					await this.#fileManager.copyDir(command.params[0], command.params[1]);
					break;

				// Redirect to another page
				case 'redirect':
					await Formatter.formatStream(
						'./redirect.html',
						this.#fileManager.buildPath(command.params[0]) + '/index.html',
						{ url: command.params[1] }
					);
					break;

				// Add global content files
				case 'content':
					await this.pageGen.addContentFile(this.#fileManager.sourcePath(command.params[0]));
					break;

			}
		}
	}


	// Get the list of commands
	get commands() { return this.#commands; }


	// Get the settings object
	get settings() { return this.#settings; }

}


module.exports = Preprocessor;

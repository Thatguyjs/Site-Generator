// Parse & manage pages in generator files

const FileManager = require('./files.js');
const Formatter = require('./formatter.js');

const EventEmitter = require('events');
const fs = require('fs');



class PageGenerator {

	// Event emitter
	#emitter = new EventEmitter();
	on = this.#emitter.on.bind(this.#emitter);
	once = this.#emitter.once.bind(this.#emitter);

	// File manager
	#fileManager;

	// Global content
	#content = {};

	// List of pages
	#pages = [];


	// Init variables
	constructor(fileManager, filepath) {
		this.#fileManager = fileManager;

		if(filepath) {
			this.extractFilePages(filepath).then(() => {
				this.#emitter.emit('load');
			});
		}
	}


	// Add a global content file
	async addContentFile(filepath) {
		return new Promise(async (res, rej) => {
			this.#content = await Formatter.parseContentFile(filepath);
			res(this.#content);
		});
	}


	// Get a list of pages from a file
	async extractFilePages(filepath) {
		let res = null, rej = null;
		const promise = new Promise((resolve, reject) => { res = resolve, rej = reject; });

		fs.readFile(filepath, 'utf8', (err, data) => {
			if(err) rej(err);

			this.#pages = PageGenerator.extractPages(data);

			this.#emitter.emit('load', this.#pages);
			res(this.#pages);
		});

		return promise;
	}


	// Get a list of pages from a string
	static extractPages(string, mode='set') {
		const pages = [];
		const lines = string.split('\n');
		let ind = 0;

		while(ind < lines.length) {
			let line = lines[ind].trim();

			if(line.startsWith('/')) {
				let page = { url: line, files: [] };
				let file = null;

				while((line = lines[++ind].trim()) !== "") {
					const splitAt = line.indexOf('=');

					const key = line.slice(0, splitAt).trim().toLowerCase();
					const value = line.slice(splitAt + 1).trim();

					if(key === 'file') {
						if(file) page.files.push(file);
						file = { path: value, template: "", content: "", props: {} };
					}
					else if(key === 'template' || key === 'content') {
						file[key] = value;
					}
					else if(file) {
						file.props[key] = value;
					}
				}

				if(file) page.files.push(file);
				pages.push(page);
			}

			ind++;
		}

		return pages;
	}


	// Generate the pages
	async generatePages() {
		for(let p in this.#pages) {
			const folder = this.#fileManager.buildPath(this.#pages[p].url);
			if(!fs.existsSync(folder)) fs.mkdirSync(folder);

			for(let f in this.#pages[p].files) {
				const file = this.#pages[p].files[f];
				const templatePath = this.#fileManager.sourcePath(file.template);
				const contentPath = this.#fileManager.sourcePath(file.content);

				let props = this.#content;
				Object.assign(props, await Formatter.parseContentFile(contentPath));

				await Formatter.formatStream(templatePath, folder + file.path, props);
			}
		}
	}

}


module.exports = PageGenerator;

// Manage files & directories

const fs = require('fs');
const pfs = fs.promises;


class FileManager {

	// Website directory
	siteDir = "";

	// Source / build directories
	sourceDir = "";
	buildDir = "";


	// File ignore rules
	#ignoreFile = "";
	#ignore = [];


	// Init variables
	constructor(site, source, build) {
		this.siteDir = site;
		this.sourceDir = source ?? "";
		this.buildDir = build ?? "";
	}


	// Format a path string
	#formatPath(path) {
		if(!path) console.trace();
		path = path.replaceAll('\\', '/');

		if(!path.startsWith('/') && !path.startsWith('.')) path = '/' + path;
		if(path.endsWith('/')) path = path.slice(0, -1);

		return path;
	}


	// Parse the ignore file data
	#parseIgnore(string) {
		const lines = string.split('\n');

		for(let l in lines) {
			let line = lines[l].trim();
			if(line.startsWith('#') || !line.length) continue;

			if(!line.startsWith('/')) line = '**/' + line;
			// else line = line.slice(1);

			// Escape for regex
			line = line.replaceAll('.', '\\.')
						.replaceAll('-', '\\-')
						.replaceAll('^', '\\^')
						.replaceAll('$', '\\$')
						.replaceAll('/', '\\/')
						.replaceAll('[', '\\[')
						.replaceAll(']', '\\]')
						.replaceAll('(', '\\(')
						.replaceAll(')', '\\)')
						.replaceAll('{', '\\{')
						.replaceAll('}', '\\}');

			// Format for regex
			line = line.replaceAll('**', '.*')
						.replaceAll('?', '[^\\/]');

			for(let c in line) {
				if(+c > 0 && line[c] === '*' && line[c - 1] !== '.') {
					line = line.slice(0, +c) + '[^\\/]+' + line.slice(+c + 1);
				}
			}

			this.#ignore.push(line);
		}
	}


	// Set and parse the ignore file
	set ignoreFile(path) {
		this.#ignoreFile = this.mainPath(path);

		pfs.readFile(this.#ignoreFile, 'utf8').then((data) => {
			this.#parseIgnore(data);
		});
	}


	// Check if a file is ignored
	isIgnored(path, ignore=null) {
		if(!ignore) ignore = this.#ignore;

		for(let i in ignore) {
			const reg = new RegExp(ignore[i]);
			const match = path.match(reg);

			if(match && match[0] === path) return true;
		}

		return false;
	}


	// Get the main path for a file / directory
	mainPath(path) {
		return this.siteDir + this.#formatPath(path);
	}


	// Get the source path for a file / directory
	sourcePath(path) {
		return this.siteDir + this.sourceDir + this.#formatPath(path);
	}


	// Get the build path for a file / directory
	buildPath(path) {
		return this.siteDir + this.buildDir + this.#formatPath(path);
	}


	// Remove all contents from a directory
	async clearDir(path) {
		path = this.siteDir + this.#formatPath(path);

		const items = await pfs.readdir(path);
		const promises = [];

		for(let i in items) {
			promises.push(pfs.rm(path + this.#formatPath(items[i]), { recursive: true }));
		}

		await Promise.all(promises);
	}


	// Copy a file to the build directory
	async copyFile(source, dest, mode) {
		if(!dest || typeof dest === 'number') {
			mode = dest;
			dest = source;
		}

		return pfs.copyFile(this.sourcePath(source), this.buildPath(dest), mode);
	}


	// Copy a directory (recursive) to the build directory
	async copyDir(source, dest, ignoreFiles=true) {
		const folder = this.buildPath(dest)
		if(!fs.existsSync(folder)) await pfs.mkdir(folder);

		const items = await pfs.readdir(this.sourcePath(source), { withFileTypes: true });

		for(let i in items) {
			const itemSource = source + '/' + items[i].name;
			const itemDest = dest + '/' + items[i].name;

			if(items[i].isDirectory()) this.copyDir(itemSource, itemDest);
			else {
				if(ignoreFiles && this.isIgnored(itemSource)) continue;
				this.copyFile(itemSource, itemDest);
			}
		}
	}

}


module.exports = FileManager;

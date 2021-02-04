// Parse and replace content in files

const fs = require('fs');



const Formatter = {

	// Format & update a file
	formatFile: async function(filepath, props) {
		fs.readFile(filepath, 'utf8', (err, data) => {
			if(err) throw err;

			data = this.formatString(data, props);
			fs.writeFileSync(filepath, data);
		});
	},


	// Format a string
	formatString: function(string, props) {
		for(let p in props) {
			string = string.replaceAll(`&{${p}}`, props[p]);
		}

		return string;
	},


	// Format a file stream
	formatStream: async function(from, to, props) {
		const rs = fs.createReadStream(from, { encoding: 'utf8' });
		const ws = fs.createWriteStream(to);

		let propString = "";
		let isProp = false;

		rs.on('data', (chunk) => {
			if(isProp) {
				chunk = propString + chunk;

				propString = "";
				isProp = false;
			}

			chunk = this.formatString(chunk, props);

			let start = chunk.indexOf('&{');
			let end = chunk.indexOf('}', start);

			if(start > -1 && end === -1) {
				isProp = true;

				propString = chunk.slice(start);
				chunk = chunk.slice(0, start);
			}

			ws.write(chunk);
		});

		return new Promise((res, rej) => {
			rs.on('end', () => {
				rs.close();
				ws.end();

				ws.on('finish', ws.close);
				res();
			});
		});
	},


	// Get properties from a content file
	parseContentFile: async function(filepath) {
		const props = {};

		return new Promise((res, rej) => {
			fs.readFile(filepath, 'utf8', (err, data) => {
				if(err) return rej(err);

				let ind = data.indexOf(':def ');

				while(ind > -1) {
					if(ind > 0 && data[ind - 1] === '\\') {
						ind = data.indexOf(':def ', ind + 5);
					}

					const end = data.indexOf(':end', ind + 5);
					const lineEnd = data.indexOf('\n', ind + 5);
					if(end === -1) return rej(new Error("Missing end of definition"));

					const name = data.slice(ind + 5, lineEnd).trim();
					props[name] = data.slice(lineEnd + 1, end).trim();

					ind = data.indexOf(':def ', ind + 5);
				}

				res(props);
			});
		});
	}

};


module.exports = Formatter;

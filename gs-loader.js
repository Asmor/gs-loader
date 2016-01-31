var loadGS = (function () {
	"use strict";

	var jsonpcount = 0;
	var sheets = {};

	// Get AJAX using jsonp
	function getSheetsJsonp(url) {
		var callbackName = "__jsonpcallback" + jsonpcount++;

		var promise = new Promise(function (resolve, reject) {
			window[callbackName] = function jsonpCallback(data) {
				resolve(data.feed.entry);
				delete window[callbackName];
			};

			var script = document.createElement("script");
			script.src = url + "?alt=json-in-script&callback=" + callbackName;

			script.addEventListener("load", function () {
				this.parentNode.removeChild(this);
			}, false);

			script.addEventListener("error", function (eventData) {
				this.parentNode.removeChild(this);
				delete window[callbackName];
				reject(eventData);
			}, false);

			document.head.appendChild(script);
		});

		return promise;
	}

	function getContents(data) {
		// Step 1: Get all the data as a two-dimensional array
		var cols = [];
		data.forEach(function (cell) {
			var cellInfo = cell.gs$cell;
			var colIndex = cellInfo.col - 1;
			var rowIndex = cellInfo.row - 1;
			var text     = cellInfo.$t;

			if ( !text ) {
				return;
			}

			var col = cols[colIndex] = cols[colIndex] || [];
			col[rowIndex] = text;
		});

		// Step 2: Transform data into an object and clean it up
		var lists = {};
		cols.forEach(function (col) {
			var header = col.shift();

			if ( !header ) { return; }

			lists[header] = col;

			// Clean out empty values
			var i;
			while ( i < col.length ) {
				if ( col[i] ) {
					i++;
				} else {
					col.splice(i, 1);
				}
			}
		});

		return lists;
	}

	function getWorksheets(id) {
		var url = "https://spreadsheets.google.com/feeds/worksheets/" + id + "/public/full";
		var worksheetPromises = [];
		var worksheets = {};
		var contents = {};

		// Step 1: Get a list of all the worksheets in the spreadsheet
		return getSheetsJsonp(url).then(function (data) {
			data.forEach(function (worksheet) {
				var name = worksheet.title.$t;
				var ws = worksheets[name] = {};

				// Step 2: For each worksheet, parse its listfeed
				worksheet.link.some(function (link) {
					if ( link.rel.match(/cellsfeed/) ) {
						worksheetPromises.push(
							getSheetsJsonp(link.href).then(function (data) {
								worksheets[name] = getContents(data);
							})
						);
					}
				});
			});

			return Promise.all(worksheetPromises).then(function () {
				return worksheets;
			});
		});
	}

	// Cache results for each id
	function load(id) {
		sheets[id] = sheets[id] || getWorksheets(id);

		sheets[id].catch(function () {
			// If there's an error, remove the cache so we can try again
			delete sheets[id];
		});

		return sheets[id];
	}

	return load;
}());

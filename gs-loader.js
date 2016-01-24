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

			document.head.appendChild(script);
		});

		return promise;
	}

	function parseLine(ws, data) {
		data.forEach(function (line) {
			Object.keys(line).forEach(function (key) {
				var val = line[key].$t;

				if ( !val ) { return; }

				// The fields that contain the cell values are named "gsx$colName"
				var match = key.match(/^gsx\$(.+)/);

				if ( !match ) { return; }

				var col = match[1];

				ws[col] = ws[col] || [];
				ws[col].push(val);
			});
		});
	}

	// The lists feed changes header names by removing all characters besides dashes, letters, and
	// numbers, and then making them lowercase. Then if there's a collision it tacks on _2, _3, etc.
	function getRealHeaderNames(data) {
		var cols = [];
		data.forEach(function (cell) {
			var cellInfo = cell.gs$cell;

			if ( cellInfo.row === "1" ) {
				// Columns are 1-indexed, not 0-indexed
				cols[cellInfo.col - 1] = cellInfo.$t;
			}
		});

		var colNames = {};
		cols.forEach(function (col) {
			var normalized = col.replace(/[^-a-z0-9]/ig, "").toLowerCase();
			var proposedName = normalized;
			var suffix = 2;

			// If we've got a collision, add a numeric suffix
			while ( colNames[proposedName] ) {
				proposedName = normalized + "_" + suffix++;
			}

			colNames[proposedName] = col;
		});

		return colNames;
	}

	function getWorksheets(id) {
		var url = "https://spreadsheets.google.com/feeds/worksheets/" + id + "/public/full";
		var worksheetPromises = [];
		var worksheets = {};
		var realHeaders = {};

		// Step 1: Get a list of all the worksheets in the spreadsheet
		return getSheetsJsonp(url).then(function (data) {
			data.forEach(function (worksheet) {
				var name = worksheet.title.$t;
				var ws = worksheets[name] = {};

				// Step 2: For each worksheet, parse its listfeed
				worksheet.link.some(function (link) {
					if ( link.rel.match(/listfeed/) ) {
						worksheetPromises.push(
							getSheetsJsonp(link.href).then(parseLine.bind(null, ws))
						);
					} else if ( link.rel.match(/cellsfeed/) ) {
						worksheetPromises.push(
							getSheetsJsonp(link.href).then(function (data) {
								realHeaders[name] = getRealHeaderNames(data);
							})
						);
					}
				});
			});

			return Promise.all(worksheetPromises).then(function () {
				// Translate the normalized listfeed column names to the real names
				Object.keys(worksheets).forEach(function (name) {
					var ws = worksheets[name];
					Object.keys(realHeaders[name]).forEach(function (normalizedColName) {
						var realName = realHeaders[name][normalizedColName];

						if ( realName === normalizedColName ) { return; }

						ws[realName] = ws[normalizedColName];
						delete ws[normalizedColName];
					});
				});
				return worksheets;
			});
		});
	}

	// Cache results for each id
	function load(id) {
		sheets[id] = sheets[id] || getWorksheets(id);

		return sheets[id];
	}

	return load;
}());

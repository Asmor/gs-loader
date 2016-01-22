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

	function getWorksheets(id) {
		var url = "https://spreadsheets.google.com/feeds/worksheets/" + id + "/public/full";
		var worksheetPromises = [];
		var worksheets = {};

		// Step 1: Get a list of all the worksheets in the spreadsheet
		return getSheetsJsonp(url).then(function (data) {
			data.forEach(function (worksheet) {
				var name = worksheet.title.$t;
				var ws = worksheets[name] = {};

				// Step 2: For each worksheet, parse its listfeed
				worksheet.link.some(function (link) {
					if ( link.rel.match(/listfeed/) ) {
						worksheetPromises.push(getSheetsJsonp(link.href).then(parseLine.bind(null, ws)));
						return true;
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

		return sheets[id];
	}

	return load;
}());

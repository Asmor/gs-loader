# gs-loader
Simple JS function to load the contents of a Google Spreadsheet as a series of lists

# Usage

First, create a new spreadsheet in Google Drive. It can have any number of worksheets. Each worksheet should have the first row as a header row, and then a number of values for each header. The lists in a particular worksheet don't need to be the same length, but it's important that there not be any blank values in a list*

Next, **publish** the spreadsheet by going to file -> publish to web. When you click the blue popup button, you will get a popup window asking you to confirm. If you don't get that popup, make sure you don't have popups blocked on Google Drive.

Copy the ID of the spreadsheet from your URL. It's the long string of gibberish characters in the middle, and it'll look something like `1x491NmMhzZMmqSd9GEWu-kHZs374-FtJA3oTWatWK6A`.

Now just call loadGS and pass it the ID for your spreadsheet, like so:

```
var sheetId = "1x491NmMhzZMmqSd9GEWu-kHZs374-FtJA3oTWatWK6A";
loadGS(sheetId).then(data => console.log(data));
```

loadGS will return a promise with the data from the spreadsheet. For example:

```
{
    "Things": {
        "color": ["red", "orange", "yellow", "green", "blue", "violet", "white", "black"],
        "animal": ["leopard", "monkey", "parrot", "iguana", "bear", "horse", "warthog", "barracuda"]
    },
    "Places": {
        "shop": ["Alchemist", "Florist", "Blacksmith", "Tanner"],
        "settlement": ["City", "Hamlet", "Thorp", "Village", "Town"]
    }
}
```

In this example, the spreadsheet had two worksheets named Things and Places. Each worksheet has two lists.

Note that there's no error handling, so... have fun with that. :) If it encounters an error, the promise is just never going to resolve.

*technically it's ok to have blank values in a list, as long as you don't have any completely blank lines. The way the Google Spreadsheet API works, it will assume the data are done when it encounters a totally blank line.

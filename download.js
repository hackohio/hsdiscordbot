const config = require("./config.json");
const fs = require('fs');
const { google } = require('googleapis');


var fileId = config.fileID;
var dest = fs.createWriteStream('~/hsdiscordbot/formresponses.csv');
google.drive.export({
  fileId: fileId,
  mimeType: 'text/csv'
})
    .on('end', function () {
      console.log('Done');
    })
    .on('error', function (err) {
      console.log('Error during download', err);
    })
    .pipe(dest);
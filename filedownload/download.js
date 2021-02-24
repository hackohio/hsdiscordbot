const config = require("./config.json");

var fileId = config.fileID;
var dest = fs.createWriteStream('~/hsdiscordbot/formresponses.csv');
drive.files.export({
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
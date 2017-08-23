/**
 * node pseudo nas
 * this shows your files in a neat html format
 * mostly for streaming movies and stuff
 * 
 * created by Kyle Boyle - March 2017
 */

'use strict';

let fsMap = {};

const http = require('http');
const fs = require('fs');
const ROOT_PATH = '/Volumes'; // root for the stuff to be show to the user
const IGNORE_LIST = [
    'Macintosh HD',
    'Icon\r',
    '$RECYCLE.BIN',
    'System Volume Information',
    'Thumbs.db'
]; // ignore these files; metadata and crap
// these files are based on stuff from a drive mainly used in MacOS
// GNU/Linux and Windows garbage files would be good to have as well
const MIME_TYPES = {
    'mp4': 'video/mp4',    'm4v':'video/mp4',     'webm': 'video/webm', 'mkv': 'video/x-matroska',
    'png': 'image/png',    'jpg':'image/jpeg',    'jpeg': 'image/jpeg', 'gif': 'image/gif',
    'ico': 'image/x-icon', 'svg':'image/svg+xml', 'webp': 'image/webp',
    'mp3': 'audio/mpeg',   'wav':'audio/wav',
    'txt': 'text/plain',   'html':'text/html',    'css': 'text/css',    'js': 'text/javascript',
    'xml': 'text/xml' // possibly supposed to be application/xml, but it's debatable
}; // all the filetypes that might need to be served, that I can think of right now (subtitles?)
const MIN_STYLES = 
    ".content,.result{position:relative}body,button:hover:after{font-family:futura,arial}body{margin:0;font-size:16pt;color:#c80058;background-color:#1c1c1c}a,a:link,a:visited{color:#c80058;text-decoration:none}::selection{color:#6000f0}.scale{width:96%;margin-left:auto;margin-right:auto;margin-bottom:32px}.content{padding:16px;border-radius:8px;box-shadow:3px 3px 6px #60686c inset;background-color:#e0e8ec}.result{left:6px;padding:6px 6px 6px 10px;margin:4px;border-radius:4px;background-color:#f0f8fc;animation:1.2s linear 0s bounce-in;overflow:scroll}.result::-webkit-scrollbar{display:none}.arr{transform:translate(3px,-22px) rotate(90deg)}button{cursor:pointer}button:focus{outline-style:none}button:active{border-style:solid;border-color:#c80058}button:hover:after{position:absolute;top:-8px;padding:0 4px 2px;border-radius:2px;font-size:14pt;color:#c80059;background-color:#f0f8fc;opacity:.9;white-space:nowrap;z-index:1}button.back,button.video{border-width:3px;border-color:#c01050;background-color:#c80058}button.back{margin:8px;height:40px;width:60px;border-radius:6px;font-size:56px;font-weight:700;color:#fff}button.back:hover:after{content:'go up a directory'}button.video{position:relative;height:30px;width:30px;margin:6px;border-radius:4px;color:#e0e8ec}@media screen and (max-device-width:4in){.scale{width:96%}.content{text-align:center}button.back{position:static}}@media screen and (min-device-width:4in) and (max-width:640px){.content{text-align:center}}@media screen and (min-device-width:4in) and (min-width:752px){.scale{width:720px}}@media screen and (min-device-width:4in) and (min-width:1024px){.scale{width:976px}}@media screen and (min-device-width:4in) and (min-width:1280px){.scale{width:1232px}}@media screen and (max-width:800px){button.back{position:static}}@keyframes bounce-in{0%{left:720px}28%{left:-18px}40%{left:30px}56%{left:-3px}76%{left:15px}100%{left:6px}}";
const FAVICON = 
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYBAMAAAASWSDLAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAtUExURRwcHBsbGxsbGxsbGxwcHBwcHMgAWLMDUHINOjEYI7kCUrkCU1ITL7gCUk8TLrnqPBUAAAAFdFJOU9nmwIDYl75RkAAAAGFJREFUGNNjMGIMhQIRZQaFUDhgYmANPZUGBK1ATgCDaOgyIDs9A8gJZAgNBUlkloGkoJzU6RlInEiQFIwTCpKCcyLL4BwQGBQc0dBtEHYu0HOsoachnHtAb6MECCKoBJQBaQJoUmm8vNcAAAAASUVORK5CYII=";

const server = http.createServer(function(request, response) {
    let url = decodeURI(request.url);
    let pathList = url.split('/');
    pathList.shift(); // remove first (blank) string (leading slash)
    if (pathList[pathList.length - 1] == "") {
        pathList.pop(); // remove last element if it's blank (trailing slash)
    }

    if (pathList.length === 0) {
        fsMap = updateMap(ROOT_PATH); // if the user requested the root, update the filesystem map
        console.log("map updated");
    }
    
    let currentDir = fsMap;
    for (let i = 0; i < pathList.length; ++i) { // traverse fsMap to find requested directory
        currentDir = currentDir[pathList[i]];
        if (currentDir === undefined) { // if can't find folder, then break
            break;
        }
    }
    
    if (currentDir === undefined) { // error processing path; 404 file not found
        response.statusCode = 404;
        response.setHeader('Content-Type', 'text/html');
        response.end(`<html><head><title>uh oh</title>
        <link rel="shortcut icon" href="${FAVICON}" type="image/png">
        <style>${MIN_STYLES}</style></head><body>
        <h1>you made a request for ${url}</h1>
        <h2>invalid directory</h2>
        </body></html>`);
    }
    else if (typeof currentDir === "object") { // this is a directory; show its contents
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/html');

        if (url[url.length - 1] === '/') { // remove trailing slash
            url = url.substring(0, url.length - 1);
        }

        let dirText = '';
        let i = 0;
        for (let subDir in currentDir) {
            dirText += `<a href="${url}/${subDir}">
            <div class="result" style="animation-delay:${((i++%12/10)-0.3)}s;">${subDir}</div></a>`;
        }

        let parentPath = url.split('/').slice(0, -1).join('/') || '/';

        response.end(`<html><head><title>${url||'/'}</title>
        <link rel="shortcut icon" href="${FAVICON}" type="image/png">
        <meta name=viewport content="width=device-width, initial-scale=1">
        <style>${MIN_STYLES}</style></head><body>
        <a href="${parentPath}"><button class="back"><div class="arr">&#8623;</div></button></a>
        <div class="scale"><div class="content">${url||'/'}</div></div>
        <div class="scale"><div class="content">${dirText}</div></div>
        </body></html>`);
    }
    else if (typeof currentDir === "string") { // this is a file, return it or a stream of it
        let fileExtension = currentDir.split('.').reverse()[0];
        let mimeType = MIME_TYPES[fileExtension];
        if (mimeType === undefined) {
            mimeType = 'application/octet-stream'; // unknown binary file; browser will save to disk
        }
        
        let fullFilePath = ROOT_PATH + url;
        fs.lstat(fullFilePath, function(err, stats) {
            if (err) { response.end(err); }
            let range = request.headers.range;
            if (!range) { range = 'bytes=0-'; } // if no range header, assume open ended
            let positions = range.split('=')[1].split('-');
            let total = stats.size;
            let start = parseInt(positions[0], 10); // get start from range
            let end = parseInt(positions[1], 10) || total - 1; // get end from range or send all
            let chunkSize = (end - start) + 1;

            response.writeHead(206, { // 206 is partial content response
                'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': mimeType
            });

            let fileStream = fs.createReadStream(fullFilePath, { start: start, end: end })
                .on('open', function() {
                    fileStream.pipe(response);
                })
                .on('error', function(err) {
                    response.end(err);
                });
        });
    }
});

server.listen(8000, '0.0.0.0', function() {
    console.log('server running at http://0.0.0.0:8000');
    fsMap = updateMap(ROOT_PATH);
});

function updateMap(path) { // updates the map of the filesystem
    let currentDir = {};
    let contents = fs.readdirSync(path);
    let newFilePath;
    let fileInfo;
    for (let i = 0; i < contents.length; ++i) {
        newFilePath = path + '/' + contents[i];
        fileInfo = fs.lstatSync(newFilePath);
        if (IGNORE_LIST.indexOf(contents[i]) == -1 && contents[i][0] != '.') { // if valid file/dir
            if (fileInfo.isDirectory()) {
                currentDir[contents[i]] = updateMap(newFilePath); // recursive call to build folder
            }
            if (fileInfo.isFile()) {
                currentDir[contents[i]] = newFilePath; // store full path
            }
        }
    }
    return currentDir;
}

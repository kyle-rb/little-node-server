/**
 * little node server
 * this shows your files in a neat html format
 * and supports http range requests so that streaming video works
 * 
 * created by Kyle Boyle - March 2017
 */

'use strict';

let fsMap = {};

const http = require('http');
const fs = require('fs');
const ROOT_PATH = process.cwd();
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
    'xml': 'text/xml', // possibly supposed to be application/xml, but it's debatable
    'pdf': 'application/pdf', 'json': 'application/json',
}; // all the filetypes that might need to be served, that I can think of right now (subtitles?)

const MIN_STYLES = fs.readFileSync('shiny.css');
const FAVICON = 'data:image/png;base64,' + fs.readFileSync('file-icon.png').toString('base64');

const server = http.createServer(function(request, response) {
    let url = decodeURI(request.url);
    let pathList = url.split('/');
    pathList.shift(); // remove first (blank) string (leading slash)
    if (pathList[pathList.length - 1] == "") {
        pathList.pop(); // remove last element if it's blank (trailing slash)
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
        <meta charset="utf-8">
        <meta name=viewport content="width=device-width, initial-scale=1">
        <style>${MIN_STYLES}</style></head><body>
        <a href="${parentPath}"><button class="back"><div class="arr">&larr;</div></button></a>
        <div class="scale"><div class="content">${url||'/'}</div></div>
        <div class="scale"><div class="content">${dirText}</div></div>
        </body></html>`);
    }
    else if (typeof currentDir === "string") { // this is a file, return it or a stream of it
        let fileExtension = currentDir.split('.').pop();
        let mimeType = MIME_TYPES[fileExtension];
        if (mimeType === undefined) {
            mimeType = 'application/octet-stream'; // unknown binary file; browser will save to disk
        }
        
        let fullFilePath = ROOT_PATH + url;
        fs.lstat(fullFilePath, function(err, stats) {
            if (err) {
                response.end(err);
                return; // end early if error with path
            }
            
            let total = stats.size;
            let start = 0, end = total - 1;
            let chunkSize = (end - start) + 1;

            let range = request.headers.range;
            if (range) {
                let positions = range.split('=')[1].split('-');
                start = parseInt(positions[0], 10); // get start from range
                end = parseInt(positions[1], 10) || total - 1; // get end from range or send all
                chunkSize = (end - start) + 1;

                //console.log('\nrange: ' + range);
                //console.log('start: ' + start, 'end: ' + end, 'total: ' + total);

                if (start == total) {
                    response.writeHead(206);
                    response.end(); // return empty response because VLC requests this byterange
                    return;
                }
                else if (start > total) {
                    response.writeHead(416); // error: requested range not satisfiable
                    response.end();
                    return;
                }

                response.writeHead(206, { // 206 is partial content response
                    'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize,
                    'Content-Type': mimeType
                });
            }
            else { // if no range header, just regular 200 response
                //console.log('regular 200 request for file');
                response.writeHead(200, {
                    'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize,
                    'Content-Type': mimeType
                });
            }

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
    setInterval(function() {
        fsMap = updateMap(ROOT_PATH);
    }, 5000);
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

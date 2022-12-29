# Little Node Server

This is a simple static file server I made that supports streaming video, with proper HTTP range request support.

## Usage
Run `node little-node-server.js` in the directory you want to serve from.

## Other info:
The stylesheet is minified and included in the header of each response, and the favicon is encoded as a base64 data URI in the HTML. Also, it doesn't depend on any external NPM modules or anything. So the only file actually necessary to run it is little-node-server.js

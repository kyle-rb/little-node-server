# Node Pseudo NAS
This is sort of like a NAS (network attached storage) except with a nice web interface. It's generally meant to be run on a computer with an external drive attached.

It's mostly for streaming videos, but you can use it for whatever.

## Usage
Currently this is configured to list all external drives on a MacOS system, but it can really be used on any part of any system, just by changing ROOT_PATH.

## Other info:
The stylesheet is minified and included in the header of each response, and the favicon is encoded as a base64 data URI in the HTML. Also, it doesn't depend on any external NPM modules or anything. So the only file actually necessary to run it is node-pseudo-nas.js

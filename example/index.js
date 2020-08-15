const express = require('express');
const http = require('http');
const path = require('path');
const dgram = require('dgram');
const Splitter = require('stream-split');
const socketIO = require('socket.io');

const NALseparator = Buffer.from([0, 0, 0, 1]); // NAL break
const splittedStream = new Splitter(NALseparator); // stream needed for splitting frames

const app = express();
const server = http.createServer(app);
// pass the server to socket.io so it can serve the client ('/socket.io/socket.io.js')
const io = socketIO(server);

// serve the html/index.html
app.use(express.static(path.join(__dirname, 'html')));
// serve the player
app.use(express.static(path.join(__dirname, '../lib')));

const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
socket.on('listening', () => {
	let address = socket.address();
	console.log(
		'udp socket listening on ' + address.address + ':' + address.port
	);
});
socket.on('message', (msg) => {
	splittedStream.write(msg);
});
socket.bind(4000);

io.on('connection', (socket) => {
	console.log('io: user connected');

	socket.on('disconnect', () => {
		console.log('io: user disconnected');
	});

	splittedStream.on('data', (msg) => {
		socket.emit('video', Buffer.concat([NALseparator, msg]));
	});
});

server.listen(3000);

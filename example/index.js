const express = require('express');
const path = require('path');
const dgram = require('dgram');
const stream = require('stream');
const Splitter = require('stream-split');
const socketIO = require('socket.io');

var app = express();

// stream splitter, broadcasting, and player signaling
const NALseparator = Buffer.from([0, 0, 0, 1]); // NAL break

// serve the html/index.html
app.use(express.static(path.resolve(__dirname, 'html')));
// serve the player
app.use(express.static(path.resolve(__dirname, '../lib')));

var updSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

updSocket.on('listening', () => {
	let address = updSocket.address();
	console.log(
		'udp socket listening on ' + address.address + ':' + address.port
	);
});

var udpStream = new stream.Readable({
	// The read logic is omitted since the data is pushed to the socket
	// outside of the script's control. However, the read() function
	// must be defined.
	read() {},
});

updSocket.on('message', (msg) => {
	// Push the data on the readable queue
	udpStream.push(msg);
});

var splittedStream = udpStream.pipe(new Splitter(NALseparator)); // split frames

updSocket.bind(3000);

var io = new socketIO(4000, {
	path: '/video',
});

io.on('connection', (socket) => {
	console.log('socketIO: a user connected');

	socket.on('disconnect', () => {
		console.log('socketIO: a user disconnected');
	});

	splittedStream.on('data', (msg) => {
		socket.emit('frame', Buffer.concat([NALseparator, msg]));
	});
});

app.listen(5000, () => {
	console.log('example app listening on port 5000');
});

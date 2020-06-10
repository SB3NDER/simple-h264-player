'use strict';

const Player = require('Broadway/Player');
const { EventEmitter } = require('events');

class H264Player extends EventEmitter {
	constructor(node, { useWorker, workerFile } = {}) {
		super();

		this.AvcPlayer = new Player({
			useWorker,
			workerFile,
			size: {
				width: 1280,
				height: 960,
			},
		});

		this.canvas = this.AvcPlayer.canvas;

		// copy attributes
		node.attributes.forEach((attr) => {
			if (this.canvas.getAttribute(attr.nodeName) === null) {
				// if attribute is not already setted
				this.canvas.setAttribute(attr.nodeName, attr.nodeValue);
			}
		});
		node.replaceWith(this.canvas);

		this.frameBuffer = [];
		//this.frameBufferLenght = 30;
		this.running = false;
		this.shiftFrameTimeout;
		this.timeout = 500;
	}

	setFrame(data) {
		const frame = new Uint8Array(data);

		if (!frame) return; // invalid frame

		this.frameBuffer.push(frame);

		if (!this.running) {
			this.running = true;
			requestAnimationFrame(this.shiftFrame);
		}
	}

	shiftFrame = () => {
		if (!this.running) {
			return;
		}

		if (this.frameBuffer.length > 30) {
			console.debug('Dropping frames', this.frameBuffer.length);

			const vI = this.frameBuffer.findIndex((e) => (e[4] & 0x1f) === 7); // wat?

			if (vI >= 0) {
				this.frameBuffer = this.frameBuffer.slice(vI);
			}
		}

		const frame = this.frameBuffer.shift();

		if (frame) {
			this.emit('frameShift', this.frameBuffer.length);
			clearTimeout(this.shiftFrameTimeout);
			this.AvcPlayer.decode(frame);

			// last frame
			if (this.frameBuffer.length == 0) {
				this.shiftFrameTimeout = setTimeout(() => {
					this.running = false;
					this.canvas.width = this.canvas.width; // clear the canvas
				}, this.timeout);
			}
		}

		requestAnimationFrame(this.shiftFrame);
	};
}
export default H264Player;

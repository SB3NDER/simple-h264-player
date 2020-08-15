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

		// copy existing html attributes
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
		this.timeout = 800;
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
			console.debug('dropping frames', this.frameBuffer.length);

			const vI = this.frameBuffer.findIndex((e) => (e[4] & 0x1f) === 7);

			if (vI >= 0) {
				this.frameBuffer = this.frameBuffer.slice(vI);
			}
		}

		const frame = this.frameBuffer.shift();

		if (frame) {
			if (this.shiftFrameTimeout !== null) clearTimeout(this.shiftFrameTimeout);

			this.emit('frameShift', this.frameBuffer.length);

			this.AvcPlayer.decode(frame);

			// last frame
			if (this.frameBuffer.length == 0) {
				this.shiftFrameTimeout = setTimeout(() => {
					console.debug('frame timed out', this.timeout, 'ms');

					this.running = false;

					// clear the canvas

					// clear 2d context
					this.canvas.height = this.canvas.height;

					// clear webgl context
					let ctx = player.canvas.getContext('webgl'); // get context
					if (ctx !== null) {
						//ctx.clearColor(0.0, 0.0, 0.0, 0.0); // set the clear color (trasparent)
						ctx.clear(ctx.COLOR_BUFFER_BIT); // clear where the displayed image is stored
					}
				}, this.timeout);
			}
		}

		requestAnimationFrame(this.shiftFrame);
	};
}
export default H264Player;

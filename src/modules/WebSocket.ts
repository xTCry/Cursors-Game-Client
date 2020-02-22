import { w3cwebsocket as WS, ICloseEvent } from 'websocket';
import { EventEmitter } from 'events';

declare interface WebSocket {
    on(event: 'onOpen', listener: (name: WS) => void): this;
    on(event: 'onClose', listener: (event: ICloseEvent) => void): this;
    on(event: 'onError', listener: (error: Error) => void): this;
    on(event: 'onMessage', listener: (data: ArrayBuffer) => void): this;
}

class WebSocket extends EventEmitter {
    private ws?: WS;
    private url: string;
    private shouldReconnect: boolean = true;
    private timeoutID?: any;
    public attempts: number = 1;

    constructor(url: string = 'ws://127.0.0.1:8005') {
        super();
        this.url = url;
    }

    public Start(reconnect: boolean = true) {
        this.shouldReconnect = reconnect;
        this.Run();
    }

    public Stop() {
        this.shouldReconnect = false;
        clearTimeout(this.timeoutID);
        this.ws?.close();
    }

    private Run() {
        this.ws = new WS(this.url);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
            this.attempts = 1;
            this.emit('onOpen', this.ws);
        };

        this.ws.onclose = (event: ICloseEvent) => {
            this.emit('onClose', event);

            if (this.shouldReconnect) {
                let time = this.generateInterval(this.attempts);
                this.timeoutID = setTimeout(() => {
                    this.attempts += 1;
                    this.Run();
                }, time);
            }
        };

        this.ws.onerror = (error: Error) => {
            this.emit('onError', error);
        };

        this.ws.onmessage = ({ data }) => {
            this.emit('onMessage', data);
        };
    }

    private generateInterval(k: number) {
        return Math.min(30, Math.pow(2, k) - 1) * 1e3;
    }

    public Send(data: ArrayBuffer) {
        this.ws?.send(data);
    }

    public get readyState(): number {
        return this.ws?.readyState || -1;
    }
}

const webSocket = new WebSocket();
export { WebSocket, webSocket as default };

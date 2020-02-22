import { ICloseEvent } from "websocket";

class Game {
    constructor() {}

    OnOpen() {
        console.log('Connected');
    }

    OnClose(event: ICloseEvent) {
        console.log(`Websocket disconnected. Reason: [${event.code}] ${event.reason}`);
    }

    OnMessage(data: ArrayBuffer) {
        console.log('Message:', Buffer.from(data));
    }
}

const game = new Game();
export { Game, game as default };

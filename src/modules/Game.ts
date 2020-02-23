import { ICloseEvent } from 'websocket';
import { BufferReader, BufferWriter } from '../tools/Buffer';
import { ServerMsg, ClientMsg, IPlayersList } from '../Types';
import webSocket from './WebSocket';
import Player from './Player/Player';
import MainPlayer from './Player/MainPlayer';
import Circles from './Circles';

class Game {
    public mainPlayer: MainPlayer = new MainPlayer();
    public circles: Circles = new Circles();
    public context!: CanvasRenderingContext2D;

    private reqAnimFrame: number = 0;
    public frameTick: number = Date.now();
    public posTick: number = 0;

    public playersOnline: number = 0;
    public playersList: IPlayersList = {};
    public sync: number = 0;
    public isStartedGame: boolean = false;


    Send(data: ArrayBuffer) {
        webSocket.Send(data);
    }

    OnOpen = () => {
        console.log('Connected');
    };

    OnClose = (event: ICloseEvent) => {
        console.log(`Websocket disconnected. Reason: [${event.code}] ${event.reason}`);
    };

    OnMessage = (data: ArrayBuffer) => {
        const reader = new BufferReader(data);
        const type = reader.readU();

        switch (type) {
            case ServerMsg.SET_CLIENT_ID:
                this.mainPlayer.SetID(reader.readU(32));
                break;

            case ServerMsg.UPDATE_DATA:
                this.OnUpdateData(reader);
                break;

            case ServerMsg.TELEPORT_CLIENT:
                this.mainPlayer.SetMainPosition(reader.readU(16), reader.readU(16));
                this.sync = reader.readU(32);
                break;
        }
    };

    OnUpdateData(reader: BufferReader) {
        const pCount = reader.readU(16);

        let playerIDs = Object.keys(this.playersList).map(Number);

        for (let i = 0; i < pCount; i++) {
            const id = reader.readU(32);
            const pos = { x: reader.readU(16), y: reader.readU(16) };
            const color = `#${reader
                .readU(32)
                .toString(16)
                .padStart(6, '0')}`;

            if (this.mainPlayer.PlayerID !== id) {
                if (this.playersList[id]) {
                    // TODO: correct this ↓
                    playerIDs = playerIDs.filter(e => e !== id);

                    const player = this.playersList[id];
                    player.UpdatePos(pos);
                    player.color = color;
                } else {
                    this.playersList[id] = new Player(pos, id, color);
                }
            }
        }

        for (const id of playerIDs) {
            delete this.playersList[id];
        }

        this.circles.Read(reader);

        this.playersOnline = reader.readU(16);
    }

    OnMouseMove = (e: MouseEvent) => {
        const { offsetX, offsetY } = e;
        this.mainPlayer.SetPosition(offsetX, offsetY);

        this.mainPlayer.CursorMove();
        // TODO: check collision

        if (!this.isStartedGame) return;

        // TODO: check draw and pos
    };

    OnMouseDown = (e: MouseEvent) => {
        if (!this.isStartedGame) {
            this.isStartedGame = true;

            if (this.mainPlayer.posXserver >= 0) {
                this.mainPlayer.SetMainPosition(this.mainPlayer.posXserver, this.mainPlayer.posYserver);
            }

            this.SendMousePos();
        } else if (
            this.circles.check &&
            this.mainPlayer.posXghost === this.mainPlayer.posXplayer &&
            this.mainPlayer.posYghost === this.mainPlayer.posYplayer
        ) {
            this.circles.Add(this.mainPlayer.posXplayer, this.mainPlayer.posYghost);
            this.SendClick(this.mainPlayer.posXplayer, this.mainPlayer.posYghost);
        }
    };

    SetContext(context: CanvasRenderingContext2D) {
        this.context = context;
        this.StartRender();
    }

    StartRender() {
        this.StopRender();
        this.reqAnimFrame = requestAnimationFrame(() => this.RenderFrame());
    }

    StopRender() {
        if (!this.reqAnimFrame) {
            cancelAnimationFrame(this.reqAnimFrame);
            this.reqAnimFrame = 0;
        }
    }

    RenderFrame() {
        this.frameTick = Date.now();
        if (this.frameTick - this.posTick > 50) {
            this.posTick = this.frameTick;
            this.SendMousePos();
        }

        const c = this.context;
        if (!c) return;

        c.clearRect(0, 0, 800, 600);
        c.save();

        if (webSocket.readyState !== WebSocket.OPEN || !this.isStartedGame) {
            let text = 'Click to start';
            switch (webSocket.readyState) {
                case WebSocket.CONNECTING:
                    text = 'Search satellite ...';
                    break;
                case WebSocket.CLOSING:
                case WebSocket.CLOSED:
                    text = 'Lost connection with the satellite';
                    break;
            }
            c.font = '45px GGAM';
            c.fillText(text, 400 - c.measureText(text).width / 2, 315);

            this.circles.Draw(c);
            this.mainPlayer.Draw(c, false);
        } else {
            c.fillStyle = "#000000";
            c.save();
            c.globalAlpha = 1;
            
            // TODO: Draw objects

		    c.restore();

            let tempText = '';
            if (this.playersOnline > 0) {
                tempText = 'Online: ' + this.playersOnline;
                const offsetX = c.measureText(tempText).width;

                c.globalAlpha = 0.5;
                c.strokeText(tempText, 790 - offsetX, 590);

                c.globalAlpha = 1;
                c.fillText(tempText, 790 - offsetX, 590);
            }

            this.circles.Draw(c);
            Player.Draw(c, this.playersList);
            this.mainPlayer.Draw(c);
        }

        c.restore();
        this.reqAnimFrame = requestAnimationFrame(() => this.RenderFrame());
    }

    SendMousePos(x?: number, y?: number) {
        if (!this.isStartedGame) return;
        this.mainPlayer.SendMousePos(x, y);
    }

    SendClick(x: number, y: number) {
        const fastBuff = BufferWriter.fast([[ClientMsg.CLICK], [x, 16], [y, 16], [this.sync, 32]]);
        this.Send(fastBuff);
    }
}

const game = new Game();
export { Game, game as default };

import { ICloseEvent } from 'websocket';
import { BufferReader, BufferWriter } from '../tools/Buffer';
import { ServerMsg, ClientMsg } from '../Types';
import webSocket from './WebSocket';
import MainPlayer from './Player/MainPlayer';
import CursorSRC from './Player/cursor.png';
import Circles from './Circles';

class Game {
    public mainPlayer: MainPlayer = new MainPlayer();
    public circles: Circles = new Circles();
    public CursorIMG: HTMLImageElement = new Image();
    public context!: CanvasRenderingContext2D;

    private reqAnimFrame: number = 0;

    public playersCount: number = 0;
    public ttl: number = 0;
    public isStartedGame: boolean = false;

    constructor() {
        this.CursorIMG.src = CursorSRC;
    }

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
        console.log('Msg type:', type);

        switch (type) {
            case ServerMsg.SET_CLIENT_ID:
                this.mainPlayer.SetID(reader.readU(32));
                break;
            case ServerMsg.UPDATE_DATA:
                this.playersCount = reader.readU16();

                this.circles.Read(reader);
                break;
        }
    };

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

        console.log(
            this.circles.check,
            [this.mainPlayer.posXplayer, this.mainPlayer.posYplayer],
            [this.mainPlayer.posXghost, this.mainPlayer.posYghost]
        );
        
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

            this.mainPlayer.Draw(c, false);
        } else {
            let tempText = '';
            if (this.playersCount > 0) {
                tempText = 'Online: ' + this.playersCount;
                const offsetX = c.measureText(tempText).width;

                c.globalAlpha = 0.5;
                c.strokeText(tempText, 790 - offsetX, 590);

                c.globalAlpha = 1;
                c.fillText(tempText, 790 - offsetX, 590);
            }

            this.mainPlayer.Draw(c);
        }

        this.circles.Draw(c);

        c.restore();
        this.reqAnimFrame = requestAnimationFrame(() => this.RenderFrame());
    }

    SendMousePos(x?: number, y?: number) {
        if (!this.isStartedGame) return;
        this.mainPlayer.SendMousePos(x, y);
    }

    SendClick(x: number, y: number) {
        const fastBuff = BufferWriter.fast([[ClientMsg.CLICK], [x, 16], [y, 16], [this.ttl, 32]]);
        this.Send(fastBuff);
    }
}

const game = new Game();
export { Game, game as default };

import { ICloseEvent } from 'websocket';
import { BufferReader, BufferWriter } from '../tools/Buffer';
import { ServerMsg, ClientMsg, IPlayersList } from '../Types';
import webSocket from './WebSocket';
import Player from './Player/Player';
import MainPlayer from './Player/MainPlayer';
import Clicks from './Clicks';
import Level from './Level';
import { isOldClient } from '../tools/Helpers';
import Lines from './Lines';

class Game {
    public mainPlayer: MainPlayer = new MainPlayer();
    public level: Level = new Level();
    public clicks: Clicks = new Clicks();
    public lines: Lines = new Lines();
    public context!: CanvasRenderingContext2D;

    private reqAnimFrame: number = 0;
    public frameTick: number = Date.now();
    private _posTick: number = 0;

    public playersOnline: number = 0;
    public countPlayerInLevel: number = 0;
    public playersList: IPlayersList = {};
    public sync: number = 0;
    public isStartedGame: boolean = false;
    public isMouseDown: boolean = false;
    public isMouseLocked: boolean = false;

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

            case ServerMsg.LOAD_LEVEL:
                this.OnLevelLoad(reader);
                break;

            case ServerMsg.TELEPORT_CLIENT:
                this.mainPlayer.SetMainPosition(reader.readU(16), reader.readU(16));
                this.sync = reader.readU(32);
                break;
        }
    };

    OnUpdateData(reader: BufferReader) {
        const pCount = (this.countPlayerInLevel = reader.readU(16));

        let playersID = Object.keys(this.playersList).map(Number);
        for (let i = 0; i < pCount; i++) {
            const id = reader.readU(32);
            const pos = { x: reader.readU(16), y: reader.readU(16) };
            const color = !isOldClient
                ? `#${reader
                      .readU(32)
                      .toString(16)
                      .padStart(6, '0')}`
                : 'white';

            if (this.mainPlayer.PlayerID !== id) {
                if (this.playersList[id]) {
                    // TODO: correct this ↓
                    playersID = playersID.filter(e => e !== id);

                    const player = this.playersList[id];
                    player.UpdatePos(pos);
                    player.color = color;
                } else {
                    this.playersList[id] = new Player(pos, id, color);
                }
            }
        }
        for (const id of playersID) {
            delete this.playersList[id];
        }

        this.clicks.Read(reader);

        this.level.UpdateGameObjects(reader);

        this.lines.Read(reader);

        this.playersOnline = reader.readU(16);
    }

    OnLevelLoad(reader: BufferReader) {
        this.ResetData();

        this.mainPlayer.SetMainPosition(reader.readU(16), reader.readU(16));

        this.level.LoadObjects(reader);

        this.sync = Math.max(this.sync, reader.readU(32));

        this.mainPlayer.CursorMove();
    }

    ResetData() {
        this.level.Reset();
        this.clicks.Reset();
        this.lines.Reset();
    }

    OnMouseMove = (e: MouseEvent) => {
        if (this.IsMouseLock()) {
            //@ts-ignore
            const _X = e.webkitMovementX || e.mozMovementX || e.movementX || 0;
            //@ts-ignore
            const _Y = e.webkitMovementY || e.mozMovementY || e.movementY || 0;
            if (300 > Math.abs(_X) + Math.abs(_Y)) {
                this.mainPlayer.SetPosition(this.mainPlayer.posXlocal + _X, this.mainPlayer.posYlocal + _Y);
            }
        } else {
            const { offsetX, offsetY } = e;
            this.mainPlayer.SetPosition(offsetX, offsetY);
        }

        this.mainPlayer.CursorMove();
        // TODO: check collision

        if (!this.isStartedGame) return;

        this.mainPlayer.FixPosition();

        if (this.isMouseDown) {
            this.lines.OnDraw();
        }
    };

    OnMouseDown = (e: MouseEvent) => {
        if (this.IsMouseLock()) {
            if (!this.isMouseLocked) {
                this.isMouseLocked = true;
                this.mainPlayer.SetMainPosition(this.mainPlayer.posXplayer, this.mainPlayer.posYplayer);
            }
        } else {
            this.isMouseLocked = false;
            if (true) {
                this.RequestPointLock();
            }
        }

        if (!this.isStartedGame) {
            this.isStartedGame = true;

            if (this.mainPlayer.posXserver >= 0) {
                this.mainPlayer.SetMainPosition(this.mainPlayer.posXserver, this.mainPlayer.posYserver);
            }

            this.SendMousePos();
        } else if (e.ctrlKey || e.shiftKey) {
            this.OnMouseMove(e);
            this.isMouseDown = true;
            this.lines.UpdatePos();
        } else if (
            this.clicks.check &&
            this.mainPlayer.posXghost === this.mainPlayer.posXplayer &&
            this.mainPlayer.posYghost === this.mainPlayer.posYplayer
        ) {
            this.clicks.Add(this.mainPlayer.posXplayer, this.mainPlayer.posYplayer);
            this.SendClick(this.mainPlayer.posXplayer, this.mainPlayer.posYplayer);
        }
    };

    OnMouseUp = () => {
        this.isMouseDown = false;
    };

    // Override
    IsMouseLock = (): boolean => false;

    // Override
    RequestPointLock = () => {};

    SetContext(context: CanvasRenderingContext2D) {
        this.context = context;
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
        if (this.frameTick - this._posTick > 50) {
            this._posTick = this.frameTick;
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

            this.clicks.Draw(c);
            this.mainPlayer.Draw(c, false);
        } else {
            c.fillStyle = '#000000';

            this.level.Draw(c);

            c.font = '12px PANEM';
            c.strokeStyle = '#000000';
            c.fillStyle = '#FFFFFF';
            c.lineWidth = 2.5;

            let tempText = '';
            tempText =
                this.countPlayerInLevel >= 100
                    ? 'Area too full, not all cursors are shown'
                    : this.countPlayerInLevel > 30
                    ? 'Area too full, drawing is disabled'
                    : 'Use Shift+click to draw';

            c.globalAlpha = 0.5;
            c.strokeText(tempText, 10, 590);
            c.globalAlpha = 1;
            c.fillText(tempText, 10, 590);

            if (this.playersOnline > 0) {
                tempText = 'Online: ' + this.playersOnline;
                const offsetX = c.measureText(tempText).width;

                c.globalAlpha = 0.5;
                c.strokeText(tempText, 790 - offsetX, 590);

                c.globalAlpha = 1;
                c.fillText(tempText, 790 - offsetX, 590);
            }

            this.clicks.Draw(c);
            this.lines.Draw(c);

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

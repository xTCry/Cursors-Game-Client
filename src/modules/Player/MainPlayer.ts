import { BufferWriter } from '../../tools/Buffer';
import { ClientMsg } from '../../Types';
import game from '../Game';
import { normalizePosition, checkPos, CursorDraw } from './Player';

export default class MainPlayer {
    public PlayerID: number = -1;
    public color: string = 'white';

    // Full: 0...800, 0...600
    public posXlocal: number = 0;
    public posYlocal: number = 0;

    // Half: 0...400, 0...300
    public posXplayer: number = 0;
    public posYplayer: number = 0;

    // Ghost position. Half: 0...400, 0...300
    public posXghost: number = 0;
    public posYghost: number = 0;

    // Positin from server. Half: 0...400, 0...300
    public posXserver: number = -1;
    public posYserver: number = -1;

    SetID(id: number, color: string = 'white') {
        this.PlayerID = id;
        this.color = color;
        console.log('New PlayerID:', this.PlayerID);
    }

    SetPosition(x: number, y: number) {
        this.posXlocal = x;
        this.posYlocal = y;

        this.posXghost = x >> 1;
        this.posYghost = y >> 1;
    }

    SetMainPosition(x: number, y: number) {
        this.posXserver = this.posXplayer = x;
        this.posYserver = this.posYplayer = y;
        this.SendMousePos(x, y);
    }

    SendMousePos(x: number = this.posXplayer, y: number = this.posYplayer) {
        if (x !== this.posXserver || y !== this.posYserver) {
            const fastBuff = BufferWriter.fast([[ClientMsg.MOVE], [x, 16], [y, 16], [game.sync, 32]]);

            game.Send(fastBuff);

            this.posXserver = x;
            this.posYserver = y;
        }
    }

    CursorMove() {
        const lastX = this.posXplayer;
        const lastY = this.posYplayer;

        if (this.posXplayer !== this.posXghost || this.posYplayer !== this.posYghost) {
            const { x, y } = normalizePosition(this.posXplayer, this.posYplayer, this.posXghost, this.posYghost);
            this.posXplayer = x;
            this.posYplayer = y;
        }

        if (
            checkPos(this.posXserver, this.posYserver, lastX, lastY) &&
            !checkPos(this.posXserver, this.posYserver, this.posXplayer, this.posYplayer)
        ) {
            this.SendMousePos(lastX, lastY);
            this.SendMousePos(this.posXplayer, this.posYplayer);
            console.log('Triggered WH');
        }
    }

    Draw(c: CanvasRenderingContext2D, drawAreaGlow: boolean = true) {
        const [x, y] = [this.posXplayer << 1, this.posYplayer << 1];

        c.save();

        if (drawAreaGlow) {
            c.globalAlpha = 0.2;
            c.fillStyle = '#FFFF00';
            c.beginPath();
            c.arc(x + 2, y + 8, 20, 0, 2 * Math.PI, false);
            c.fill();
        }

        c.globalAlpha = 1;
        new CursorDraw({ x, y }, 'white').Draw(c);

        c.restore();
    }
}

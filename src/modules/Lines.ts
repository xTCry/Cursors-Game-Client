import { BufferReader, BufferWriter } from '../tools/Buffer';
import game from './Game';
import { ClientMsg } from '../Types';
import webSocket from './WebSocket';

type IPoint = [number, number];
type ILine = [number, number, number, number];
type ILineTick = [number, number, number, number, number];

export default class Lines {
    private points: Array<ILineTick> = [];
    private timeDraw: number = 0;
    private posDown: IPoint = [0, 0];

    public Read(reader: BufferReader) {
        const linesCounts = reader.readU16();
        let lines: Array<ILine> = [];
        for (let i = 0; i < linesCounts; i++) {
            lines.push([reader.readU16() << 1, reader.readU16() << 1, reader.readU16() << 1, reader.readU16() << 1]);
        }

        setTimeout(() => {
            for (const line of lines) {
                //@ts-ignore
                this.points.push([...line, game.frameTick]);
            }
        }, 10);
    }

    public Draw(c: CanvasRenderingContext2D) {
        c.save();
        c.strokeStyle = '#000000';
        c.lineWidth = 1;

        for (const point of this.points) {
            const [startX, startY, endX, endY, time] = point;
            let alpha = 10 - (game.frameTick - time) / 1e3;

            if (alpha <= 0) {
                this.points.splice(this.points.indexOf(point), 1);
            } else {
                if (alpha > 1) alpha = 1;
                c.globalAlpha = 0.3 * alpha;
                c.beginPath();
                c.moveTo(startX - 0.5, startY - 0.5);
                c.lineTo(endX - 0.5, endY - 0.5);
                c.stroke();
            }
        }

        c.restore();
    }

    public Reset() {
        this.points = [];
    }

    public UpdatePos() {
        this.posDown = [game.mainPlayer.posXplayer, game.mainPlayer.posYplayer];
    }

    public OnDraw() {
        const [downX, downY] = this.posDown;
        const [playerX, playerY] = [game.mainPlayer.posXplayer, game.mainPlayer.posYplayer];

        if ((downX !== playerX || downY !== playerY) && 50 < game.frameTick - this.timeDraw) {
            if (webSocket.readyState === WebSocket.OPEN) {
                const fastBuff = BufferWriter.fast([
                    [ClientMsg.DRAW],
                    [downX, 16],
                    [downY, 16],
                    [playerX, 16],
                    [playerY, 16],
                ]);
                game.Send(fastBuff);
            }

            this.UpdatePos();
            this.timeDraw = game.frameTick;
        }
    }
}

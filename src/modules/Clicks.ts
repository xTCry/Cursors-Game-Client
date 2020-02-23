import { BufferReader } from '../tools/Buffer';
import game from './Game';

type IClick = [number, number, number];
type ILocalClick = [number, number];

export default class Clicks {
    private points: Array<IClick> = [];
    private locals: Array<ILocalClick> = [];
    private tick: number = 0;

    Add(x: number, y: number) {
        this.tick = game.frameTick;
        this.points.push([x, y, game.frameTick]);

        const point: ILocalClick = [x, y];
        this.locals.push(point);

        setInterval(() => {
            if (this.locals.includes(point)) {
                this.locals.splice(this.locals.indexOf(point), 1);
            }
        }, 1e3);
    }

    public Read(reader: BufferReader) {
        const circleCounts = reader.readU16();
        let clicks: Array<ILocalClick> = [];
        for (let i = 0; i < circleCounts; i++) {
            clicks.push([reader.readU16(), reader.readU16()]);
        }

        setTimeout(() => {
            LABEL_Go: for (const [x, y] of clicks) {
                for (const point of this.locals) {
                    if (point[0] === x && point[1] === y) {
                        this.locals.splice(this.locals.indexOf(point), 1);
                        continue LABEL_Go;
                    }
                }

                this.points.push([x, y, game.frameTick]);
            }
        }, 100);
    }

    public Draw(c: CanvasRenderingContext2D) {
        c.save();
        c.strokeStyle = '#000000';

        for (const point of this.points) {
            const [x, y, time] = point;

            let radius = (game.frameTick - time) / 1e3;
            let alpha = 1 - 2 * radius;

            if (alpha <= 0) {
                this.points.splice(this.points.indexOf(point), 1);
            } else {
                radius *= 50;
                c.beginPath();
                c.globalAlpha = 0.3 * alpha;
                c.arc(x << 1, y << 1, radius, 0, 2 * Math.PI, false);
                c.stroke();
            }
        }

        c.restore();
    }

    public get check() {
        return game.frameTick - this.tick > 100;
    }
}

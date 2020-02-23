import { BufferReader } from '../tools/Buffer';
import game from './Game';

type ICircles = [number, number, number];
type IRemoteCircles = [number, number];

export default class Circles {
    private points: Array<ICircles> = [];
    private remote: Array<IRemoteCircles> = [];
    private tick: number = 0;

    Add(x: number, y: number, e: boolean = true) {
        if (e) {
            this.tick = game.frameTick;
        }

        this.points.push([x, y, game.frameTick]);
        const temp: IRemoteCircles = [x, y];
        this.remote.push(temp);
        setInterval(() => {
            if (this.remote.includes(temp)) {
                this.remote.splice(this.remote.indexOf(temp), 1);
            }
        }, 1e3);
    }

    public get check() {
        return game.frameTick - this.tick > 100;
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

    public Read(reader: BufferReader) {
        const circleCounts = reader.readU16();
        let circles: Array<IRemoteCircles> = [];
        for (let i = 0; i < circleCounts; i++) {
            circles.push([reader.readU16(), reader.readU16()]);
        }

        setTimeout(() => {
            LABEL_Go: for (const [x, y] of circles) {
                for (const point of this.remote) {
                    if (point[0] === x && point[1] === y) {
                        this.remote.splice(this.remote.indexOf(point), 1);
                        continue LABEL_Go;
                    }
                }

                this.points.push([x, y, game.frameTick]);
            }
        }, 100);
    }
}

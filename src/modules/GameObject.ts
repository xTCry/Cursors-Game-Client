import { BufferReader } from '../tools/Buffer';
import { EGameObjectType, Point } from '../Types';
import { isOldClient } from '../tools/Helpers';
import game from './Game';

export abstract class GameObject {
    public readonly id: number;
    public readonly type: EGameObjectType;

    constructor(id: number, type: EGameObjectType) {
        this.id = id;
        this.type = type;
    }

    abstract Read(reader: BufferReader): GameObject;
    abstract Draw(c: CanvasRenderingContext2D): void;

    static Read(reader: BufferReader, id: number, obj?: GameObject): GameObject {
        const type = reader.readU();

        switch (type) {
            case EGameObjectType.TEXT:
                return (obj || new TextObject(id)).Read(reader);

            case EGameObjectType.WALL:
                return (obj || new WallObject(id)).Read(reader);

            case EGameObjectType.TELEPORT:
                return (obj || new TelepotrObject(id)).Read(reader);

            case EGameObjectType.AREA_COUNTER:
                return (obj || new AreaCounterObject(id)).Read(reader);

            default:
                throw Error(`Unknown object type [${type}]`);
        }
    }

    static ReadColor(reader: BufferReader): string {
        return `#${reader
            .readU(32)
            .toString(16)
            .padStart(6, '0')}`;
    }

    static ReadText(reader: BufferReader): string {
        let res = '',
            charCode = 0;

        if (isOldClient) {
            let byte = 0;
            while ((byte = reader.readU()) !== 0) {
                charCode <<= 8;
                charCode |= byte;

                if (!(byte & 128)) {
                    res += String.fromCharCode(charCode);
                    charCode = 0;
                }
            }
            if (0 !== charCode) {
                res += String.fromCharCode(charCode);
            }
        } else {
            while ((charCode = reader.readU(16)) !== 0) {
                res += String.fromCharCode(charCode);
                charCode = 0;
            }
        }

        return res;
    }
}

export class TextObject extends GameObject {
    private pos: Point = { x: 0, y: 0 };
    private size: number = 1;
    private isCenter: boolean = false;
    private color: string = 'black';
    private text: string = '';

    constructor(id: number) {
        super(id, EGameObjectType.TEXT);
    }

    Read(reader: BufferReader) {
        this.pos.x = reader.readU(16);
        this.pos.y = reader.readU(16);

        this.size = reader.readU();
        this.isCenter = !!reader.readU();
        if (!isOldClient) {
            this.color = GameObject.ReadColor(reader);
        }
        this.text = GameObject.ReadText(reader);

        return this;
    }

    Draw(c: CanvasRenderingContext2D) {
        c.font = this.size + 'px GGAM';
        let [x, y] = [this.pos.x << 1, this.pos.y << 1];

        c.fillStyle = this.color;

        this.isCenter && (x -= c.measureText(this.text).width / 2);
        c.strokeStyle = !this.color.includes('000000') ? '#000000' : '#FFFFFF';

        c.strokeText(this.text, x, y);
        c.fillText(this.text, x, y);
    }
}

export class WallObject extends GameObject {
    public pos: Point = { x: 0, y: 0 };
    public size: Point = { x: 0, y: 0 };
    private color: string = 'black';

    constructor(id: number) {
        super(id, EGameObjectType.WALL);
    }

    Read(reader: BufferReader) {
        this.pos.x = reader.readU(16);
        this.pos.y = reader.readU(16);
        this.size.x = reader.readU(16);
        this.size.y = reader.readU(16);

        this.color = GameObject.ReadColor(reader);

        game.level.UpdateWallZone(this.pos.x, this.pos.y, this.size.x, this.size.y, 1);

        return this;
    }

    Draw(c: CanvasRenderingContext2D) {
        let [x, y] = [this.pos.x << 1, this.pos.y << 1];
        let [w, h] = [this.size.x << 1, this.size.y << 1];

        c.fillStyle = this.color;
        c.fillRect(x, y, w, h);

        c.strokeStyle = '#000000';
        c.globalAlpha = 0.2;
        c.lineWidth = 2;
        c.strokeRect(x + 1, y + 1, w - 2, h - 2);
        c.globalAlpha = 1;
    }
}

export class TelepotrObject extends GameObject {
    private pos: Point = { x: 0, y: 0 };
    private size: Point = { x: 0, y: 0 };
    private isBad: boolean = false;

    constructor(id: number) {
        super(id, EGameObjectType.WALL);
    }

    Read(reader: BufferReader) {
        this.pos.x = reader.readU(16);
        this.pos.y = reader.readU(16);
        this.size.x = reader.readU(16);
        this.size.y = reader.readU(16);

        this.isBad = !!reader.readU();

        return this;
    }

    Draw(c: CanvasRenderingContext2D) {
        let [x, y] = [this.pos.x << 1, this.pos.y << 1];
        let [w, h] = [this.size.x << 1, this.size.y << 1];

        c.fillStyle = this.isBad ? '#FF0000' : '#00FF00';
        c.globalAlpha = 0.2;
        c.fillRect(x, y, w, h);
        c.globalAlpha = 1;
    }
}

export class AreaCounterObject extends GameObject {
    private pos: Point = { x: 0, y: 0 };
    private size: Point = { x: 0, y: 0 };
    private count: number = 0;
    private color: string = 'yellow';

    constructor(id: number) {
        super(id, EGameObjectType.WALL);
    }

    Read(reader: BufferReader) {
        this.pos.x = reader.readU(16);
        this.pos.y = reader.readU(16);
        this.size.x = reader.readU(16);
        this.size.y = reader.readU(16);

        this.count = reader.readU(16);
        this.color = GameObject.ReadColor(reader);

        return this;
    }

    Draw(c: CanvasRenderingContext2D) {
        let [x, y] = [this.pos.x << 1, this.pos.y << 1];
        let [w, h] = [this.size.x << 1, this.size.y << 1];
        let text = `${this.count}`;

        c.fillStyle = this.color;
        c.globalAlpha = 0.2;
        c.fillRect(x, y, w, h);
        c.globalAlpha = 0.5;
        c.fillStyle = '#000000';

        if (40 > this.size.x || 40 > this.size.y) {
            c.font = '30px GGAM';
            c.fillText(text, x + w / 2 - c.measureText(text).width / 2, y + h / 2 + 10);
        } else {
            c.font = '60px GGAM';
            c.fillText(text, x + w / 2 - c.measureText(text).width / 2, y + h / 2 + 20);
        }

        c.globalAlpha = 1;
    }
}

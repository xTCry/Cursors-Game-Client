import { BufferReader } from '../tools/Buffer';
import { EGameObjectType, Point } from '../Types';
import { isOldClient } from '../tools/Helpers';

abstract class GameObject {
    public readonly id: number;
    public readonly type: EGameObjectType;

    constructor(id: number, type: EGameObjectType) {
        this.id = id;
        this.type = type;
    }

    abstract Read(reader: BufferReader): GameObject;
    abstract Draw(c: CanvasRenderingContext2D): void;

    static Read(reader: BufferReader): GameObject {
        const id = reader.readU(32);
        const type = reader.readU();

        switch (type) {
            case EGameObjectType.TEXT:
                return new TextObject(id).Read(reader);

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

class TextObject extends GameObject {
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

        console.log(`Text: ${this.text}`);

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

export { GameObject };

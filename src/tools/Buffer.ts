import { inspect } from 'util';

type ISizes = 8 | 16 | 32 | 64;

export class BufferWriter {
    private buffer: Buffer;

    constructor() {
        this.buffer = Buffer.alloc(0);
    }

    public writeBuffer(b: Buffer) {
        this.buffer = Buffer.concat([this.buffer, b]);
    }

    public writeU(bit: number, size: ISizes = 8) {
        const buff = BufferWriter.writeUx(bit, size);
        this.buffer = Buffer.concat([this.buffer, buff]);
    }

    public writeU8(b: number) {
        this.writeU(b);
    }

    public writeU16(b: number) {
        this.writeU(b, 16);
    }

    public writeU32(b: number) {
        this.writeU(b, 32);
    }

    public static writeUx(b: number, size: ISizes = 8): Buffer {
        const buff = Buffer.alloc(size / 8);
        for (let i = 0; i < size / 8; i++) {
            buff[i] = (b >> (i * 8)) & 0xff;
        }
        return buff;
    }

    public get get(): Buffer {
        return Buffer.from(this.buffer);
    }

    public [inspect.custom](): Buffer {
        return this.get;
    }

    public static fast(arr: Array<[number, ISizes] | [number]>): Buffer {
        let buff = Buffer.alloc(0);
        for (const [bit, size] of arr) {
            buff = Buffer.concat([buff, BufferWriter.writeUx(bit, size)]);
        }
        return buff;
    }
}

export class BufferReader {
    private cursor: number = 0;
    private dv: DataView;

    constructor(buff: Buffer | ArrayBuffer) {
        const arrayBuff = buff instanceof ArrayBuffer ? buff : this.toArrayBuffer(buff);
        this.dv = new DataView(arrayBuff);
    }

    public readU8() {
        return this.dv.getUint8(this.cursor++);
    }

    public readU16() {
        this.cursor += 2;
        return this.dv.getUint16(this.cursor - 2, true);
    }

    public readU32() {
        this.cursor += 4;
        return this.dv.getUint32(this.cursor - 4, true);
    }

    public readU64() {
        this.cursor += 8;
        return this.dv.getBigUint64(this.cursor - 8, true);
    }

    public readU(size: ISizes = 8): number {
        // @ts-ignore
        return this[`readU${size}`]();
    }

    public toArrayBuffer(buffer: Buffer): ArrayBuffer {
        const arrayBuff = new ArrayBuffer(buffer.length);
        let view = new Uint8Array(arrayBuff);
        for (let i = 0; i < buffer.length; ++i) {
            view[i] = buffer[i];
        }
        return arrayBuff;
    }
}

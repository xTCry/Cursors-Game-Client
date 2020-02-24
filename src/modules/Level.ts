import { BufferReader } from '../tools/Buffer';
import { GameObject } from './GameObject';

export default class Level {
    private clearedData: Uint8Array = new Uint8Array(12e4);
    private wallCollision: Uint8Array = new Uint8Array(12e4);
    private gameObjects: Array<GameObject> = [];

    Reset() {
        this.clearedData = new Uint8Array(12e4);
        this.wallCollision = new Uint8Array(12e4);
        this.gameObjects = [];
    }

    LoadObjects(reader: BufferReader) {
        const countObjects = reader.readU(16);
        for (let i = 0; i < countObjects; i++) {
            try {
                const obj = GameObject.Read(reader);
                this.gameObjects.push(obj);
            } catch (e) {
                console.log(e);
            }
        }
    }

    Draw(c: CanvasRenderingContext2D) {
        c.save();
        c.globalAlpha = 1;

        for (const obj of this.gameObjects) {
            obj.Draw(c);
        }

        c.restore();
    }
}

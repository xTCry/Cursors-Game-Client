import { BufferReader } from '../tools/Buffer';
import { GameObject, WallObject } from './GameObject';
import { EGameObjectType } from '../Types';

export default class Level {
    public wallCollision: Uint8Array = new Uint8Array(12e4);
    private gameObjects: Array<GameObject> = [];

    Reset() {
        this.wallCollision.set(new Uint8Array(12e4));
        this.gameObjects = [];
    }

    LoadObjects(reader: BufferReader) {
        const countObjects = reader.readU(16);
        for (let i = 0; i < countObjects; i++) {
            try {
                const id = reader.readU(32);
                const obj = GameObject.Read(reader, id);
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

    UpdateGameObjects(reader: BufferReader) {
        const countRemoved = reader.readU(16);
        for (let i = 0; i < countRemoved; i++) {
            const id = reader.readU(32);

            RWL: for (const obj of this.gameObjects) {
                if (obj.id === id) {
                    if (obj.type === EGameObjectType.WALL) {
                        const wallObj = obj as WallObject;

                        let [x, y] = [wallObj.pos.x | 0, wallObj.pos.y | 0];
                        let [w, h] = [wallObj.size.x | 0, wallObj.size.y | 0];
                        this.UpdateWallZone(x, y, w, h, 0);
                    }

                    this.gameObjects.splice(this.gameObjects.indexOf(obj), 1);
                    break RWL;
                }
            }
        }

        const countAdded = reader.readU(16);
        for (let i = 0; i < countAdded; i++) {
            let isNew = true;
            const id = reader.readU(32);

            for (const obj of this.gameObjects) {
                if (obj.id === id) {
                    try {
                        GameObject.Read(reader, id, obj);
                        isNew = false;
                        break;
                    } catch (e) {
                        console.log(e);
                    }
                }
            }

            if (isNew) {
                try {
                    const obj = GameObject.Read(reader, id);
                    this.gameObjects.push(obj);
                } catch (e) {
                    console.log(e);
                }
            }
        }
    }

    UpdateWallZone(x: number, y: number, w: number, h: number, val: 0 | 1) {
        for (let m = y; m < y + h; ++m) {
            for (let p = x; p < x + w; ++p) {
                this.wallCollision[p + 400 * m] = val;
            }
        }
    }
}

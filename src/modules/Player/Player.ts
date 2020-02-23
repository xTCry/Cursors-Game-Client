import game from '../Game';
import { Point, IPlayersList } from '../../Types';

export default class Player {
    public PlayerID: number;
    private _pos: Point;
    private _posLast: Point;
    private tick: number = 0;

    constructor(pos: Point, id: number) {
        this._pos = this._posLast = pos;
        this.PlayerID = id;
    }

    public UpdatePos(pos: Point) {
        this._posLast = this.SmoothPos();
        this._pos = pos;
        this.tick = game.frameTick;
    }

    public SmoothPos(): Point {
        let deltaTime = (game.frameTick - this.tick) / 120;
        deltaTime = Linear(deltaTime < 0 ? 0 : deltaTime > 1 ? 1 : deltaTime);
        
        return {
            x: this._posLast.x + (this._pos.x - this._posLast.x) * deltaTime,
            y: this._posLast.y + (this._pos.y - this._posLast.y) * deltaTime,
        };
    }

    public static Draw(c: CanvasRenderingContext2D, playersList: IPlayersList) {
        for (const i in playersList) {
            if (playersList.hasOwnProperty(i)) {
                const player = playersList[i];
                const { x, y } = player.SmoothPos();
                c.drawImage(game.CursorIMG, (x << 1) - 6, (y << 1) - 6, 23, 30);
            }
        }
    }
}

function Linear(a: number): number {
    return a * a * (3 - 2 * a);
}

export function checkCollision(x: number, y: number) {
    if (!game.isStartedGame) return false;
    return 0 > x || 400 <= x || 0 > y || 300 <= y;
}

export function normalizePosition(playerX: number, playerY: number, ghostX: number, ghostY: number) {
    // double -> integer
    playerX |= 0;
    playerY |= 0;
    ghostX |= 0;
    ghostY |= 0;

    if (checkCollision(playerX, playerY)) {
        return {
            x: playerX,
            y: playerY,
        };
    }

    if (playerX === ghostX && playerY === ghostY) {
        return {
            x: ghostX,
            y: ghostY,
        };
    }

    let newX = playerX,
        newY = playerY;

    ghostX = (ghostX - playerX) | 0;
    ghostY = (ghostY - playerY) | 0;

    let x_Q = 0,
        y_Q = 0,
        x_K = 0,
        y_K = 0;

    x_K = x_Q = ghostX < 0 ? -1 : ghostX > 0 ? 1 : x_K;
    y_Q = ghostY < 0 ? -1 : ghostY > 0 ? 1 : y_Q;

    let _A = Math.abs(ghostX) | 0,
        _B = Math.abs(ghostY) | 0;

    if (_A <= _B) {
        _A = Math.abs(ghostY) | 0;
        _B = Math.abs(ghostX) | 0;

        y_K = ghostY < 0 ? -1 : ghostY > 0 ? 1 : y_K;
        x_K = 0;
    }

    ghostX = _A >> 1;
    ghostY = 0;
    for (; ghostY <= _A && !checkCollision(playerX, playerY); ghostY++) {
        newX = playerX;
        newY = playerY;
        ghostX += _B;

        if (ghostX >= _A) {
            ghostX -= _A;
            playerX += x_Q;
            playerY += y_Q;
        } else {
            playerX += x_K;
            playerY += y_K;
        }
    }

    return {
        x: newX,
        y: newY,
    };
}

import game from '../Game';
import { Point, IPlayersList } from '../../Types';

export default class Player {
    public PlayerID: number;
    public color: string;
    private _pos: Point;
    private _posLast: Point;
    private tick: number = 0;

    constructor(pos: Point, id: number, color: string = 'white') {
        this._pos = this._posLast = pos;
        this.PlayerID = id;
        this.color = color;
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
        c.save();
        for (const i in playersList) {
            if (playersList.hasOwnProperty(i)) {
                const player = playersList[i];
                let { x, y } = player.SmoothPos();
                [x, y] = [x << 1, y << 1];

                new CursorDraw({ x, y }, player.color).Draw(c);

                // Draw player ID
                c.font = '12px GGAM';
                c.fillStyle = player.color;
                c.strokeStyle = '#000000';
                c.lineWidth = 2.4;

                c.globalAlpha = 0.9;
                c.strokeText(`${player.PlayerID}`, x - 6, y + 30);
                c.globalAlpha = 1;
                c.fillText(`${player.PlayerID}`, x - 6, y + 30);
            }
        }
        c.restore();
    }
}

export class CursorDraw {
    private pos: Point;
    private color: string;

    constructor(pos: Point, color: string = 'white') {
        this.pos = pos;
        this.color = color;
    }

    Draw(c: CanvasRenderingContext2D) {
        const size = 1;
        const points = [
            [14, 14],
            [5, 14],
            [0, 19],
        ];

        const { x, y } = this.pos;

        c.lineWidth = size;
        c.strokeStyle = 'black';
        c.fillStyle = this.color;

        c.beginPath();
        c.moveTo(x, y);
        for (const [_x, _y] of points) {
            c.lineTo(x + _x * size, y + _y * size);
        }

        c.closePath();
        c.fill();
        c.stroke();
    }
}

function Linear(a: number): number {
    return a * a * (3 - 2 * a);
}

export function checkCollision(x: number, y: number) {
    if (!game.isStartedGame) return false;
    return 0 > x || 400 <= x || 0 > y || 300 <= y? true : game.level.wallCollision[x + 400 * y]
}

export function checkPos(firstX: number, firstY: number, secondX: number, secondY: number) {
    const { x, y } = normalizePosition(firstX, firstY, secondX, secondY);
    return x === secondX && y === secondY;
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

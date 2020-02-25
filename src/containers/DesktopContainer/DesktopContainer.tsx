import React, { Component } from 'react';
import game from '../../modules/Game';
import { SetRequestPointerLock, PointerIsLocked } from '../../tools/Helpers';

const { devicePixelRatio: dpr } = window;

class DesktopContainer extends Component {
    public canvas!: HTMLCanvasElement;

    componentDidMount() {
        const context: CanvasRenderingContext2D = this.canvas.getContext('2d')!;

        this.canvas.width = 800 * dpr;
        this.canvas.height = 600 * dpr;
        context.scale(dpr, dpr);

        this.canvas.addEventListener('mousemove', game.OnMouseMove);
        this.canvas.addEventListener('mousedown', game.OnMouseDown);
        this.canvas.addEventListener('mouseup', game.OnMouseUp);
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
        SetRequestPointerLock(this.canvas);

        game.IsMouseLock = () => PointerIsLocked(this.canvas);
        game.RequestPointLock = () => this.canvas.requestPointerLock();
        game.SetContext(context);
        game.StartRender();
    }

    render() {
        return (
            <>
                <div className={'canvasContainer'}>
                    <canvas className={'canvas'} ref={ref => (this.canvas = ref!)}></canvas>
                </div>
                <div className={'controls'}>
                    <label>
                        <input type="checkbox" defaultChecked={game.noCursorLock} onChange={game.OnNoCursorLock} />
                        No cursor lock
                    </label>
                    <label>
                        <input type="checkbox" defaultChecked={game.noDrawings} onChange={game.OnNoDrawings} />
                        Disable drawings
                    </label>
                </div>
            </>
        );
    }
}

export default DesktopContainer;

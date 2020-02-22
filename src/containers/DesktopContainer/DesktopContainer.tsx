import React, { Component } from 'react';
import game from '../../modules/Game';

const { devicePixelRatio: dpr } = window;

class DesktopContainer extends Component {
    public canvas!: HTMLCanvasElement;

    componentDidMount() {
        const context: CanvasRenderingContext2D = this.canvas.getContext('2d')!;

        this.canvas.width = 800 * dpr;
        this.canvas.height = 600 * dpr;
        context.scale(dpr, dpr);

        game.SetContext(context);

        this.canvas.addEventListener('mousemove', game.OnMouseMove);
        this.canvas.addEventListener('mousedown', game.OnMouseDown);
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    render() {
        return (
            <div className={'canvasContainer'}>
                <canvas className={'canvas'} ref={ref => (this.canvas = ref!)}></canvas>
            </div>
        );
    }
}

export default DesktopContainer;

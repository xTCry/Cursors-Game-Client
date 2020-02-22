import React, { Component } from 'react';
import webSocket from '../../modules/WebSocket';
import Game from "../../modules/Game";

class DesktopContainer extends Component {
    public canvas?: HTMLCanvasElement;

    componentDidMount() {
        
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

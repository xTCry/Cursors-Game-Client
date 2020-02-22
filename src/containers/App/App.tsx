import React, { Component } from 'react';
import DesktopContainer from '../DesktopContainer/DesktopContainer';
import webSocket from '../../modules/WebSocket';
import game from '../../modules/Game';

class App extends Component {
    componentDidMount() {
        webSocket.on('onOpen', game.OnOpen);
        webSocket.on('onClose', game.OnClose);
        webSocket.on('onMessage', game.OnMessage);

        webSocket.Start();
    }

    componentWillUnmount() {
        webSocket.Stop();
    }

    render() {
        return <DesktopContainer />;
    }
}

export default App;

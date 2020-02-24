import Player from './modules/Player/Player';

export enum ClientMsg {
    MOVE = 1,
    CLICK = 2,
    DRAW = 3
}

export enum ServerMsg {
    SET_CLIENT_ID = 0,
    UPDATE_DATA = 1,
    LOAD_LEVEL = 4,
    TELEPORT_CLIENT = 5,
}

export enum EGameObjectType {
    TEXT = 0,
    WALL,
    TELEPORT,
    AREA_COUNTER,
    BUTTON,
}

export interface Point {
    x: number;
    y: number;
}

export type IPlayersList = { [key: number]: Player };

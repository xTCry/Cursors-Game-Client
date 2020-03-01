export const isOldClient = process.env.REACT_APP_MODE === 'io';

export const SetRequestPointerLock = (e: any) => {
    e.requestPointerLock = e.requestPointerLock || e.mozRequestPointerLock || e.webkitRequestPointerLock;
};

export const PointerIsLocked = (e: any) =>
    e === document.pointerLockElement ||
    //@ts-ignore
    e === document.mozPointerLockElement ||
    //@ts-ignore
    e === document.webkitPointerLockElement;

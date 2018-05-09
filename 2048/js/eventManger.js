const __KeyCodeMap = {
    40: 'down',
    37: 'left',
    38: 'up',
    39: 'right'
};

class EventManager {
    constructor() {
        this.__events = Object.create(null);
        this.__gameContainer = document.querySelector('.game-container');
        this.__ownOnKeyDown = null;
        this.__ownOnClick = null;
    }

    __onKeyDown(event) {
        const dir = __KeyCodeMap[event.keyCode];
        if (dir) {
            event.preventDefault();
            this.emit('move', dir);
        }
    }
    __onClick(event) {
        const classList = event.target.classList;
        if (classList.contains('new-game')) this.emit('newGame');
        if (classList.contains('keep-going')) this.emit('keepGoing');
        if (classList.contains('restart')) this.emit('restart');
        if (classList.contains('quick-mode')) this.emit('toggleMergeStrategy');
    }

    listenKeyBoardEvent() {
        if (!this.__ownOnKeyDown) {
            this.__ownOnKeyDown = this.__onKeyDown.bind(this);
            document.addEventListener('keydown', this.__ownOnKeyDown);
        }
        return () => document.removeEventListener('keydown', this.__ownOnKeyDown);
    }
    listenClickEvent() {
        if (!this.__ownOnClick) {
            this.__ownOnClick = this.__onClick.bind(this);
            this.__gameContainer.addEventListener('click', this.__ownOnClick);
        }
        return () => this.__gameContainer.removeEventListener('click', this.__ownOnClick);
    }

    on(name, fn, context) {
        if (!this.__events[name]) {
            this.__events[name] = [];
        }
        const callbacks = this.__events[name];
        callbacks.push(fn.bind(context));
        return () => callbacks.splice(callbacks.length - 1, 1);
    }
    emit(name, data) {
        const callbacks = this.__events[name];
        if (callbacks) {
            callbacks.forEach(fn => fn(data));
        }
    }
}

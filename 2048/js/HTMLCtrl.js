class HTMLCtrl {
    constructor() {
        this.__scoreEle = document.querySelector('.score-container .score');
        this.__bestEle = document.querySelector('.score-container .best');

        this.__gameMessage = document.querySelector('.game .game-message');
        this.__winEle = this.__gameMessage.querySelector('.win');
        this.__ggEle = this.__gameMessage.querySelector('.gg');

        this.__tileContainer = document.querySelector('.game .tile-container');

        this.__toggleEle = document.querySelector('.game-menu button.quick-mode span');
    }

    addNewTile(cell) {
        const newTile = this.__templateTile(cell);
        newTile.classList.add('tile-new');
        this.__tileContainer.appendChild(newTile);
        return this;
    }
    /**
     * mergeNewTile 增加一个 tile，不会删除两个被合并的 tile，因为直接删除会导致动画失效
     * 这样一来，每次合并都会导致页面中同一个 pos 的位置出现三个 div
     * 使用高的 z-index 保证 merged-tile 出现在最外层
     * 下次移动前我们会检测每个位置上是否有重叠，有则说明出现了 merge，则把被合并的 tile 删掉，保证只移动一个 tile
     */
    mergeNewTile(cell) {
        const newTile = this.__templateTile(cell);
        newTile.classList.add('tile-merged');
        this.__tileContainer.appendChild(newTile);
        return this;
    }
    move(cell, toX, toY) {
        const className = this.__posToClass(toX, toY),
            oldClassName = this.__posToClass(cell),
            tiles = this.__tileContainer.querySelectorAll(`.${oldClassName}`);
        let target = tiles[0];
        if (tiles.length > 1) {
            for (let i = 0; i < tiles.length; ++i) {
                if (tiles[i].classList.contains('tile-merged')) {
                    target = tiles[i];
                    target.classList.remove('tile-merged');
                } else {
                    this.__tileContainer.removeChild(tiles[i]);
                }
            }
        }
        target.classList.remove(oldClassName);
        target.classList.add(className);
        return this;
    }
    clear() {
        const container = this.__tileContainer;
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        return this;
    }

    /**
     * 更新得分：新得分会直接写入到页面中；但增加值必须大于 0 才会有动画效果
     */
    updateScore(newVal, inc) {
        this.__scoreEle.textContent = newVal;
        this.__addScorePop(this.__scoreEle.parentElement, inc);
        return this;
    }
    updateBestScore(newVal, inc) {
        this.__bestEle.textContent = newVal;
        this.__addScorePop(this.__bestEle.parentElement, inc);
        return this;
    }

    showWin() {
        this.__gameMessage.style.display = this.__winEle.style.display = 'block';
        return this;
    }
    showGG() {
        this.__gameMessage.style.display = this.__ggEle.style.display = 'block';
        return this;
    }
    clearMessage() {
        this.__gameMessage.style.display = this.__winEle.style.display = this.__ggEle.style.display =
            'none';
        return this;
    }

    toggleMergeStrategy() {
        this.__toggleEle.classList.toggle('show');
        return this;
    }

    __addScorePop(container, diff) {
        if (diff > 0) {
            const oldPopDiv = container.getElementsByClassName('score-addition')[0];
            if (oldPopDiv) container.removeChild(oldPopDiv);
            const newPopDiv = document.createElement('div');
            newPopDiv.className = 'score-addition';
            newPopDiv.textContent = '+' + diff;
            container.appendChild(newPopDiv);
            return this;
        }
    }
    __posToClass(x, y) {
        if (arguments.length == 1) {
            ({ x, y } = arguments[0]);
        }
        return `tile-pos-${x + 1}-${y + 1}`;
    }
    __getClassListOf(cell) {
        return [
            'tile',
            `tile-${cell.value > 2048 ? 'super' : cell.value}`,
            this.__posToClass(cell)
        ];
    }
    __templateTile(cell) {
        const tile = document.createElement('div'),
            tileInner = document.createElement('div');
        tile.className = this.__getClassListOf(cell).join(' ');
        tileInner.className = 'tile-inner';
        tileInner.textContent = cell.value;
        tile.appendChild(tileInner);
        return tile;
    }
}

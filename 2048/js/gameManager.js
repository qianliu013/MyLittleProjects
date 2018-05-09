/**
 * origin 移动到 (toX, toY)
 * 如果在 toX, toY 处发生了合并，则 otherCell 为另一个被合并的 cell
 */
class __MovedCell {
    constructor(origin, toX, toY) {
        this.origin = origin;
        this.toX = toX;
        this.toY = toY;
        this.otherCell = null;
    }
    moved() {
        return !!(
            this.origin.x !== this.toX ||
            this.origin.y !== this.toY ||
            (this.otherCell && (this.otherCell.x !== this.toX || this.otherCell.y !== this.toY))
        );
    }
    new(value) {
        return new Cell(this.toX, this.toY, arguments.length === 0 ? this.origin.value : value);
    }
}

/**
 * 只检测值，不判断两个 cell 的坐标关系，此应由调用方保证
 */
const __mergeStrategy1 = {
    canMerge(cell1, cell2) {
        return cell1.value === cell2.value;
    },
    merge(cell1, cell2) {
        return {
            score: cell1.value + cell2.value,
            newValue: cell1.value + cell2.value
        };
    }
};
/**
 * 快速合并模式：2~16 合并翻倍，双倍得分
 */
const __mergeStrategy2 = {
    canMerge(cell1, cell2) {
        return cell1.value === cell2.value;
    },
    merge(cell1, cell2) {
        const baseValue = cell1.value + cell2.value,
            finalValue = baseValue < 64 ? baseValue * 2 : baseValue;
        return {
            score: finalValue * 2,
            newValue: finalValue
        };
    }
};

// 根据 grid 判断胜败条件
const __judge = {
    /**
     * 胜利条件即出现了大于等于 2048 的数字
     */
    win(grid) {
        let win = false;
        grid.forEach1d((x, y, cell) => {
            if (win) return;
            if (cell) win = cell.value >= 2048;
        });
        return win;
    },
    /**
     * 失败条件：棋盘满且移动无法合并结果
     */
    gameover(grid, mergeStrategy) {
        if (!grid.full()) return false;

        let prev = null,
            gg = true;
        function before() {
            prev = null;
        }
        // 因为棋盘必须是满的才会进入如下函数，因此无需判断 cur 的有效性
        function fn2d(x, y, cur) {
            if (!gg) return;
            if (prev && mergeStrategy.canMerge(prev, cur)) {
                gg = false;
            }
            prev = cur;
        }
        grid.forEach2d('down', before, fn2d);
        grid.forEach2d('right', before, fn2d);
        return gg;
    }
};

const __STORAGE_KEY = '_2048_GAME_',
    __GRID_KEY = 'grid',
    __BEST_SCORE_KEY = 'bestScore',
    __SCORE_KEY = 'score';

const __GRID_SIZE = 4;
/**
 * GameManager 来保证 HTML 上的棋盘与 Grid 内容完全一致
 * 无论是移动、增加、删除； GameManager 需要同时在 Grid 和 HtmlCtrl 采取正确的操作
 * 每次更改棋盘都必须保存状态
 */
class GameManager {
    constructor(eventManager, storageManger, htmlCtrl) {
        this.__eventManager = eventManager;
        this.__storageManager = storageManger;
        this.__htmlCtrl = htmlCtrl;

        this.__initState();
        const previous = this.__storageManager.getState(__STORAGE_KEY);
        if (previous) {
            this.__buildFromState(previous);
        }
        this.__listenEvent();
        this.__reload();
    }

    __initState() {
        this.__grid = new Grid(__GRID_SIZE);
        this.__score = 0;
        this.__bestScore = 0;
        // keepGoing：游戏已胜利的情况下是否继续（不再显示胜利信息），未胜利此值无效
        this.__keepGoing = false;
        // 如果出现 Game message 即暂停
        this.__pause = false;
        this.__mergeStrategy = __mergeStrategy1;
        return this;
    }
    __clearState() {
        this.__grid = new Grid(__GRID_SIZE);
        this.__score = 0;
        this.__keepGoing = this.__pause = false;
        return this;
    }
    __buildFromState(state) {
        this.__grid.deSerialize(state[__GRID_KEY]);
        this.__bestScore = state[__BEST_SCORE_KEY];
        this.__score = state[__SCORE_KEY];
        return this;
    }
    __listenEvent() {
        const eventManager = this.__eventManager;
        eventManager.listenKeyBoardEvent();
        eventManager.listenClickEvent();
        eventManager.on('move', this.move, this);
        eventManager.on('newGame', this.newGame, this);
        eventManager.on('restart', this.newGame, this);
        eventManager.on('keepGoing', this.keepGoing, this);
        eventManager.on('toggleMergeStrategy', this.toggleMergeStrategy, this);
        return this;
    }
    /**
     * 页面载入棋盘，并保证至少有两个 tile
     * 注意胜利与失败的检测发生在 move 之后
     */
    __reload() {
        window.requestAnimationFrame(() => {
            this.__htmlCtrl.clear();
            this.__htmlCtrl.updateScore(this.__score, 0).updateBestScore(this.__bestScore, 0);
            this.__grid.occupiedCells().forEach(cell => this.__htmlCtrl.addNewTile(cell));
            const occupiedCellsNum = this.__grid.occupiedCells().length;
            for (let i = 0; i < Math.max(0, 2 - occupiedCellsNum); ++i) {
                this.__addNewTile();
            }
            this.saveState();
        });
        return this;
    }

    __win() {
        this.__htmlCtrl.showWin();
        this.__pause = true;
        return this;
    }
    __gg() {
        this.__htmlCtrl.showGG();
        this.__pause = true;
        return this;
    }

    __addNewTile() {
        const cell = this.__grid.randomAvailableCell();
        cell.value = Math.random() < 0.9 ? 2 : 4;
        this.__grid.add(cell);
        this.__htmlCtrl.addNewTile(cell);
        return this;
    }
    __updateScore(inc) {
        if (inc <= 0) return this;
        this.__score += inc;
        this.__htmlCtrl.updateScore(this.__score, inc);
        const diff = this.__score - this.__bestScore;
        if (diff > 0) {
            this.__bestScore = this.__score;
            this.__htmlCtrl.updateBestScore(this.__bestScore, diff);
        }
        return this;
    }

    /**
     * 首先检测是否出现了 game-message，出现则移动无效
     * 移动棋盘，检测胜利或失败
     * 默认方向即 Grid.forEach2d 的方向：左
     */
    move(dir) {
        if (this.__pause) {
            return this;
        }
        const newLine = [],
            orderedXY = [],
            grid = this.__grid,
            htmlCtrl = this.__htmlCtrl,
            mergeStrategy = this.__mergeStrategy;

        let totalScore = 0,
            moved = false;

        function init() {
            newLine.length = 0;
            orderedXY.length = 0;
        }
        /**
         * 移动逻辑：
         * 合并移动仅发生在某一行（列），按序获得每一个位置及其 cell
         * 把有序的 4 个坐标存在队列中
         * 需要新的 cell 时会从队列最前取一个坐标并记录该对应的 cell（__MovedCell 实例）
         * cell 合并的条件是：前面有 cell && 前面 cell 未合并过 && 合并判断为真
         */
        function fn2d(x, y, cur) {
            orderedXY.push({ x, y });
            if (!cur) return;
            const last = newLine[newLine.length - 1];
            if (last && !last.otherCell && mergeStrategy.canMerge(last.origin, cur)) {
                last.otherCell = cur;
            } else {
                const { x: toX, y: toY } = orderedXY.shift();
                newLine.push(new __MovedCell(cur, toX, toY));
            }
        }
        /**
         * HtmlCtrl 与 Grid 同步更新
         * 移动：Grid 去掉旧的，加入新的；HtmlCtrl 直接移动位置
         * 合并：Grid 去掉被合并的两个，加入新的；HtmlCtrl 移动两个旧的到新位置，产生新的合并 tile
         */
        function update() {
            newLine.forEach(movedCell => {
                moved = moved || movedCell.moved();
                htmlCtrl.move(movedCell.origin, movedCell.toX, movedCell.toY);
                if (!movedCell.otherCell) {
                    grid.remove(movedCell.origin).add(movedCell.new());
                } else {
                    const { score, newValue } = mergeStrategy.merge(
                        movedCell.origin,
                        movedCell.otherCell
                    );
                    totalScore += score;
                    const newCell = movedCell.new(newValue);
                    htmlCtrl
                        .move(movedCell.otherCell, movedCell.toX, movedCell.toY)
                        .mergeNewTile(newCell);
                    grid
                        .remove(movedCell.origin)
                        .remove(movedCell.otherCell)
                        .add(newCell);
                }
            });
        }

        window.requestAnimationFrame(() => {
            grid.forEach2d(dir, init, fn2d, update);
            // 如果发生移动，就意味着一定有可用的 cell，那么就添加新的
            if (moved) {
                this.__addNewTile();
            }
            // 检测胜利需要在失败前；因为可能同时出现胜利、失败条件（如初次载入棋盘）
            if (__judge.win(this.__grid) && !this.__keepGoing) {
                this.__win();
            }
            if (__judge.gameover(this.__grid, this.__mergeStrategy)) {
                this.__gg();
            }
            this.__updateScore(totalScore).saveState();
        });
        return this;
    }
    newGame() {
        this.__htmlCtrl.clearMessage();
        return this.__clearState().__reload();
    }
    keepGoing() {
        this.__htmlCtrl.clearMessage();
        this.__keepGoing = true;
        this.__pause = false;
        return this;
    }
    toggleMergeStrategy() {
        this.__mergeStrategy =
            this.__mergeStrategy === __mergeStrategy2 ? __mergeStrategy1 : __mergeStrategy2;
        this.__htmlCtrl.toggleMergeStrategy();
        return this;
    }

    saveState() {
        this.__storageManager.setState(__STORAGE_KEY, this);
        return this;
    }
    serialize() {
        return {
            grid: this.__grid.serialize(),
            bestScore: this.__bestScore,
            score: this.__score
        };
    }
}

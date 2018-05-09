/**
 * 二维数组，只负责记录当前状态，不负责维护状态变化
 * 每一个格子内部表示是 value；对外使用 Cell 封装
 * x 为行，y 为列；
 */
class Grid {
    constructor(height, width = height) {
        this.__height = height;
        this.__width = width;
        this.__grid = [];
        this.__grid.length = this.__height;
        for (let i = 0; i < this.__height; i++) {
            this.__grid[i] = [];
            this.__grid[i].length = this.__width;
            this.__grid[i].fill(null);
        }
    }
    // 从 (0,0) 从左到右，从上到下遍历
    forEach1d(fn, context) {
        for (let i = 0; i < this.__height; i++) {
            for (let j = 0; j < this.__width; ++j) {
                fn.call(context, i, j, this.get(i, j));
            }
        }
    }
    /**
     * 根据方向，先访问行或列，然后按序遍历每一个元素
     * 如方向为上，按列访问 1->4；每一列，顺序是 4->1
     *  fn2 为 内部遍历的函数（执行四次），before after 即发生这四次前后的函数
     * 传入 dir 不为 'right', 'down', 'up'，则方向为左
     */
    forEach2d(dir, before, fn2d, after) {
        const xs = Array.from(new Array(this.__height), (_, i) => i),
            ys = Array.from(new Array(this.__width), (_, i) => i),
            verticalFirst = dir === 'up' || dir === 'down';
        if (dir === 'right') ys.reverse();
        if (dir === 'down') xs.reverse();
        const [inner, outer] = verticalFirst ? [xs, ys] : [ys, xs];
        for (const x1 of outer) {
            if (before) before(x1);
            if (fn2d) {
                for (const x2 of inner) {
                    if (verticalFirst) fn2d(x2, x1, this.get(x2, x1));
                    else fn2d(x1, x2, this.get(x1, x2));
                }
            }

            if (after) after(x1);
        }
    }

    empty() {
        return !this.occupiedCells().length;
    }
    full() {
        return !this.availableCells().length;
    }

    randomAvailableCell() {
        const cells = this.availableCells(),
            cell = cells[Math.floor(Math.random() * cells.length)];
        return cell;
    }
    availableCells() {
        const cells = [];
        this.forEach1d((x, y, cell) => {
            if (!cell) {
                cells.push(new Cell(x, y));
            }
        });
        return cells;
    }
    occupiedCells() {
        const cells = [];
        this.forEach1d((x, y, cell) => {
            if (cell) {
                cells.push(cell);
            }
        });
        return cells;
    }

    get(x, y) {
        if (!this.withinBounds(x, y) || this.__grid[x][y] == null) return null;
        return new Cell(x, y, this.__grid[x][y]);
    }
    add(cell) {
        if (!this.withinBounds(cell)) return null;
        this.__grid[cell.x][cell.y] = cell.value;
        return this;
    }
    remove(cell) {
        if (!this.withinBounds(cell)) return null;
        this.__grid[cell.x][cell.y] = null;
        return this;
    }
    withinBounds(x, y) {
        if (arguments.length === 1) {
            ({ x, y } = arguments[0]);
        }
        return 0 <= x && x < this.__width && 0 <= y && y < this.__height;
    }

    serialize() {
        return this.__clone(this.__grid);
    }
    deSerialize(grid) {
        this.__grid = this.__clone(grid);
        return this;
    }
    __clone(grid) {
        const res = [];
        this.forEach2d('left', x => (res[x] = []), (x, y) => (res[x][y] = grid[x][y]));
        return res;
    }
}

(function() {
    'use strict';
    const searchHistory = {
        __history: [],
        __maxNumber: 7,
        maxNumber(number) {
            if (typeof number === 'number') {
                this.__maxNumber = number;
                return this;
            }
            return this.__maxNumber;
        },
        get() {
            return this.__history;
        },
        // 仅添加非空数据；若重复，则删除之前的，将新值放入最前；
        add(value) {
            if (value) {
                const index = this.__history.indexOf(value);
                if (index !== -1) {
                    this.__history.splice(index, 1);
                } else if (this.__history.length >= this.__maxNumber) {
                    this.__history.pop();
                }
                this.__history.unshift(value);
                return this;
            }
        }
    };
    // 同时仅允许一个请求发送
    const searchJsonp = {
        __script: null,
        // 防止冲突
        __callbackName: 'searchCB' + ('' + Math.random()).substring(2),
        __removeScript() {
            if (this.__script) {
                document.body.removeChild(this.__script);
                this.__script = null;
            }
        },
        register(callback, context) {
            window[this.__callbackName] = originData => {
                callback.call(context, originData.s);
                this.__removeScript();
            };
        },
        /**
         * 百度搜索关键字可使用 jsonp 获得, URL是
         * 'http://www.baidu.com/su?&wd=' + 'XXX' + '&p=3&cb=fn';
         * 返回值是: {q: String, p: Boolean, s: Array}
         */
        exec(query) {
            this.__removeScript();
            const script = document.createElement('script');
            this.__script = script;
            script.src = `http://www.baidu.com/su?&wd=${encodeURIComponent(query)}&p=3&cb=${this.__callbackName}`;
            document.body.appendChild(script);
        },
        destory() {
            this.__removeScript();
            delete window[this.__callbackName];
        }
    };

    const DELAY = 1000;
    function debounce(fn, delay = DELAY, context) {
        let timeId = null;
        return function() {
            clearTimeout(timeId);
            timeId = setTimeout(() => fn.apply(context, arguments), delay);
        };
    }

    const keyCode = {
        ArrowDown: 40,
        ArrowUp: 38,
        Enter: 13
    };

    window.onload = function() {
        const searchWrapper = document.getElementById('search-wrapper'),
            searchList = searchWrapper.getElementsByTagName('ul')[0],
            searchInput = searchWrapper.getElementsByTagName('input')[0],
            searchButton = searchWrapper.getElementsByTagName('button')[0];

        const liHover = {
            __cur: null,
            init() {
                this.__cur = null;
            },
            move(step) {
                const length = searchList.children.length;
                if (this.__cur === null) {
                    if (step > 0) {
                        this.__cur = (length + step - 1) % length;
                    } else {
                        this.__cur = (length + step) % length;
                    }
                } else {
                    this.__cur = (length + step + this.__cur) % length;
                }
                this.cur(searchList.children[this.__cur]);
            },
            clear() {
                var children = searchList.children;
                for (let i = 0; i < children.length; ++i) {
                    children[i].classList.remove('hover');
                }
            },
            cur(target) {
                if (target) {
                    this.clear();
                    target.classList.add('hover');
                    return this;
                } else {
                    return searchList.children[this.__cur];
                }
            }
        };
        const searchListCtrl = {
            __lastList: [],
            show() {
                searchList.style.display = 'block';
            },
            hide() {
                searchList.style.display = 'none';
            },
            // 如果不传入数据就使用上一次的数据输出
            render(list) {
                liHover.init();
                if (!list) {
                    this.render(this.__lastList);
                } else {
                    if (!Array.isArray(list)) return;
                    if (list.length === 0) {
                        this.hide();
                    } else {
                        this.hide();
                        while (searchList.firstChild) {
                            searchList.removeChild(searchList.firstChild);
                        }
                        for (const item of list) {
                            const liEle = document.createElement('li');
                            liEle.innerText = item;
                            searchList.appendChild(liEle);
                        }
                        this.__lastList = list;
                        this.show();
                    }
                }
            }
        };

        searchJsonp.register(searchListCtrl.render.bind(searchListCtrl));
        let lastValue = null;
        // 如果为上一次数据，就显示上一次列表
        // 如果为空，则显示历史数据
        // 其他则异步获取数据
        function renderSearchList() {
            let value = searchInput.value;
            if (value === lastValue) {
                searchListCtrl.render();
            } else if (value === '') {
                searchListCtrl.render(searchHistory.get());
            } else {
                value = value.trim();
                if (value) {
                    searchHistory.add(value);
                    searchJsonp.exec(value);
                }
            }
            lastValue = value;
        }

        // 不能直接使用 searchInput.onblur 是因为 blur 在 focus 前触发；如果此时隐藏了搜索列表，就会导致点击事件失效
        function simulateBlur(event) {
            let cur = event.target;
            if (cur !== searchList && cur.parentNode !== searchList && cur !== searchInput) {
                searchListCtrl.hide();
            }
        }
        function clickOption(event) {
            const target = event.target;
            if (target.tagName === 'LI') {
                searchInput.value = target.innerText;
                searchListCtrl.hide();
            }
        }
        function searchInNewWindow() {
            if (searchInput.value !== '') {
                window.open(`https://www.baidu.com/s?word=${searchInput.value}`);
            }
        }
        function hoverOption(event) {
            const target = event.target;
            if (target.tagName === 'LI') {
                liHover.cur(target);
            }
        }
        function removeIncorrectHover(event) {
            const target = event.target;
            if (target.tagName !== 'LI' || target.parentNode !== searchList) {
                liHover.clear();
            }
        }

        // 未考虑事件处理的兼容性
        searchInput.addEventListener('input', debounce(renderSearchList));
        searchInput.addEventListener('focus', renderSearchList);
        document.addEventListener('click', simulateBlur);

        searchList.addEventListener('click', clickOption);
        searchButton.addEventListener('click', searchInNewWindow);

        searchList.addEventListener('mouseover', hoverOption);
        document.addEventListener('mouseover', removeIncorrectHover);

        searchWrapper.addEventListener('keydown', function(event) {
            if (event.keyCode === keyCode.Enter) {
                searchInNewWindow();
            } else if (event.keyCode === keyCode.ArrowDown) {
                liHover.move(+1);
                searchInput.value = liHover.cur().innerText;
            } else if (event.keyCode === keyCode.ArrowUp) {
                liHover.move(-1);
                searchInput.value = liHover.cur().innerText;
            }
        });
    };
})();

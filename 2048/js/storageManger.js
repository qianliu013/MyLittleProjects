class StorageManger {
    getState(name) {
        try {
            return JSON.parse(localStorage.getItem(name));
        } catch (e) {
            return null;
        }
    }
    setState(key, value) {
        if (typeof value === 'string') {
            localStorage.setItem(key, value);
        } else if (value != undefined && typeof value.serialize === 'function') {
            localStorage.setItem(key, JSON.stringify(value.serialize()));
        } else {
            localStorage.setItem(key, JSON.stringify(value));
        }
        return this;
    }
}

class LiveView {
    constructor(wsURL) {
        this.wsURL = wsURL;
    }

    connect() {
        this.socket = new WebSocket(this.wsURL);
        this.socket.addEventListener('open', this.onSocketConnected);
        this.socket.addEventListener('message', this.onSocketMessage.bind(this));
        this.socket.addEventListener('error', this.onSocketError);
        this.socket.addEventListener('close', this.onSocketClosed);
    }

    dispatchAction(method, params) {
        switch (method) {
            case 'render': {
                this.applyDiff(params['content']);
            }
        }
    }

    applyDiff(html) {
        const self = this;
        const newDoc = document.createElement('template');
        newDoc.innerHTML = html;
        morphdom(document.querySelector('.app'), newDoc.content.querySelector('.app'), {
            onBeforeNodeAdded(el) {
                // self.boost(el);
            },
            onElUpdated(el) {
                // self.boost(el);
            }
        });
    }

    /**
     *
     * @param {HTMLElement} element
     */
    boost(element) {
        if (!(element instanceof HTMLElement)) {
            return false;
        }

        const clickables = element.querySelectorAll('[data-live-click]');
        clickables.forEach(element => {
            element.addEventListener('click', e => {
                e.preventDefault();

                const action = element.dataset.liveClick;
                const values = {};
                Object
                    .entries(element.dataset)
                    .filter(([name, value]) => name.startsWith('liveValue'))
                    .forEach(([name, value]) => {
                        values[name.replace('liveValue', '')] = value;
                    });

                this.sendCommand('click', action, values);

                element.attributes.setNamedItem('boosted');
            });
        });

        element.querySelectorAll('[data-live-submit]').forEach(element => {
            element.addEventListener('submit', e => {
                e.preventDefault();
                const action = element.dataset.liveSubmit;
                if (element.tagName == 'FORM') {
                    const data = new URLSearchParams(new FormData(element)).toString();
                    this.sendCommand('form', action, data, 'form');
                }
            });
        });
    }

    sendCommand(type, method, params) {
        this.socket.send(JSON.stringify({
            'method': method, 'params': params || {}, 'type': type,
        }));
    }

    onSocketConnected(e) {
        console.log('connected', e);
    }

    /**
     *
     * @param {MessageEvent} e
     */
    onSocketMessage(e) {
        let data = JSON.parse(e.data);
        this.dispatchAction(data.action, data.params);
    }

    onSocketError(e) {
        console.log('error', e);
    }

    onSocketClosed(e) {
        console.log('closed', e);
    }
}


function initializeLiveView() {
    let liveView = new LiveView(window.location.href.replace('http', 'ws'));
    liveView.connect();
    liveView.boost(document.body);
}

document.addEventListener('DOMContentLoaded', initializeLiveView);

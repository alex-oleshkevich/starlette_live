import morphdom from 'morphdom';
import ReconnectingWebSocket, { Event, ErrorEvent, CloseEvent } from 'reconnecting-websocket';

type RenderMessage = {
    method: 'render',
    params: {
        target: string,
        content: string,
    }
}

type Message = RenderMessage;
type CommandParams = { [key: string]: any };
type CommandOptions = { format?: 'json' | 'form', target?: string };

export class LiveView {
    private socket: ReconnectingWebSocket;

    constructor(private readonly url: string) {
        this.socket = new ReconnectingWebSocket(url, [], { startClosed: true });
        this.socket.addEventListener('open', this.onSocketConnected);
        this.socket.addEventListener('message', this.onSocketMessage.bind(this));
        this.socket.addEventListener('error', this.onSocketError);
        this.socket.addEventListener('close', this.onSocketClosed);
    }

    connect() {
        this.socket.reconnect();
    }

    onSocketConnected(e: Event) {
        console.log(e);
    }

    onSocketMessage(e: MessageEvent) {
        this.dispatch(JSON.parse(e.data));
    }

    onSocketError(e: ErrorEvent) {
        console.log(e);
    }

    onSocketClosed(e: CloseEvent) {
        console.log(e);
    }

    boost(element: HTMLElement) {
        this.boostClicks(element);
    }

    boostClicks(element: HTMLElement) {
        element.querySelectorAll('[live-click]').forEach(node => {
            const method = node.attributes.getNamedItem('live-click')!.value;
            node.addEventListener('click', ev => {
                ev.preventDefault();
                const params: { [key: string]: string } = {};
                Array.from(node.attributes).forEach((attr) => {
                    if (attr.name.startsWith('live-value')) {
                        params[attr.name.replace('live-value-', '')] = attr.value;
                    }
                });
                this.sendCommand(method, params);
            });
        });
    }

    dispatch(message: Message) {
        switch (message.method) {
            case 'render':
                this.handleRender(message);
        }
    }

    sendCommand(method: string, params?: CommandParams, options?: CommandOptions) {
        const format = options?.format || 'json';
        const target = options?.target || 'root';
        this.socket.send(JSON.stringify({
            'method': method,
            'params': params,
            'format': format,
            'target': target,
        }));
    }

    handleRender(message: RenderMessage) {
        let target: string = message.params.target == 'root' ? '[live-root]' : message.params.target;
        const template = document.createElement('template');
        template.innerHTML = message.params.content;
        const targetSourceElement = template.content.querySelector('[live-root]');
        if (!targetSourceElement) {
            throw new Error(`[live] Cannot query target element for selector "${ message.params.target }"`);
        }

        const targetElement = document.querySelector(target);
        if (!targetElement) {
            throw new Error(`[live] Cannot query target element for selector "${ message.params.target }"`);
        }

        morphdom(targetElement, targetSourceElement, {
            onBeforeNodeAdded(node) {
                console.log(node);
                return node;
            }
        });
    }
}

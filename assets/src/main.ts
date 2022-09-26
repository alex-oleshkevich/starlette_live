import {LiveView} from './live_view';

document.addEventListener('DOMContentLoaded', () => {
    const protocol = window.location.protocol.replace('http', 'ws');
    const url = `${protocol}//${window.location.host}${window.location.pathname}`;
    const view = new LiveView(url);
    view.connect();
    view.boost(document.body);
});

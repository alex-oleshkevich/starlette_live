import jinja2
import json
import logging
import typing
from starlette import status
from starlette.datastructures import FormData, Headers
from starlette.formparsers import FormParser
from starlette.requests import HTTPConnection
from starlette.responses import HTMLResponse
from starlette.types import Receive, Scope, Send
from starlette.websockets import WebSocket

from starlette_live.components import ComponentRegistry


class Message(typing.TypedDict):
    method: str
    params: dict[str, typing.Any] | FormData


class IncomingMessage(typing.TypedDict):
    method: str
    target: str
    params: str | dict[str, typing.Any]
    format: typing.Literal['json', 'form']


class LiveView:
    template = ''
    component_template = ''
    block = 'content'
    jinja_env: jinja2.Environment | None = None

    def __init__(self) -> None:
        self._component_registry = ComponentRegistry()

    async def state(self, conn: HTTPConnection) -> dict[str, typing.Any]:
        return {}

    async def dispatch(self, websocket: WebSocket, message: Message) -> None:
        pass

    def render(self, state: dict[str, typing.Any]) -> str:
        assert self.template
        assert self.jinja_env
        template = self.jinja_env.get_template(self.template)
        return template.render(state)

    async def update(self, websocket: WebSocket) -> None:
        state = await self._make_state(websocket)
        content = self.render(state)
        await self.send_command(websocket, 'render', {'content': content, 'target': 'root'})

    async def _make_state(self, conn: HTTPConnection) -> dict[str, typing.Any]:
        state = await self.state(conn)
        state['conn'] = conn
        return state

    async def _dispatch_http(self, conn: HTTPConnection) -> HTMLResponse:
        state = await self._make_state(conn)
        content = self.render(state)
        return HTMLResponse(content)

    async def send_command(self, websocket: WebSocket, action: str, params: dict[str, str | int]) -> None:
        await websocket.send_json({'method': action, 'params': params})

    async def _dispatch_websocket(self, websocket: WebSocket) -> None:
        await websocket.accept()

        # re-render page contents to initialize live components
        state = await self._make_state(websocket)
        self.render(state)

        # mount components
        await self.mount_components(websocket)

        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.receive":
                payload: IncomingMessage = json.loads(message['text'])
                await self._handle_websocket_message(websocket, payload)

            elif message['type'] == 'websocket.disconnect':
                await self.unmount_components(websocket)
                break

    async def _handle_websocket_message(self, websocket: WebSocket, payload: IncomingMessage) -> None:
        method = payload['method']
        data_format = payload['format']
        params: dict[str, typing.Any] | FormData

        if data_format == 'json':
            assert isinstance(payload['params'], dict)
            params = payload['params']
        elif data_format == 'form':
            assert isinstance(payload['params'], str)
            params = await self._parse_form_data(payload['params'])
        else:
            raise TypeError('Unsupported payload params type.')

        assert isinstance(params, (dict, FormData))
        await self.dispatch(
            websocket,
            typing.cast(
                Message,
                {
                    'method': method,
                    'params': params,
                },
            ),
        )

    def _parse_json(self, data: str) -> typing.Any:
        return json.loads(data)

    async def _parse_form_data(self, data: str) -> FormData:
        async def stream() -> typing.AsyncGenerator[bytes, None]:
            yield data.encode()
            yield b''

        form_parser = FormParser(Headers(), stream())
        return await form_parser.parse()

    async def mount_components(self, websocket: WebSocket) -> None:
        try:
            for component in websocket.state.components:
                await component.mount(websocket)
        except Exception as ex:
            logging.exception(ex)
            await websocket.close(status.WS_1011_INTERNAL_ERROR)

    async def unmount_components(self, websocket: WebSocket) -> None:
        for component in websocket.state.components:
            try:
                await component.unmount(websocket)
            except Exception as ex:
                logging.exception(ex)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        scope.setdefault('state', {})
        scope['state']['components'] = self._component_registry

        if scope['type'] == 'http':
            request = HTTPConnection(scope, receive)
            response = await self._dispatch_http(request)
            await response(scope, receive, send)

        if scope['type'] == 'websocket':
            websocket = WebSocket(scope, receive=receive, send=send)
            await self._dispatch_websocket(websocket)

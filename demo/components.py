from starlette.websockets import WebSocket

from starlette_live.components import Component


class EditForm(Component):
    template = 'edit_form.html'

    def __init__(self, placeholder: str) -> None:
        self.placeholder = placeholder

    async def mount(self, websocket: WebSocket) -> None:
        print('mounted')

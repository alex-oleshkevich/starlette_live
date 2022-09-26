import dataclasses

import jinja2
import typing
from pathlib import Path
from starlette.applications import Starlette
from starlette.requests import HTTPConnection
from starlette.routing import Mount
from starlette.staticfiles import StaticFiles
from starlette.websockets import WebSocket

from starlette_live.endpoints import LiveView, Message
from starlette_live.routing import LiveRoute
from starlette_live.templates import LiveComponentTag

this_dir = Path(__file__).parent

jinja_env = jinja2.Environment(loader=jinja2.PackageLoader(__name__), extensions=[LiveComponentTag])


@dataclasses.dataclass
class Task:
    text: str
    checked: bool = False
    completed: bool = False


class TodoView(LiveView):
    tasks: list[Task] = []
    selected_filter: str = 'all'

    template = 'index.html'
    jinja_env = jinja_env

    async def state(self, conn: HTTPConnection) -> dict[str, typing.Any]:
        tasks = []
        total_tasks = len(self.tasks)
        for task in self.tasks:
            if self.selected_filter == 'all':
                tasks.append(task)
            elif self.selected_filter == 'active' and not task.completed:
                tasks.append(task)
            elif self.selected_filter == 'completed' and task.completed:
                tasks.append(task)

        return {
            'tasks': tasks,
            'total_tasks': total_tasks,
            'selected_filter': self.selected_filter,
        }

    async def dispatch(self, websocket: WebSocket, data: dict[str, str]) -> None:
        match data:
            case {'method': 'select_filter', 'params': {'Name': name}}:
                self.selected_filter = name
            case {'method': 'clearCompleted'}:
                self.tasks = [task for task in self.tasks if task.completed is not True]
            case {'method': 'add', 'params': {'text': text}}:
                self.tasks.append(Task(text=text))
            case {'method': 'delete', 'params': {'Id': id_}}:
                del self.tasks[int(id_)]
            case {'method': 'toggle', 'params': {'Id': id_}}:
                self.tasks[int(id_)].completed = not self.tasks[int(id_)].completed
                self.tasks[int(id_)].checked = not self.tasks[int(id_)].checked
            case {'method': 'toggle_all'}:
                for task in self.tasks:
                    task.checked = not task.checked
            case {'method': 'clear_completed'}:
                self.tasks = list(filter(lambda task: not task.completed, self.tasks))
        await self.update(websocket)


class CounterView(LiveView):
    count = 0

    template = 'counter.html'
    jinja_env = jinja_env

    async def state(self, conn: HTTPConnection) -> dict[str, typing.Any]:
        return {'count': self.count}

    async def dispatch(self, websocket: WebSocket, message: Message) -> None:
        match message:
            case {'method': 'add', 'params': {'step': step}}:
                self.count += int(step)
            case {'method': 'sub', 'params': {'step': step}}:
                self.count -= int(step)
        await self.update(websocket)


routes = [
    LiveRoute('/', TodoView),
    LiveRoute('/counter', CounterView),
    Mount('/static', StaticFiles(packages=[__name__, 'starlette_live'])),
]

app = Starlette(debug=True, routes=routes)

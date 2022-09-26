import importlib
import jinja2
import typing
from starlette.requests import HTTPConnection
from starlette.websockets import WebSocket


class Component:
    id: str = ''
    template: str = ''
    _counter: int = 0

    def __init_subclass__(cls, **kwargs: typing.Any) -> None:
        cls._counter += 1
        cls.id = cls.id or cls.__name__.lower()

    async def mount(self, websocket: WebSocket) -> None:
        pass

    def render(self, jinja_env: jinja2.Environment, conn: HTTPConnection) -> str:
        assert self.template
        template = jinja_env.get_template(self.template)
        return template.render({'this': self, 'conn': conn})


class ComponentRegistry:
    def __init__(self) -> None:
        self.components: dict[str, Component] = {}

    def register(self, component: Component) -> None:
        assert component.id not in self.components, f'Duplicate component ID: {component.id}'
        self.components[component.id] = component

    def __iter__(self) -> typing.Iterator[Component]:
        yield from self.components.values()


def import_component(name: str) -> typing.Type[Component]:
    module_path, _, component_name = name.rpartition('.')
    module = importlib.import_module(module_path)
    return getattr(module, component_name)

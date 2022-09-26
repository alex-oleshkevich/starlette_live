import typing
from starlette.datastructures import URLPath
from starlette.routing import BaseRoute, Match, NoMatchFound, compile_path, get_name, replace_params
from starlette.types import Receive, Scope, Send

from starlette_live.endpoints import LiveView


class LiveRoute(BaseRoute):
    def __init__(
        self,
        path: str,
        view_class: typing.Type[LiveView],
        name: typing.Optional[str] = None,
    ) -> None:
        assert path.startswith("/"), "Routed paths must start with '/'"
        self.path = path
        self.name = get_name(view_class) if name is None else name
        self.view_class = view_class
        self.methods = {'get', 'post'}
        self.path_regex, self.path_format, self.param_convertors = compile_path(path)

    def matches(self, scope: Scope) -> typing.Tuple[Match, Scope]:
        if scope["type"] in {"http", "websocket"}:
            match = self.path_regex.match(scope["path"])
            if match:
                matched_params = match.groupdict()
                for key, value in matched_params.items():
                    matched_params[key] = self.param_convertors[key].convert(value)
                path_params = dict(scope.get("path_params", {}))
                path_params.update(matched_params)
                child_scope = {"endpoint": self.view_class, "path_params": path_params}
                if scope['type'] == 'http' and self.methods and scope["method"] not in self.methods:
                    return Match.PARTIAL, child_scope
                else:
                    return Match.FULL, child_scope
        return Match.NONE, {}

    def url_path_for(self, name: str, **path_params: typing.Any) -> URLPath:
        seen_params = set(path_params.keys())
        expected_params = set(self.param_convertors.keys())

        if name != self.name or seen_params != expected_params:
            raise NoMatchFound(name, path_params)

        path, remaining_params = replace_params(self.path_format, self.param_convertors, path_params)
        assert not remaining_params
        return URLPath(path=path, protocol="http")

    async def handle(self, scope: Scope, receive: Receive, send: Send) -> None:
        live_view = self.view_class()
        await live_view(scope, receive, send)

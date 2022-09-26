import jinja2
import typing
from bs4 import BeautifulSoup, Tag
from jinja2 import lexer, nodes
from jinja2.ext import Extension
from jinja2.parser import Parser
from jinja2.runtime import Context
from starlette.requests import HTTPConnection

from starlette_live.components import import_component


class LiveComponentTag(Extension):
    tags = {'live_component'}

    def parse(self, parser: Parser) -> typing.Union[nodes.Node, typing.List[nodes.Node]]:
        if parser.stream.current.value == 'live_component':
            return self.parse_live_component(parser)
        raise ValueError('Unsupported tag')

    def parse_live_component(self, parser: Parser) -> typing.Union[nodes.Node, typing.List[nodes.Node]]:
        lineno = parser.stream.current.lineno
        parser.stream.skip(1)

        args: list = []
        kwargs: list = [
            nodes.Keyword('_context', nodes.ContextReference()),
        ]

        kwargs_set = False
        while parser.stream.current.type != lexer.TOKEN_BLOCK_END:
            parser.stream.skip_if(lexer.TOKEN_COMMA)
            if parser.stream.current.type == 'name' and parser.stream.look().type == 'assign':
                key = parser.stream.current.value
                parser.stream.skip(2)
                value = parser.parse_expression()
                kwargs.append(nodes.Keyword(key, value, lineno=value.lineno))
                kwargs_set = True
            else:
                if kwargs_set:
                    parser.fail('Invalid argument syntax', parser.stream.current.lineno)
                args.append(parser.parse_expression())

        block_call = self.call_method('render_live_component', args, kwargs)
        return nodes.Output([nodes.MarkSafe(block_call)]).set_lineno(lineno)

    def render_live_component(self, name: str, **kwargs: typing.Any) -> str:
        context: Context = kwargs.pop('_context')
        environment: jinja2.Environment = context.environment
        conn: HTTPConnection = context.parent['conn']

        component_class = import_component(name)
        component = component_class(**kwargs)
        content = component.render(environment, conn)
        conn.state.components.register(component)

        soup = BeautifulSoup(content, features='html.parser')
        if not soup.contents:
            return content

        has_multiple_roots = len([child for child in soup.contents if isinstance(child, Tag)]) > 1
        if has_multiple_roots:
            raise ValueError(
                f'Component {component_class.__module__}.{component_class.__name__} (id="{component.id}") '
                f'has multiple root elements.'
            )

        soup.contents[0].attrs['live-component'] = component.id
        return str(soup)

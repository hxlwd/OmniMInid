from langgraph.graph import END, START, MessagesState, StateGraph


def _placeholder(state: MessagesState) -> MessagesState:
    return state


_builder = StateGraph(MessagesState)
_builder.add_node("placeholder", _placeholder)
_builder.add_edge(START, "placeholder")
_builder.add_edge("placeholder", END)
graph = _builder.compile(name="OmniMind")

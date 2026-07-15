import json
from pathlib import Path


def test_langgraph_manifest_points_to_agent_graph() -> None:
    manifest = json.loads(Path("langgraph.json").read_text(encoding="utf-8"))
    assert manifest["graphs"] == {"agent": "./src/agent/graph.py:graph"}


def test_env_example_contains_placeholders_only() -> None:
    content = Path(".env.example").read_text(encoding="utf-8")
    assert "DEEPSEEK_API_KEY=" in content
    assert "QWEN_API_KEY=" in content
    assert "sk-" not in content

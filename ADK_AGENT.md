# Test Agent

This workspace contains a small Google ADK agent project.

The agent is configured as a casual, friendly, slightly sassy assistant that can answer normal questions, help with study or programming topics, and respond in a more caring tone when the topic is serious.

## Project Structure

```text
test_agent/
├── __init__.py
├── agent.py
└── prompt.py
```

- `test_agent/agent.py` defines the ADK `root_agent`.
- `test_agent/prompt.py` stores the agent personality and behavior instructions.
- `.adk/` is used by ADK for local runtime artifacts.
- `.venv/` is the local Python virtual environment.

## Requirements

The current environment uses Python 3.14.4 and Google ADK.

Install the main dependency with:

```powershell
pip install -r requirements.txt
```

## Notes

The long prompt is kept separate from `agent.py` so the behavior can be edited without changing the agent setup code.

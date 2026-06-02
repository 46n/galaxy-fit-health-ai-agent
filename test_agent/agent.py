from google.adk.agents.llm_agent import Agent

from .prompt import ROOT_AGENT_INSTRUCTION

root_agent = Agent(
    model="gemini-2.5-flash",
    name="root_agent",
    description="A casual, friendly assistant for user questions.",
    instruction=ROOT_AGENT_INSTRUCTION,
)

const { DefaultAzureCredential } = require("@azure/identity");

const DEFAULT_AGENT_RESPONSES_URL =
  "https://MioClean-resource.services.ai.azure.com/api/projects/MioClean/agents/AgenteMioClean/endpoint/protocols/openai/responses";

function getAgentApiKey() {
  return process.env.AZURE_AI_API_KEY || process.env.AZURE_OPENAI_API_KEY || "";
}

function getAgentResponsesUrl() {
  const url = new URL(process.env.AZURE_AI_AGENT_RESPONSES_URL || DEFAULT_AGENT_RESPONSES_URL);
  if (!url.searchParams.has("api-version")) {
    url.searchParams.set("api-version", process.env.AZURE_AI_API_VERSION || "v1");
  }
  return url.toString();
}

function getAuthStatus() {
  if (process.env.AZURE_AI_API_KEY) return { mode: "api-key", source: "AZURE_AI_API_KEY" };
  if (process.env.AZURE_OPENAI_API_KEY) return { mode: "api-key", source: "AZURE_OPENAI_API_KEY" };
  return { mode: "entra", source: "DefaultAzureCredential" };
}

async function getAgentAuthHeaders() {
  const apiKey = getAgentApiKey();
  if (apiKey) {
    return { "api-key": apiKey, Authorization: `Bearer ${apiKey}` };
  }

  const credential = new DefaultAzureCredential();
  const token = await credential.getToken("https://cognitiveservices.azure.com/.default");
  if (!token?.token) {
    const err = new Error(
      "Azure AI agent credentials are not configured. Set AZURE_AI_API_KEY or AZURE_OPENAI_API_KEY, or sign in with Azure CLI."
    );
    err.status = 503;
    throw err;
  }
  return { Authorization: `Bearer ${token.token}` };
}

module.exports = {
  DEFAULT_AGENT_RESPONSES_URL,
  getAgentApiKey,
  getAgentResponsesUrl,
  getAgentAuthHeaders,
  getAuthStatus,
};

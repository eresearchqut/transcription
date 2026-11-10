import {
  type BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

export const bedrockClientConfig = {
  region: process.env.AWS_REGION || "ap-southeast-2",
};

const ANTHROPIC_VERSION = process.env.ANTHROPIC_VERSION ?? "bedrock-2023-05-31";
const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID ?? "au.anthropic.claude-haiku-5-5";

interface ContentBlock {
  type: string;
  text?: string;
}

export const invokeModel = async (
  client: BedrockRuntimeClient,
  prompt: string,
  modelId: string = BEDROCK_MODEL_ID,
): Promise<string> => {
  // Prepare the payload for the model.
  const payload = {
    anthropic_version: ANTHROPIC_VERSION,
    max_tokens: 32000,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: prompt }],
      },
    ],
  };

  // Invoke Claude with the payload and wait for the response.
  const command = new InvokeModelCommand({
    contentType: "application/json",
    body: JSON.stringify(payload),
    modelId,
  });
  const apiResponse = await client.send(command);

  // Decode and return the text block, skipping any thinking blocks
  const responseBody = JSON.parse(new TextDecoder().decode(apiResponse.body));
  const text = (responseBody.content as ContentBlock[]).find(
    (block) => block.type === "text",
  )?.text;
  if (!text) {
    throw new Error(
      `Model returned no text (stop_reason: ${responseBody.stop_reason})`,
    );
  }
  return text;
};

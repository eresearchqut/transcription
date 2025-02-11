import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

export const bedrockClientConfig = {
  region: process.env.AWS_REGION || "ap-southeast-2",
};

export const invokeModel = async (
  client: BedrockRuntimeClient,
  prompt: string,
  modelId: string = "anthropic.claude-3-haiku-20240307-v1:0",
): Promise<string> => {
  // Prepare the payload for the model.
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1000,
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

  // Decode and return the response(s)
  const responseBody = JSON.parse(new TextDecoder().decode(apiResponse.body));
  return responseBody.content[0].text;
};

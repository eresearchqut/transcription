/**
 * Seeds test users into the local Cognito user pool created by
 * LocalUserPoolStack. Real deployments are fed by the QUT identity provider,
 * so this is only ever run against the emulator.
 *
 * The pool is discovered from the CloudFormation export that ApiStack imports,
 * so the script stays correct if the stack is renamed.
 *
 * `custom:eResearchGroups` is deliberately not seeded. LocalUserPoolStack
 * declares the attribute so the local pool matches the real schema, but the
 * value is set by the identity provider on the externally managed pool and its
 * format is not known here. Seeding a guess would look like coverage without
 * being any: getRoles is the only reader, its output reaches the /user route
 * alone, and nothing calls that route.
 *
 * Usage:
 *   docker compose up -d --wait
 *   pnpm ministack:seed-users
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const endpoint = process.env.MINISTACK_ENDPOINT ?? "http://localhost:24566";
const region = process.env.AWS_REGION ?? "ap-southeast-2";
const exportPrefix =
  process.env.USER_POOL_STACK_NAME ?? "local-transcription-user-pool";

/**
 * Driven through the AWS CLI because
 * @aws-sdk/client-cognito-identity-provider is not a dependency of any
 * workspace, and seeding local users does not justify adding one.
 */
const aws = (args, { tolerate } = {}) => {
  try {
    return execFileSync(
      "aws",
      ["--endpoint-url", endpoint, "--region", region, ...args],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: "test",
          AWS_SECRET_ACCESS_KEY: "test",
        },
      },
    );
  } catch (error) {
    const stderr = error.stderr?.toString() ?? "";
    if (tolerate && stderr.includes(tolerate)) return undefined;
    throw new Error(`aws ${args.join(" ")} failed: ${stderr || error.message}`);
  }
};

const userPoolArn = aws([
  "cloudformation",
  "list-exports",
  "--query",
  `Exports[?Name=='${exportPrefix}-UserPoolArn'].Value`,
  "--output",
  "text",
]).trim();

if (!userPoolArn) {
  throw new Error(
    `No ${exportPrefix}-UserPoolArn export found. Deploy the user pool stack first.`,
  );
}

const userPoolId = userPoolArn.split("/").at(-1);

const users = JSON.parse(
  readFileSync(new URL("./cognito-users.json", import.meta.url), "utf8"),
);

for (const { username, password, attributes } of users) {
  const userAttributes = Object.entries(attributes).map(
    ([Name, Value]) => `Name=${Name},Value=${Value}`,
  );

  // Re-running against an already seeded pool should be a no-op rather than an
  // error, so an existing user is updated in place.
  const created = aws(
    [
      "cognito-idp",
      "admin-create-user",
      "--user-pool-id",
      userPoolId,
      "--username",
      username,
      "--message-action",
      "SUPPRESS",
      "--user-attributes",
      ...userAttributes,
    ],
    { tolerate: "UsernameExistsException" },
  );

  if (!created) {
    aws([
      "cognito-idp",
      "admin-update-user-attributes",
      "--user-pool-id",
      userPoolId,
      "--username",
      username,
      "--user-attributes",
      ...userAttributes,
    ]);
  }

  // Without a permanent password the user stays in FORCE_CHANGE_PASSWORD and
  // cannot complete a sign-in.
  aws([
    "cognito-idp",
    "admin-set-user-password",
    "--user-pool-id",
    userPoolId,
    "--username",
    username,
    "--password",
    password,
    "--permanent",
  ]);

  console.log(
    `${created ? "created" : "updated"} ${username} (${attributes["custom:qutIdentityId"]})`,
  );
}

console.log(`\n${users.length} users seeded into ${userPoolId}`);

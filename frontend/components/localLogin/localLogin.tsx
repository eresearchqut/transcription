import { Button, Card, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { type FormEventHandler, type FunctionComponent, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";

export interface LocalLoginProps {
  onLogin(username: string, password: string): Promise<void>;
  error?: Error;
}

/**
 * Username and password sign-in for a local deploy, where the Cognito hosted UI
 * cannot be reached. Users come from `pnpm ministack:seed-users`.
 */
export const LocalLogin: FunctionComponent<LocalLoginProps> = ({
  onLogin,
  error,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    setSubmitting(true);
    onLogin(username, password).finally(() => setSubmitting(false));
  };

  return (
    <Card.Root size={"sm"} variant={"outline"} height={"100%"}>
      <Card.Header>
        <Card.Title asChild>
          <Heading as={"h2"} fontSize={"xl"}>
            Local development login
          </Heading>
        </Card.Title>
      </Card.Header>
      <Card.Body>
        <form onSubmit={onSubmit}>
          <Stack gap={4} align={"stretch"}>
            <Text>
              This environment runs against a local emulator, which has no
              access to the QUT identity provider. Sign in with one of the
              seeded users.
            </Text>
            <Field label={"Username"}>
              <Input
                id={"username"}
                name={"username"}
                autoComplete={"username"}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </Field>
            <Field label={"Password"}>
              <Input
                id={"password"}
                name={"password"}
                type={"password"}
                autoComplete={"current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </Field>
            <Button type={"submit"} loading={submitting}>
              Log in
            </Button>
            {error && (
              <Alert status={"error"} title={"Login failed"}>
                {error.message}
              </Alert>
            )}
          </Stack>
        </form>
      </Card.Body>
    </Card.Root>
  );
};

export default LocalLogin;

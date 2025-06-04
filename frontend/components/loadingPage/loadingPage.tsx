import { FunctionComponent } from "react";
import { Center, Progress, ProgressRootProps } from "@chakra-ui/react";

export interface LoadingPageProps extends Pick<ProgressRootProps, "size"> {
  label?: string;
  progress?: number;
  theme?: Record<string, any>;
}

export const LoadingPage: FunctionComponent<LoadingPageProps> = ({
  progress,
  label,
}) => {
  return (
    <Center minH={"25vh"} mt={"25vh"}>
      <Progress.Root
        value={progress ?? null}
        size={["xs", "sm", "md", "lg"]}
        width={"25vw"}
      >
        {label && (
          <Progress.Label fontSize={["xs", "sm", "md", "lg"]} mb={2}>
            {label}
          </Progress.Label>
        )}
        <Progress.Track>
          <Progress.Range />
        </Progress.Track>
      </Progress.Root>
    </Center>
  );
};

export default LoadingPage;

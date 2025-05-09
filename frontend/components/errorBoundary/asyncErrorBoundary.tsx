import { FunctionComponent, PropsWithChildren, useEffect } from "react";
import { useErrorBoundary } from "react-error-boundary";

const AsyncErrorBoundary: FunctionComponent<PropsWithChildren> = ({
  children,
}) => {
  const { showBoundary } = useErrorBoundary();

  useEffect(() => {
    const handleError = (event: ErrorEvent | PromiseRejectionEvent) => {
      showBoundary(event);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleError);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleError);
    };
  }, [showBoundary]);

  return children;
};

export default AsyncErrorBoundary;

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

    window.addEventListener("unhandledrejection", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleError);
    };
  }, [showBoundary]);

  return children;
};

export default AsyncErrorBoundary;

import { fetchAuthSession } from "aws-amplify/auth";

export interface FetcherProps {
  apiUrl: string;
  resource: "transcription";
  id?: string | string[];
  params?: any;
  init?: RequestInit;
}

export interface ApiErrorBody {
  message: string;
  status: number;
}

export class ApiError extends Error implements ApiErrorBody {
  message: string;
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.message = message;
    this.status = status;
  }
}

const createPath = (id?: string | string[]) =>
  id ? (Array.isArray(id) ? id.join("/") : id) : "";

const fetchAuthToken = () =>
  fetchAuthSession().then((session) => session.tokens?.idToken?.toString());

const rejectApiError = (response: Response) =>
  response
    .json()
    .then((errorResponse: ApiErrorBody) =>
      Promise.reject(new ApiError(errorResponse.message, response.status)),
    );

export const buildApiEndpoint = ({
  apiUrl,
  resource,
  id,
  params,
}: FetcherProps): URL => {
  const resourceSeparator = apiUrl.endsWith("/") ? "" : "/";
  const url = new URL(
    id
      ? `${apiUrl}${resourceSeparator}${resource}/${createPath(id)}`
      : `${apiUrl}${resourceSeparator}${resource}`,
  );
  if (params) {
    url.search = new URLSearchParams(params).toString();
  }
  return url;
};

export const getHeaders = async () =>
  fetchAuthToken()
    .then((idToken) => {
      if (idToken === undefined) throw Error("No idToken");
      return {
        Authorization: `Bearer ${idToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      } as HeadersInit;
    })
    .catch((error) => {
      // A missing token here is usually a transient failed token refresh (a
      // network blip during background polling). Return no headers so the
      // caller skips this request and retries on its next poll, rather than
      // forcing a logout. A genuine session loss is surfaced as a `signedOut`
      // auth event and handled in the auth context. Log the cause so repeated
      // skips (e.g. a persistent auth problem) remain diagnosable.
      console.debug("Skipping request: auth token unavailable", error);
      return undefined;
    });

export const getter = (props: FetcherProps) =>
  getHeaders().then(
    (headers) =>
      headers &&
      fetch(buildApiEndpoint(props), {
        ...props.init,
        headers,
      }).then((response) =>
        response.ok ? response.json() : rejectApiError(response),
      ),
  );

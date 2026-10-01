import type { RequestType } from "./types";

export const REQUEST_METHOD = {
  do: "POST",
  set: "PUT",
  remove: "DELETE",
} as const satisfies Record<RequestType, string>;

export type RequestMethod = (typeof REQUEST_METHOD)[RequestType];

const REQUEST_TYPES: RequestType[] = ["do", "set", "remove"];

export function requestTypeForMethod(method: string): RequestType | undefined {
  return REQUEST_TYPES.find(
    (requestType) => REQUEST_METHOD[requestType] === method,
  );
}

import { describe, expect, it } from "vitest";
import { REQUEST_METHOD, requestTypeForMethod } from "./requestTypes";

describe("REQUEST_METHOD", () => {
  it("maps do/set/remove to POST/PUT/DELETE", () => {
    expect(REQUEST_METHOD).toEqual({
      do: "POST",
      set: "PUT",
      remove: "DELETE",
    });
  });
});

describe("requestTypeForMethod", () => {
  it.each([
    ["POST", "do"],
    ["PUT", "set"],
    ["DELETE", "remove"],
  ])("maps %s to %s", (method, requestType) => {
    expect(requestTypeForMethod(method)).toBe(requestType);
  });

  it.each(["GET", "PATCH", "post", ""])(
    "has no request type for %j",
    (method) => {
      expect(requestTypeForMethod(method)).toBeUndefined();
    },
  );
});

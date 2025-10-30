import {
  getResource,
  putResource,
  updateResource,
} from "../../src/repository/repository";

describe("repository", () => {
  it("should be able to put a resource and then retrieve it", async () => {
    await putResource("pk", "sk", { foo: "bar", value: "none" });

    expect(await getResource("pk", "sk")).toEqual(
      expect.objectContaining({
        foo: "bar",
        pk: "pk",
        sk: "sk",
        value: "none",
      }),
    );

    await updateResource("pk", "sk", "foo", { bar: "nar" });

    expect(await getResource("pk", "sk")).toEqual(
      expect.objectContaining({
        foo: {
          bar: "nar",
        },
        pk: "pk",
        sk: "sk",
        value: "none",
      }),
    );

    await updateResource("pk", "sk", "wa", "far");

    expect(await getResource("pk", "sk")).toEqual(
      expect.objectContaining({
        foo: {
          bar: "nar",
        },
        wa: "far",
        pk: "pk",
        sk: "sk",
        value: "none",
      }),
    );
  });
});

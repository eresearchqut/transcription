const repository = require("../../src/repository/repository");

describe("repository", () => {


    it("should be able to put a resource and then retrieve it", async () => {
        await repository
            .putResource("pk", "sk", {});

        expect(await repository.getResource("pk", "sk")['data'])
            .toEqual([{}]);
    });


});

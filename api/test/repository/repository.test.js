const repository = require("../../src/repository/repository");

describe("repository", () => {


    it("should be able to put a resource and then retrieve it", async () => {

        await repository
            .putResource("pk", "sk", {'foo': 'bar', 'value': 'none'});

        expect(await repository.getResource("pk", "sk"))
            .toEqual(expect.objectContaining({"foo": "bar", "pk": "pk", "sk": "sk", "value": "none"}));


        await repository
            .updateResource("pk", "sk", 'foo', {bar: 'nar'});

        expect(await repository.getResource("pk", "sk"))
            .toEqual(expect.objectContaining({
                "foo": {
                    "bar": "nar"
                }, "pk": "pk", "sk": "sk", "value": "none"
            }));


        await repository
            .updateResource("pk", "sk", 'wa', 'far');

        expect(await repository.getResource("pk", "sk"))
            .toEqual(expect.objectContaining({
                "foo": {
                    "bar": "nar"
                }, "wa": "far", "pk": "pk", "sk": "sk", "value": "none"
            }));


    });


});

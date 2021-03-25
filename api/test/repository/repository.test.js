const repository = require("../../src/repository/repository");

describe("repository", () => {

    it("resource type sequence should start at 0 and then increment by 1", async () => {
        expect(await repository.getCurrentSequenceValue("RANDOM-RESOURCE"))
            .toEqual(0);
        expect(await repository.getNextSequenceValue("RANDOM-RESOURCE"))
            .toEqual(1);
        expect(await repository.getCurrentSequenceValue("RANDOM-RESOURCE"))
            .toEqual(1);
    });

    it("should be able to retrieve an existing resource", async () => {
        expect(await repository.getResource("RESEARCHER", "2ce68e20-b0ce-4933-8636-46066cba85d5"))
            .toEqual({id: "2ce68e20-b0ce-4933-8636-46066cba85d5", name: "Luke Skywalker"});
    });

    it("should be able to retrieve an existing resources metadata", async () => {
        expect(await repository.getResourceMetadata("RESEARCHER", "2ce68e20-b0ce-4933-8636-46066cba85d5"))
            .toEqual({
                "identityId": "2ce68e20-b0ce-4933-8636-46066cba85d5",
                "sequence": 1
            });
    });

    it("should be able to retrieve the child ids for a resource", async () => {
        expect(await repository.getChildResourceIds("LEAD", "RESEARCHER", "2ce68e20-b0ce-4933-8636-46066cba85d5", "CHECKLIST"))
            .toEqual(expect.arrayContaining(["cde6e419-c027-4955-88ef-9cf02611dd42", "c4a7e1cf-1b7e-4f32-9c11-6a850f78631d"]));
    });

    it("should be able to retrieve the parent ids for a resource", async () => {
        expect(await repository.getParentResourceIds("CHECKLIST", "cde6e419-c027-4955-88ef-9cf02611dd42", "LEAD", "RESEARCHER"))
            .toEqual(expect.arrayContaining(["2ce68e20-b0ce-4933-8636-46066cba85d5"]));
    });


    it("should be able to put a resource and then retrieve it", async () => {
        await repository.putResource("RESEARCHER", "6f99b3a2-3ab3-41fa-9dc7-fc465b69c4d3", {name: "Don Johnson"}, "bc297786-57d4-4bae-b84d-56b1e69df40c");
        expect(await repository.getResource("RESEARCHER", "6f99b3a2-3ab3-41fa-9dc7-fc465b69c4d3"))
            .toEqual({name: "Don Johnson"});

        expect(await repository.getResourceMetadata("RESEARCHER", "6f99b3a2-3ab3-41fa-9dc7-fc465b69c4d3"))
            .toHaveProperty("date");
        expect(await repository.getResourceMetadata("RESEARCHER", "6f99b3a2-3ab3-41fa-9dc7-fc465b69c4d3"))
            .toHaveProperty("sequence");
        expect(await repository.getResourceMetadata("RESEARCHER", "6f99b3a2-3ab3-41fa-9dc7-fc465b69c4d3"))
            .toHaveProperty("identityId");
    });


    it("update resource should fail on missing record", async () => {
        await expect(repository.updateResource("RESEARCHER", "607deb32-edfb-49bb-822f-a2bd7f89ea71", {name: "Sonny Crockett"}, "bc297786-57d4-4bae-b84d-56b1e69df40c"))
            .rejects.toThrow("The conditional request failed");
    });

    it("should be able update a resource", async () => {
        await repository.putResource("RESEARCHER", "3c5e1d3a-685a-4721-8dbc-e3b10c476a9e",
            {name: "Sonny Crockett"}, "bc297786-57d4-4bae-b84d-56b1e69df40c");

        expect(await repository.updateResource("RESEARCHER", "3c5e1d3a-685a-4721-8dbc-e3b10c476a9e",
            {name: "Sonny Crockett", actor: "Don Johnson"}, "bc297786-57d4-4bae-b84d-56b1e69df40c"))
            .toEqual({name: "Sonny Crockett", actor: "Don Johnson"});
    });


    it("should be able to link and unlink resources", async () => {
        await repository.putResource("RESEARCHER", "3fd340ff-d406-4f3b-a82e-8f0fe5bf2d7b", {name: "Dwight Schrute"});
        await repository.putResource("CHECKLIST", "88de3157-a94a-4c85-973a-836433fff2f8", {title: "DMC: The Office"})
        await repository.putChildResource("LEAD", "RESEARCHER", "3fd340ff-d406-4f3b-a82e-8f0fe5bf2d7b", "CHECKLIST", "88de3157-a94a-4c85-973a-836433fff2f8");
        expect(await repository.getChildResourceIds("LEAD", "RESEARCHER", "3fd340ff-d406-4f3b-a82e-8f0fe5bf2d7b", "CHECKLIST"))
            .toEqual(expect.arrayContaining(["88de3157-a94a-4c85-973a-836433fff2f8"]));

        await repository.deleteChildResource("LEAD", "RESEARCHER", "3fd340ff-d406-4f3b-a82e-8f0fe5bf2d7b", "CHECKLIST", "88de3157-a94a-4c85-973a-836433fff2f8");
        expect(await repository.getChildResourceIds("LEAD", "RESEARCHER", "3fd340ff-d406-4f3b-a82e-8f0fe5bf2d7b", "CHECKLIST"))
            .toEqual(expect.arrayContaining([]));
    });

    it("should be able to put a resource and then delete it", async () => {
        await repository.putResource("RESEARCHER", "b4bc208e-f605-4ac4-aaee-6f2bbbee792d", {name: "Ryuta Kawashima"});
        await repository.deleteResource("RESEARCHER", "b4bc208e-f605-4ac4-aaee-6f2bbbee792d");
        expect(await repository.getResource("RESEARCHER", "b4bc208e-f605-4ac4-aaee-6f2bbbee792d"))
            .toBeUndefined();
    });


});

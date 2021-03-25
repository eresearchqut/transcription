const researchService = require('../../src/service/researchService');
const {
    getChecklist,
    getChecklistMetadata,
    getChecklistsByRole,
    saveChecklist,
    createChecklist,
    deleteChecklist,
    search
} = require('../../src/service/transcriptionService');

const {reindex} = require('../../src/search/search');
jest.mock('../../src/service/researchService');
describe('research service test', function () {

    it("should be able to retrieve an existing checklist", async () => {
        expect(await getChecklist("cde6e419-c027-4955-88ef-9cf02611dd42"))
            .toEqual({
                "id": "cde6e419-c027-4955-88ef-9cf02611dd42",
                "project": {
                    "collaborators": [
                        {
                            "id": "134ca34a-b833-4f90-ab96-1989a13f48eb",
                            "name": "Han Solo"
                        },
                        {
                            "id": "305348b6-0510-45b4-93b5-868f7ecbdc60",
                            "name": "C-3PO"
                        }
                    ],
                    "lead": {
                        "id": "2ce68e20-b0ce-4933-8636-46066cba85d5",
                        "name": "Luke Skywalker"
                    },
                    "supervisor": {
                        "id": "2b46aa53-ad76-40ac-b427-20bb692f5475",
                        "name": "R2-D2"
                    },
                    "title": "DMC: A New Hope"
                }
            });
    });

    it("should be able to retrieve an existing checklist's metadata", async () => {


        researchService.getResearcher.mockImplementationOnce(() => Promise.resolve({
            "id": "2ce68e20-b0ce-4933-8636-46066cba85d5",
            "name": "Luke Skywalker"
        }));


        expect(await getChecklistMetadata("cde6e419-c027-4955-88ef-9cf02611dd42"))
            .toEqual({
                "identityId": "2ce68e20-b0ce-4933-8636-46066cba85d5",
                "lastUpdatedBy": {
                    "id": "2ce68e20-b0ce-4933-8636-46066cba85d5",
                    "name": "Luke Skywalker"
                },
                "sequence": 5
            });
    });

    it("get checklists by lead role", async () => {
        expect(await getChecklistsByRole("LEAD", "2ce68e20-b0ce-4933-8636-46066cba85d5"))
            .toMatchObject([
                {id: "c4a7e1cf-1b7e-4f32-9c11-6a850f78631d"},
                {id: "cde6e419-c027-4955-88ef-9cf02611dd42"}
            ]);
        expect(await getChecklistsByRole("LEAD", "2b46aa53-ad76-40ac-b427-20bb692f5475s"))
            .toEqual([]);
    });

    it("get checklists by supervisor role", async () => {
        expect(await getChecklistsByRole("SUPERVISOR", "2b46aa53-ad76-40ac-b427-20bb692f5475"))
            .toMatchObject([
                {project: {supervisor: {id: "2b46aa53-ad76-40ac-b427-20bb692f5475"}}}
            ]);
        expect(await getChecklistsByRole("SUPERVISOR", "2ce68e20-b0ce-4933-8636-46066cba85d5"))
            .toEqual([]);
    });


    it("get checklists by collaborator role", async () => {
        expect(await getChecklistsByRole("COLLABORATOR", "134ca34a-b833-4f90-ab96-1989a13f48eb"))
            .toMatchObject([
                {project: {collaborators: [{id: "134ca34a-b833-4f90-ab96-1989a13f48eb"}, {id: "305348b6-0510-45b4-93b5-868f7ecbdc60"}]}}
            ]);
        expect(await getChecklistsByRole("COLLABORATOR", "305348b6-0510-45b4-93b5-868f7ecbdc60"))
            .toMatchObject([
                {project: {collaborators: [{id: "134ca34a-b833-4f90-ab96-1989a13f48eb"}, {id: "305348b6-0510-45b4-93b5-868f7ecbdc60"}]}}
            ]);
        expect(await getChecklistsByRole("COLLABORATOR", "2ce68e20-b0ce-4933-8636-46066cba85d5"))
            .toEqual([]);
    });


    it("create, retrieve, update and delete checklist", async () => {

        researchService.getResearcher.mockImplementationOnce(() => Promise.resolve({
            "id": "134ca34a-b833-4f90-ab96-1989a13f48eb",
            "name": "Han Solo",
            "notNeeded": undefined
        }));

        let partialChecklist = {
            "project": {
                "collaborators": [
                    {
                        "id": "2ce68e20-b0ce-4933-8636-46066cba85d5",
                        "name": "Luke Skywalker"
                    },
                    {
                        "id": "2b46aa53-ad76-40ac-b427-20bb692f5475",
                        "name": "R2-D2"
                    }
                ],
                "supervisor": {
                    "id": "4be797ff-31eb-401c-b817-4a0835c3c736",
                    "name": "Leia Organa"
                },
                "title": "DMC: Return of the Jedi"
            }
        };

        let checklist = await createChecklist(partialChecklist, "134ca34a-b833-4f90-ab96-1989a13f48eb");
        expect(checklist)
            .toHaveProperty('id');
        expect(checklist)
            .toMatchObject(
                {project: {lead: {id: "134ca34a-b833-4f90-ab96-1989a13f48eb"}}});

        expect(checklist)
            .toHaveProperty('id');

        expect(await getChecklist(checklist.id))
            .toEqual(checklist);

        expect(await getChecklistsByRole("LEAD", "134ca34a-b833-4f90-ab96-1989a13f48eb"))
            .toEqual([
                checklist
            ]);

        expect(await getChecklistsByRole("SUPERVISOR", "4be797ff-31eb-401c-b817-4a0835c3c736"))
            .toEqual([
                checklist
            ]);

        expect(await getChecklistsByRole("COLLABORATOR", "2ce68e20-b0ce-4933-8636-46066cba85d5"))
            .toEqual([
                checklist
            ]);

        expect(await getChecklistsByRole("COLLABORATOR", "2b46aa53-ad76-40ac-b427-20bb692f5475"))
            .toEqual([
                checklist
            ]);


        delete checklist.project.supervisor;
        checklist.project.collaborators.pop();

        await saveChecklist(checklist);

        expect(await getChecklist(checklist.id))
            .toEqual(checklist);

        expect(await getChecklistsByRole("LEAD", "134ca34a-b833-4f90-ab96-1989a13f48eb"))
            .toEqual([
                checklist
            ]);

        expect(await getChecklistsByRole("SUPERVISOR", "4be797ff-31eb-401c-b817-4a0835c3c736"))
            .toEqual([]);

        expect(await getChecklistsByRole("COLLABORATOR", "2ce68e20-b0ce-4933-8636-46066cba85d5"))
            .toEqual([
                checklist
            ]);

        expect(await getChecklistsByRole("COLLABORATOR", "2b46aa53-ad76-40ac-b427-20bb692f5475"))
            .toEqual([]);

        await deleteChecklist(checklist.id);

        expect(await getChecklist(checklist.id))
            .toBeUndefined();

        expect(await getChecklistsByRole("LEAD", "134ca34a-b833-4f90-ab96-1989a13f48eb"))
            .toEqual([]);

        expect(await getChecklistsByRole("SUPERVISOR", "4be797ff-31eb-401c-b817-4a0835c3c736"))
            .toEqual([]);

        expect(await getChecklistsByRole("COLLABORATOR", "2ce68e20-b0ce-4933-8636-46066cba85d5"))
            .toEqual([]);

        expect(await getChecklistsByRole("COLLABORATOR", "2b46aa53-ad76-40ac-b427-20bb692f5475"))
            .toEqual([]);


    });


    it("search checklists", async () => {
        expect(await reindex('CHECKLIST'))
            .toEqual(3);

        expect(await search({query: 'Hope'}))
            .toEqual({
                    "FACETS": [{"FIELD": "id", "VALUE": "c4a7e1cf1b7e4f329c116a850f78631d", "_id": []}, {
                        "FIELD": "id",
                        "VALUE": "cde6e419c027495588ef9cf02611dd42",
                        "_id": ["6"]
                    }, {
                        "FIELD": "project.collaborators.id",
                        "VALUE": "134ca34ab8334f90ab961989a13f48eb",
                        "_id": ["6"]
                    }, {
                        "FIELD": "project.collaborators.id",
                        "VALUE": "305348b6051045b493b5868f7ecbdc60",
                        "_id": ["6"]
                    }, {
                        "FIELD": "project.collaborators.name",
                        "VALUE": "c3po",
                        "_id": ["6"]
                    }, {
                        "FIELD": "project.collaborators.name",
                        "VALUE": "han",
                        "_id": ["6"]
                    }, {"FIELD": "project.collaborators.name", "VALUE": "solo", "_id": ["6"]}, {
                        "FIELD": "project.lead.id",
                        "VALUE": "2ce68e20b0ce4933863646066cba85d5",
                        "_id": ["6"]
                    }, {"FIELD": "project.lead.name", "VALUE": "luke", "_id": ["6"]}, {
                        "FIELD": "project.lead.name",
                        "VALUE": "skywalker",
                        "_id": ["6"]
                    }, {
                        "FIELD": "project.supervisor.id",
                        "VALUE": "2b46aa53ad7640acb42720bb692f5475",
                        "_id": ["6"]
                    }, {"FIELD": "project.supervisor.name", "VALUE": "r2d2", "_id": ["6"]}, {
                        "FIELD": "project.title",
                        "VALUE": "a",
                        "_id": ["6"]
                    }, {"FIELD": "project.title", "VALUE": "back", "_id": []}, {
                        "FIELD": "project.title",
                        "VALUE": "dmc",
                        "_id": ["6"]
                    }, {"FIELD": "project.title", "VALUE": "empire", "_id": []}, {
                        "FIELD": "project.title",
                        "VALUE": "hope",
                        "_id": ["6"]
                    }, {"FIELD": "project.title", "VALUE": "new", "_id": ["6"]}, {
                        "FIELD": "project.title",
                        "VALUE": "strikes",
                        "_id": []
                    }],
                    "RESULT": [{
                        "_doc": {
                            "_id": 6,
                            "id": "cde6e419-c027-4955-88ef-9cf02611dd42",
                            "project": {
                                "collaborators": [{
                                    "id": "134ca34a-b833-4f90-ab96-1989a13f48eb",
                                    "name": "Han Solo"
                                }, {"id": "305348b6-0510-45b4-93b5-868f7ecbdc60", "name": "C-3PO"}],
                                "lead": {"id": "2ce68e20-b0ce-4933-8636-46066cba85d5", "name": "Luke Skywalker"},
                                "supervisor": {"id": "2b46aa53-ad76-40ac-b427-20bb692f5475", "name": "R2-D2"},
                                "title": "DMC: A New Hope"
                            }
                        }, "_id": "6", "_match": ["project.title:hope#1.00"], "_score": 1.39
                    }],
                    "RESULT_LENGTH": 1
                }
            );
    });


});

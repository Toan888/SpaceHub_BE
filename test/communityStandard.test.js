import communityStandardsController from "../controllers/communityStandards.js";
import { communityStandardsDao } from "../dao/index.js";
import { expect } from 'chai';
import sinon from 'sinon';

describe("Community Standards Controller-Tests", () => {
    let req, res, sandbox;

    beforeEach(() => {
        req = {
            params: {},
            body: {},
        };
        res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub(),
            send: sinon.stub(),
        };
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("getAllCommunityStandards", () => {
        let req, res, sandbox;

        beforeEach(() => {
            sandbox = sinon.createSandbox();
            req = {};
            res = {
                status: sandbox.stub().returnsThis(),
                json: sandbox.stub(),
            };
        });

        afterEach(() => {
            sandbox.restore();
        });

        it("should return filtered community standards and status 200", async () => {
            const mockCommunity = [
                { _id: "1", reason: "Spam", customeCommunityStandards: [] },
                { _id: "2", reason: "Harassment", customeCommunityStandards: [] },
                { _id: "3", reason: null, customeCommunityStandards: ["Custom Rule"] },
            ];

            const expectedFilteredCommunity = [
                { _id: "1", reason: "Spam", customeCommunityStandards: [] },
                { _id: "2", reason: "Harassment", customeCommunityStandards: [] },
            ];

            sandbox.stub(communityStandardsDao, "fetchAllCommunityStandards").resolves(expectedFilteredCommunity);

            await communityStandardsController.getAllCommunityStandards(req, res);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledWith(expectedFilteredCommunity)).to.be.true;
        });
        it("should return an empty array and status 200 when no community standards are found", async () => {
            sandbox.stub(communityStandardsDao, "fetchAllCommunityStandards").resolves([]);
        
            await communityStandardsController.getAllCommunityStandards(req, res);
        
            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledWith([])).to.be.true;
        });             
        it("should handle errors and return status 500", async () => {
            sandbox.stub(communityStandardsDao, "fetchAllCommunityStandards").rejects(new Error("Database error"));
            await communityStandardsController.getAllCommunityStandards(req, res);

            expect(res.status.calledWith(500)).to.be.true;
            expect(res.json.calledWith({ message: "Error: Database error" })).to.be.true;

        });
    });

    describe("addCommunityStandard", () => {
        let req, res, sandbox;

        beforeEach(() => {
            sandbox = sinon.createSandbox();
            req = {
                body: {
                    reason: "Spam",
                    customeCommunityStandards: ["No spamming allowed"],
                },
            };
            res = {
                status: sandbox.stub().returnsThis(),
                json: sandbox.stub(),
            };
        });

        afterEach(() => {
            sandbox.restore();
        });

        it("should create a new community standard and return status 201", async () => {
            const mockNewStandard = {
                _id: "123",
                reason: "Spam",
                customeCommunityStandards: ["No spamming allowed"],
            };

            sandbox.stub(communityStandardsDao, "addCommunityStandard").resolves(mockNewStandard);

            await communityStandardsController.addCommunityStandard(req, res);

            expect(res.status.calledWith(201)).to.be.true;
            expect(res.json.calledWith(mockNewStandard)).to.be.true;
        });

        it("should handle errors and return status 500", async () => {
            sandbox.stub(communityStandardsDao, "addCommunityStandard").rejects(new Error("Database error"));

            await communityStandardsController.addCommunityStandard(req, res);

            expect(res.status.calledWith(500)).to.be.true;
            expect(res.json.calledWith({ message: "Database error" })).to.be.true;
        });
    });
})
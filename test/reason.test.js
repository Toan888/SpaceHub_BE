import reasonController from "../controllers/reasons.js";
import { reasonsDao } from "../dao/index.js";
import { expect } from 'chai';
import sinon from 'sinon';

describe("Reason Controller-Tests", () => {
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

    describe("getAllReasons", () => {
        let req, res, sandbox;
      
        beforeEach(() => {
          sandbox = sinon.createSandbox();
          req = {}; // Không cần thông tin body hoặc query trong trường hợp này
          res = {
            status: sandbox.stub().returnsThis(),
            json: sandbox.stub(),
          };
        });
      
        afterEach(() => {
          sandbox.restore();
        });
      
        it("should return all reasons and status 200", async () => {
          const mockReasons = [
            { _id: "1", reason: "Reason 1" },
            { _id: "2", reason: "Reason 2" },
          ];
      
          sandbox.stub(reasonsDao, "fetchAllReasons").resolves(mockReasons);
      
          await reasonController.getAllReasons(req, res);
      
          expect(res.status.calledWith(200)).to.be.true;
          expect(res.json.calledWith(mockReasons)).to.be.true;
        });
      
        it("should handle errors and return status 500", async () => {
          sandbox.stub(reasonsDao, "fetchAllReasons").rejects(new Error("Database error"));
      
          await reasonController.getAllReasons(req, res);
      
          expect(res.status.calledWith(500)).to.be.true;
          expect(res.json.calledWith({ error: "Error: Database error" })).to.be.true;
        });
      });
      it("should return an empty array if no reasons are found", async () => {
        const mockReasons = [];

        sandbox.stub(reasonsDao, "fetchAllReasons").resolves(mockReasons);

        await reasonController.getAllReasons(req, res);

        expect(res.status.calledWith(200)).to.be.true;
        expect(res.json.calledWith(mockReasons)).to.be.true;
    });

    it("should return status 500 if fetchAllReasons returns null", async () => {
        sandbox.stub(reasonsDao, "fetchAllReasons").resolves(null);

        await reasonController.getAllReasons(req, res);

        expect(res.status.calledWith(500)).to.be.true;
        expect(res.json.calledWith({ error: "Error: Cannot retrieve reasons" })).to.be.true;
    });

    it("should return status 500 if fetchAllReasons returns undefined", async () => {
        sandbox.stub(reasonsDao, "fetchAllReasons").resolves(undefined);

        await reasonController.getAllReasons(req, res);

        expect(res.status.calledWith(500)).to.be.true;
        expect(res.json.calledWith({ error: "Error: Cannot retrieve reasons" })).to.be.true;
    });

      
});

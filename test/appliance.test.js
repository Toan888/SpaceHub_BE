import appliancesController from "../controllers/appliances.js";
import { appliancesDao } from "../dao/index.js";
import bcrypt from "bcrypt";
import { expect } from 'chai';
import sinon from 'sinon';

describe("Appliance Controller Tests", () => {
  

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

  describe("getAllAppliances", () => {
    it("should return all appliances with status 200", async () => {
      const mockAppliances = [
        { id: 1, name: "Fridge" },
        { id: 2, name: "Washing Machine" },
      ];

      sandbox.stub(appliancesDao, "fetchAllAppliances").resolves(mockAppliances);

      await appliancesController.getAllAppliances(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(mockAppliances)).to.be.true;
    });

    it("should handle errors and return status 500", async () => {
      sandbox.stub(appliancesDao, "fetchAllAppliances").rejects(new Error("Database error"));

      await appliancesController.getAllAppliances(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: "Error: Database error" })).to.be.true;
    });

    it("should return an empty array if no appliances are found", async () => {
      const mockAppliances = [];
  
      sandbox.stub(appliancesDao, "fetchAllAppliances").resolves(mockAppliances);
  
      await appliancesController.getAllAppliances(req, res);
  
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(mockAppliances)).to.be.true;
    });
  
    it("should return status 500 if fetchAllAppliances returns null", async () => {
      sandbox.stub(appliancesDao, "fetchAllAppliances").resolves(null);
  
      await appliancesController.getAllAppliances(req, res);
  
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: "Error: Cannot retrieve appliances" })).to.be.true;
    });
  
    it("should return status 500 if fetchAllAppliances returns undefined", async () => {
      sandbox.stub(appliancesDao, "fetchAllAppliances").resolves(undefined);
  
      await appliancesController.getAllAppliances(req, res);
  
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: "Error: Cannot retrieve appliances" })).to.be.true;
    });

    it("should handle an empty request object", async () => {
      req = {}; // Empty request object
  
      const mockAppliances = [
        { id: 1, name: "Fridge" },
        { id: 2, name: "Washing Machine" },
      ];
  
      sandbox.stub(appliancesDao, "fetchAllAppliances").resolves(mockAppliances);
  
      await appliancesController.getAllAppliances(req, res);
  
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(mockAppliances)).to.be.true;
    });
  
    it("should handle a request object with unexpected fields", async () => {
      req = { randomField: "unexpected" }; // Unexpected request object fields
  
      const mockAppliances = [
        { id: 1, name: "Fridge" },
        { id: 2, name: "Washing Machine" },
      ];
  
      sandbox.stub(appliancesDao, "fetchAllAppliances").resolves(mockAppliances);
  
      await appliancesController.getAllAppliances(req, res);
  
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(mockAppliances)).to.be.true;
    });
  
  
    it("should handle database timeout errors gracefully", async () => {
      sandbox.stub(appliancesDao, "fetchAllAppliances").rejects(new Error("Timeout error"));
  
      await appliancesController.getAllAppliances(req, res);
  
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: "Error: Timeout error" })).to.be.true;
    });
  
    it("should return status 500 if fetchAllAppliances throws an unexpected error", async () => {
      sandbox.stub(appliancesDao, "fetchAllAppliances").rejects(new Error("Unexpected error"));
  
      await appliancesController.getAllAppliances(req, res);
  
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: "Error: Unexpected error" })).to.be.true;
    });
  
    it("should return status 500 if the database connection is lost", async () => {
      sandbox.stub(appliancesDao, "fetchAllAppliances").rejects(new Error("Database connection lost"));
  
      await appliancesController.getAllAppliances(req, res);
  
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: "Error: Database connection lost" })).to.be.true;
    });
  
    it("should handle very large datasets efficiently", async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, index) => ({
        id: index + 1,
        name: `Appliance ${index + 1}`,
      }));
  
      sandbox.stub(appliancesDao, "fetchAllAppliances").resolves(largeDataset);
  
      await appliancesController.getAllAppliances(req, res);
  
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(largeDataset)).to.be.true;
    });
  
  
  });

  describe("getAllAppliancesByCategories", () => {
    it("should return all appliances with status 200", async () => {
      const mockAppliances = { id: 1, name: "Fridge", categoryId: "123" };
  
      sandbox.stub(appliancesDao, "fetchAllAppliancesCategories").resolves(mockAppliances);
  
      req.params = { cateid: "123" };
  
      await appliancesController.getAllAppliancesByCategories(req, res);
  
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(mockAppliances)).to.be.true;
    });
  
    it("should handle errors and return status 500", async () => {
      sandbox.stub(appliancesDao, "fetchAllAppliancesCategories").rejects(new Error("Database error"));
  
      req.params = { cateid: "123" };
  
      await appliancesController.getAllAppliancesByCategories(req, res);
  
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ success: false, message: "Internal server error" })).to.be.true;
    });
  
    it("should handle unexpected fields in the request object gracefully", async () => {
      req.params = { cateid: "123", extraField: "unexpected" }; // Dữ liệu không liên quan
  
      const mockAppliances = { id: 1, name: "Fridge", categoryId: "123" };
  
      sandbox.stub(appliancesDao, "fetchAllAppliancesCategories").resolves(mockAppliances);
  
      await appliancesController.getAllAppliancesByCategories(req, res);
  
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(mockAppliances)).to.be.true;
    });
  
    it("should return status 500 if the database connection fails", async () => {
      sandbox.stub(appliancesDao, "fetchAllAppliancesCategories").rejects(new Error("Database connection lost"));
  
      req.params = { cateid: "123" };
  
      await appliancesController.getAllAppliancesByCategories(req, res);
  
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ success: false, message: "Internal server error" })).to.be.true;
    });
  
    it("should handle large datasets efficiently", async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Appliance ${i + 1}`,
        categoryId: "123",
      }));
  
      sandbox.stub(appliancesDao, "fetchAllAppliancesCategories").resolves(largeDataset);
  
      req.params = { cateid: "123" };
  
      await appliancesController.getAllAppliancesByCategories(req, res);
  
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(largeDataset)).to.be.true;
    });
  
  });
  
  describe("createAppliance", () => {
    it("should create a new appliance and return status 201", async () => {
      const mockApplianceData = {
        name: "Fridge",
        appliances: ["Cooling", "Freezer"],
        categoryId: "123",
      };
  
      const mockSavedAppliance = {
        id: "1",
        name: "Fridge",
        appliances: ["Cooling", "Freezer"],
        categoryId: "123",
      };
  
      req.body = mockApplianceData;
  
      sandbox.stub(appliancesDao, "addAppliance").resolves(mockSavedAppliance);
  
      await appliancesController.createAppliance(req, res);
  
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledWith({ success: true, appliance: mockSavedAppliance })).to.be.true;
    });
    it("should create a new appliance with an empty name if name is missing", async () => {
      const mockApplianceData = {
        appliances: ["Cooling", "Freezer"],
        categoryId: "123",
      };
    
      const mockSavedAppliance = {
        id: "1",
        name: "",
        appliances: ["Cooling", "Freezer"],
        categoryId: "123",
      };
    
      req.body = mockApplianceData;
    
      sandbox.stub(appliancesDao, "addAppliance").resolves(mockSavedAppliance);
    
      await appliancesController.createAppliance(req, res);
    
      expect(res.status.calledWith(201)).to.be.true;
      expect(
        res.json.calledWith({ success: true, appliance: mockSavedAppliance })
      ).to.be.true;
    });
    it("should create a new appliance with an empty name if name is an empty string", async () => {
      const mockApplianceData = {
        name: "",
        appliances: ["Cooling", "Freezer"],
        categoryId: "123",
      };
    
      const mockSavedAppliance = {
        id: "1",
        name: "",
        appliances: ["Cooling", "Freezer"],
        categoryId: "123",
      };
    
      req.body = mockApplianceData;
    
      sandbox.stub(appliancesDao, "addAppliance").resolves(mockSavedAppliance);
    
      await appliancesController.createAppliance(req, res);
    
      expect(res.status.calledWith(201)).to.be.true;
      expect(
        res.json.calledWith({ success: true, appliance: mockSavedAppliance })
      ).to.be.true;
    });
        
    
    
    it("should return status 400 if categoryId is missing", async () => {
      req.body = {
        name: "Fridge",
        appliances: ["Cooling", "Freezer"],
        // Thiếu categoryId
      };
    
      await appliancesController.createAppliance(req, res);
    
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ success: false, message: "categoryId cannot be empty" })).to.be.true;
    });
    
    it("should return status 400 if appliances array is empty", async () => {
      req.body = { name: "Fridge", appliances: [], categoryId: "123" };
  
      await appliancesController.createAppliance(req, res);
  
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ success: false, message: "Appliances list cannot be empty" })).to.be.true;
    });  

    it("should return status 400 if both appliances and categoryId are missing", async () => {
      req.body = {
        name: "Fridge", // appliances và categoryId bị thiếu
      };
    
      await appliancesController.createAppliance(req, res);
    
      expect(res.status.calledWith(400)).to.be.true;
      expect(
        res.json.calledWith({
          success: false,
          message: "appliances and categoryId cannot be empty",
        })
      ).to.be.true;
    });
    it("should return status 400 if appliances array is empty", async () => {
      req.body = { name: "Fridge", appliances: [], categoryId: "123" };
  
      await appliancesController.createAppliance(req, res);
  
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ success: false, message: "Appliances list cannot be empty" })).to.be.true;
    });
  
    it("should handle errors and return status 500", async () => {
      const mockApplianceData = {
        name: "Fridge",
        appliances: ["Cooling", "Freezer"],
        categoryId: "123",
      };
  
      req.body = mockApplianceData;
  
      sandbox.stub(appliancesDao, "addAppliance").rejects(new Error("Error creating new appliance in DAO"));
  
      await appliancesController.createAppliance(req, res);
  
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ success: false, message: "Error creating appliance" })).to.be.true;
    });

    it("should handle duplicate appliances gracefully", async () => {
      const mockApplianceData = {
        name: "Fridge",
        appliances: ["Cooling", "Freezer"],
        categoryId: "123",
      };
  
      req.body = mockApplianceData;
  
      sandbox.stub(appliancesDao, "addAppliance").rejects(new Error("Duplicate key error"));
  
      await appliancesController.createAppliance(req, res);
  
      expect(res.status.calledWith(409)).to.be.true; // Conflict
      expect(res.json.calledWith({ success: false, message: "Appliance already exists" })).to.be.true;
    });
  
  });
  

});

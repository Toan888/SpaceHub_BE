import notificationController from "../controllers/notificationController.js";
import { notificationDao } from "../dao/index.js";
import bcrypt from "bcrypt";
import { expect } from 'chai';
import sinon from 'sinon';

describe("Notification Controller-Tests", () => {
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

    describe("getAllNotifications", () => {
        let req, res, sandbox;

        beforeEach(() => {
            sandbox = sinon.createSandbox();
            req = {
                query: {
                    userId: "123",
                },
            };
            res = {
                status: sandbox.stub().returnsThis(), 
                json: sandbox.stub(), 
                send: sandbox.stub(), 

            };
        });

        afterEach(() => {
            sandbox.restore();
        });

        it("should return notifications for the user with status 200", async () => {
            const mockNotificationList = [
                { _id: "notif1", message: "Notification 1" },
                { _id: "notif2", message: "Notification 2" },
              ];
          

            sandbox.stub(notificationDao, "getNotificationsByUserId").resolves(mockNotificationList);

            await notificationController.getAllNotifications(req, res);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.send.calledWith(mockNotificationList)).to.be.true;
        });

        it("should handle errors and return status 500", async () => {
            sandbox.stub(notificationDao, "getNotificationsByUserId").rejects(new Error("Database error"));

            await notificationController.getAllNotifications(req, res);

            expect(res.status.calledWith(500)).to.be.true;
            expect(res.json.calledWith({ message: "Error: Database error" })).to.be.true;
        });
    });


    describe("markAllNotificationsAsRead", () => {
        let req, res, sandbox;

        beforeEach(() => {
            sandbox = sinon.createSandbox();
            req = {
                body: {
                    notificationList: ["notif1", "notif2", "notif3"],
                    userId: "123",
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

        it("should mark notifications as read and return status 200", async () => {
            const mockResult = { nModified: 3 };

            sandbox.stub(notificationDao, "markNotificationAsRead").resolves(mockResult);

            await notificationController.markAllNotificationsAsRead(req, res);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledWith({ message: "success" })).to.be.true;
        });

        it("should handle errors and return status 500", async () => {
            sandbox.stub(notificationDao, "markNotificationAsRead").rejects(new Error("Database error"));

            await notificationController.markAllNotificationsAsRead(req, res);

            expect(res.status.calledWith(500)).to.be.true;
            expect(res.json.calledWith({ message: "Error: Database error" })).to.be.true;
        });
    });

})
import reportsController from "../controllers/reports.js";
import { notificationDao, reportsDao } from "../dao/index.js";
import { expect } from 'chai';
import sinon from 'sinon';
import Spaces from "../models/spaces.js";
import Users from "../models/users.js";
import mongoose from "mongoose";
describe("getAllReports", () => {
    let req, res, sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        req = {}; // Không cần request body hoặc query trong trường hợp này
        res = {
            status: sandbox.stub().returnsThis(),
            json: sandbox.stub(),
        };
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should return all reports and status 200", async () => {
        const mockReports = [
            { _id: "1", reasonId: { _id: "r1", reason: "Spam" }, userId: "u1", spaceId: "s1" },
            { _id: "2", reasonId: { _id: "r2", reason: "Harassment" }, userId: "u2", spaceId: "s2" },
        ];

        sandbox.stub(reportsDao, "fetchAllReports").resolves(mockReports);

        await reportsController.getAllReports(req, res);

        expect(res.status.calledWith(200)).to.be.true;
        expect(res.json.calledWith(mockReports)).to.be.true;
    });


    it("should return an empty array if no reports are found", async () => {
        const mockReports = [];

        sandbox.stub(reportsDao, "fetchAllReports").resolves(mockReports);

        await reportsController.getAllReports(req, res);

        expect(res.status.calledWith(200)).to.be.true;
        expect(res.json.calledWith(mockReports)).to.be.true;
    });

    it("should handle errors and return status 500", async () => {
        sandbox.stub(reportsDao, "fetchAllReports").rejects(new Error("Database error"));

        await reportsController.getAllReports(req, res);

        expect(res.status.calledWith(500)).to.be.true;
        expect(res.json.calledWith({ error: "Database error" })).to.be.true;
    });

});

describe('createReports', () => {
    let createReportsStub, findByIdStub, findByIdAndUpdateStub, saveAndSendNotificationStub, sandbox;

    beforeEach(() => {
        // Khởi tạo sandbox và stub các phương thức
        sandbox = sinon.createSandbox();
        createReportsStub = sandbox.stub(reportsDao, 'createReports');
        findByIdStub = sandbox.stub(Spaces, 'findById');
        findByIdAndUpdateStub = sandbox.stub(Spaces, 'findByIdAndUpdate');
        saveAndSendNotificationStub = sandbox.stub(notificationDao, 'saveAndSendNotification');
    });

    afterEach(() => {
        // Khôi phục sandbox sau mỗi test case
        sandbox.restore();
    });

    it('should create a report and return the report object with status 200', async () => {
        const mockReport = {
            _id: new mongoose.Types.ObjectId(),
            reasonId: 'r1',
            userId: new mongoose.Types.ObjectId(),
            spaceId: new mongoose.Types.ObjectId(),
            customReason: 'Custom Reason',
        };

        // Đảm bảo các stub trả về ObjectId hợp lệ
        createReportsStub.resolves(mockReport);
        findByIdStub.resolves({ _id: mockReport.spaceId, name: 'Test Space', reportCount: 2, userId: mockReport.userId });
        sandbox.stub(Users, 'findById').resolves({ _id: mockReport.userId, fullname: 'John Doe', avatar: null });
        saveAndSendNotificationStub.resolves();

        const req = {
            body: {
                reasonId: 'r1',
                userId: mockReport.userId.toString(),
                spaceId: mockReport.spaceId.toString(),
                customReason: 'Custom Reason',
            },
        };

        const res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub(),
        };

        await reportsController.createReports(req, res);
        
        // Assertions
        expect(createReportsStub.calledOnceWith('r1', mockReport.userId.toString(), mockReport.spaceId.toString(), 'Custom Reason')).to.be.true;
        expect(res.status.calledOnceWith(200)).to.be.true;
        expect(res.json.calledOnceWith(mockReport)).to.be.true;
    });

    it('should update censorship if reportCount >= 3 and send notifications', async () => {
        const mockReport = {
            _id: 'rep1',
            reasonId: 'r1',
            userId: 'u1',
            spaceId: 's1',
            customReason: 'Custom Reason',
        };
        const mockSpace = { _id: 's1', name: 'Test Space', reportCount: 3, userId: 'u2' };
        const mockUser = { _id: 'u1', fullname: 'John Doe', avatar: null };

        createReportsStub.resolves(mockReport);
        findByIdStub.resolves(mockSpace);
        sandbox.stub(Users, 'findById').resolves(mockUser);
        findByIdAndUpdateStub.resolves();
        saveAndSendNotificationStub.resolves();

        const req = {
            body: {
                reasonId: 'r1',
                userId: 'u1',
                spaceId: 's1',
                customReason: 'Custom Reason',
            },
        };
        const res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub(),
        };

        await reportsController.createReports(req, res);

        // Kiểm tra các hàm stub đã được gọi đúng
        expect(findByIdAndUpdateStub.calledOnceWith('s1', { censorship: 'Chờ duyệt' }, { new: true })).to.be.true;
        expect(saveAndSendNotificationStub.calledTwice).to.be.true;
    });

    it('should return 500 if an error occurs during report creation', async () => {
        createReportsStub.rejects(new Error('Database error'));

        const req = {
            body: {
                reasonId: 'r1',
                userId: 'u1',
                spaceId: 's1',
                customReason: 'Custom Reason',
            },
        };
        const res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub(),
        };

        await reportsController.createReports(req, res);

        // Kiểm tra kết quả khi có lỗi
        expect(createReportsStub.calledOnceWith('r1', 'u1', 's1', 'Custom Reason')).to.be.true;
        expect(res.status.calledOnceWith(500)).to.be.true;
        expect(res.json.calledOnceWith({ error: 'Error: Database error' })).to.be.true;
    });

    it('should use default avatar when user avatar is null', async () => {
        const mockReport = {
            _id: 'rep1',
            reasonId: 'r1',
            userId: 'u1',
            spaceId: 's1',
            customReason: 'Custom Reason',
        };
        const mockSpace = { _id: 's1', name: 'Test Space', reportCount: 2, userId: 'u2' };
        const mockUser = { _id: 'u1', fullname: 'John Doe', avatar: null };

        createReportsStub.resolves(mockReport);
        findByIdStub.resolves(mockSpace);
        sandbox.stub(Users, 'findById').resolves(mockUser);
        saveAndSendNotificationStub.resolves();

        const req = {
            body: {
                reasonId: 'r1',
                userId: 'u1',
                spaceId: 's1',
                customReason: 'Custom Reason',
            },
        };
        const res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub(),
        };

        await reportsController.createReports(req, res);

        const defaultAvatar = 'https://cellphones.com.vn/sforum/wp-content/uploads/2023/10/avatar-trang-4.jpg';
        expect(saveAndSendNotificationStub.calledWith(
            sinon.match.any,
            sinon.match.any,
            defaultAvatar
        )).to.be.true;
    });
});



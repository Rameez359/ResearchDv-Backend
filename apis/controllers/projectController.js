const database = require('../../private/database/connectDb');
const common = require('./commonController');
const projectService = require('../services/projectService');
const { ObjectId } = require('mongodb');
const db = database.getDbClient();
require('dotenv').config();

const createProject = async (payload) => {
    try {
        let projectName;
        let projectType;
        if (payload) {
            userId = payload.userId ? payload.userId : '';
            projectName = payload.projectName ? payload.projectName : '';
            projectType = payload.projectType ? payload.projectType : '';
        }
        console.log(userId, projectName, projectType, 'values');

        if (!(projectName && projectType && userId)) {
            return { Error: 'Invalid Perameters' };
        }
        const projectsPath = process.env.PROJECT_FOLDER_ID;

        const projectFolderId = await common.createFolder1(projectsPath, null, projectName, 'parent');
        const resultFolderId = await common.createFolder1(projectFolderId, null, 'Results', 'parent');

        const insertObj = {
            userId: new ObjectId(userId),
            projectName: projectName,
            projectType: projectType,
            projectFolderId: projectFolderId,
            resultFolderId: resultFolderId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const projectResponse = await db.collection('projects').insertOne(insertObj);
        return projectResponse;
    } catch (error) {
        console.error('Error creating flock:', error);
        return error;
    }
};

const getUserProject = async (userId) => {
    try {
        const projects = await db
            .collection('projects')
            .find({ userId: new ObjectId(userId) })
            .toArray();

        const totalProjects = await db
            .collection('projects')
            .find({ userId: new ObjectId(userId) })
            .count();
        const data = {
            projects: projects,
            totalProjects: totalProjects,
        };
        return data;
    } catch (error) {
        console.error('Error creating flock:', error);
        return error;
    }
};

const getUserDatasets = async (userId) => {
    try {
        const datasets = await db
            .collection('datasets')
            .find({ userId: new ObjectId(userId) })
            .toArray();

        const totalDatasets = await db
            .collection('datasets')
            .find({ userId: new ObjectId(userId) })
            .count();

        const data = {
            datasets: datasets,
            totalDatasets: totalDatasets,
        };

        return data;
    } catch (error) {
        console.error('Error fetching datasets:', error);
        return error;
    }
};

const uploadProjectData = async (payload, fileName) => {
    try {
        const projectId = payload.projectId;
        const userProjects = await db
            .collection('projects')
            .findOneAndUpdate(
                { _id: new ObjectId(projectId) },
                { $push: { filesPath: fileName } },
                { returnNewDocument: 'true' }
            );
        if (!userProjects) {
            return { Error: 'Invalid projectId' };
        }

        return userProjects;
    } catch (error) {
        console.error('Error creating flock:', error);
        return error;
    }
};

const createDataset = async (datasetName, mainFolderId, validationId, trainId, testId, userId) => {
    const datasetBody = {
        userId: new ObjectId(userId),
        name: datasetName,
        driveFolderId: mainFolderId,
        trainFolderId: trainId,
        testFolderId: testId,
        validId: validationId,
    };
    const dataset = await db.collection('datasets').insertOne(datasetBody);
    
    return dataset;
};

const postTrainModel = async (req, res, next) => {
    try {
        console.log(`Post Train Model payload request : ${JSON.stringify(req.body)}`);
        const payload = req.body;

        const userId = payload.userId || '';
        const projectId = payload.projectId || '';
        const datasetId = payload.datasetId || '';
        const modelName = payload.modelName || '';

        if (!(userId && projectId && datasetId && modelName))
            return returnResponse(res, 400, 'Please Send All Required Params');

        const project = await projectService.getProjects({ userId: userId, projectId: projectId });
        if (!project) return returnResponse(res, 400, 'Invalid Project Id');
        console.log(`Project Name: ${JSON.stringify(project[0])}`);
        const dataset = await projectService.getDatasets({ userId: userId, datasetId: datasetId });
        if (!dataset) return returnResponse(res, 400, 'Invalid Dataset Id');

        const document = {
            userId: new ObjectId(userId),
            projectDetails: project[0],
            datasetDetails: dataset[0],
            modelName: modelName,
            trainingAction: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        console.log(`Document before Inserting in Database: ${JSON.stringify(document)}`);

        const trainResp = await db.collection('train').insertOne(document);
        console.log(`Train Response : ${JSON.stringify(trainResp)}`);
        if (trainResp.acknowledged)
            return returnResponse(res, 201, 'Train Model Request has been Inserted Successfully', trainResp);
        else return returnResponse(res, 500, 'Something Went Wrong in Inserting Train Request', trainResp);

        // {
        //     datasetName: dataset.name,
        //     datasetId: new ObjectId(datasetId),
        //     driveFolderId: dataset.driveFolderId,
        //     trainFolderId: dataset.trainFolderId,
        //     testFolderId: dataset.testFolderId,
        //     validId: dataset.validId,
        // },
    } catch (error) {
        console.log(`Error in postTrainModel: ${error}`);
        returnResponse(res, 500, error);
    }
};

const returnResponse = (res, statusCode, msg, data = null) => {
    // const response = {
    //     statusCode: statusCode,
    //     message: msg,
    //     data: data,
    // };
    res.status(statusCode).json({
        statusCode: statusCode,
        message: msg,
        data: data,
    });
};

module.exports = {
    createProject,
    getUserProject,
    uploadProjectData,
    createDataset,
    getUserDatasets,
    postTrainModel,
};

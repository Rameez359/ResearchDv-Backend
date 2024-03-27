const database = require('../../private/database/connectDb');
const { ObjectId } = require('mongodb');
const db = database.getDbClient();

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
        const insertObj = {
            userId: new ObjectId(userId),
            projectName: projectName,
            projectType: projectType,
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
        const totalDatasets = await db
            .collection('datasets')
            .find({ userId: new ObjectId(userId) })
            .count();

        return totalDatasets;
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
    const datasetId = dataset.insertedId;
    return datasetId;
};

module.exports = {
    createProject,
    getUserProject,
    uploadProjectData,
    createDataset,
    getUserDatasets,
};

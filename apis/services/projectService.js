const database = require('../../private/database/connectDb');
const common = require('../controllers/commonController');
const { ObjectId } = require('mongodb');
const db = database.getDbClient();
require('dotenv').config();

const getProjects = async (data) => {
    console.log(`Get User's Projects Start with Request : ${JSON.stringify(data)}`);

    const userId = data.userId || '';
    const projectId = data.projectId || '';
    const filter = [];

    if (userId) filter.push({ userId: new ObjectId(userId) });
    if (projectId) filter.push({ _id: new ObjectId(projectId) });

    console.log(`Get Projects Filters : ${JSON.stringify(filter)}`);

    let projects;
    if (filter.length > 0) projects = await db.collection('projects').find({ $and: filter }).toArray();
    else projects = await db.collection('projects').find().toArray();

    console.log(`User's Projects Ended with Response : [${JSON.stringify(projects)}]`);

    return projects;
};

const getDatasets = async (data) => {
    console.log(`Get User's Datasets Start with Request : ${JSON.stringify(data)}`);

    const userId = data.userId || '';
    const datasetId = data.datasetId || '';
    const filter = [];

    if (userId) filter.push({ userId: new ObjectId(userId) });
    if (datasetId) filter.push({ _id: new ObjectId(datasetId) });

    console.log(`Get Datasets Filters : ${JSON.stringify(filter)}`);

    let datasets;
    if (filter.length > 0) datasets = await db.collection('datasets').find({ $and: filter }).toArray();
    else datasets = await db.collection('datasets').find().toArray();

    console.log(`User's Datasets Ended with Response : [${JSON.stringify(datasets)}]`);

    return datasets;
};

module.exports = {
    getProjects,
    getDatasets,
};

const database = require('../../private/database/connectDb');
const common = require('../controllers/commonController');
const { ObjectId } = require('mongodb');
const db = database.getDbClient();
require('dotenv').config();

exports.addDatasets = async (userId, datasetName, uploadFileId) => {
    const body = {
        userId: new ObjectId(userId),
        datasetName: datasetName,
        uploadFileId: uploadFileId,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    datasets = await db.collection('datasets').insertOne(body);
    console.log(`User's Datasets Ended with Response : [${JSON.stringify(datasets)}]`);

    return datasets;
};

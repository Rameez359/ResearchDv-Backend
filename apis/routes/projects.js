var express = require('express');
const projectController = require('../controllers/projectController');
const commonController = require('../controllers/commonController');

var router = express.Router();
const fs = require('fs');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const { google } = require('googleapis');

const { verifyToken } = require('../controllers/verifyToken');

router.get('/', async (req, res, next) => {
    try {
        res.send({ abc: 'abc' });
    } catch (error) {
        return { Error: `Something went wrong : ${error}` };
    }
});

router.post('/postProject', async (req, res, next) => {
    try {
        console.log(`Create Project payload request : ${JSON.stringify(req.body)}`);
        const payload = req.body;

        const result = await projectController.createProject(payload);
        res.json({ result });
    } catch (error) {
        return { Error: `Something went wrong : ${error}` };
    }
});

router.get('/getUserProject/:id', verifyToken, async (req, res, next) => {
    try {
        console.log(`Get User's Project payload request : ${JSON.stringify(req.params.id)}`);
        const userId = req.params.id;
        // const userId = req.decoded.userId;
        const result = await projectController.getUserProject(userId);
        res.status(200).json({ result });
    } catch (error) {
        return { Error: `Something went wrong : ${error}` };
    }
});

router.get('/getDatasets/:id', verifyToken, async (req, res, next) => {
    try {
        console.log(`Get User's Project payload request : ${JSON.stringify(req.params.id)}`);
        const userId = req.params.id;
        // const userId = req.decoded.userId;
        const result = await projectController.getUserDatasets(userId);
        res.json({ result });
    } catch (error) {
        return { Error: `Something went wrong : ${error}` };
    }
});

// router.post('/postProjectData', upload.single('file'), async (req, res, next) => {
//     try {
//         console.log(`Get User's Project Id payload request : ${JSON.stringify(req.body)}`);
//         const payload = req.body;
//         const userId = payload.userId;
//         const file = req.file;
//         const upload = `./uploads`;
//         const tempFilePath = `./uploads/${file.originalname}`;
//         if (!fs.existsSync(upload)) {
//             fs.mkdirSync(upload);
//         }

//         const unZips = `./unZips`;
//         if (!fs.existsSync(unZips)) {
//             fs.mkdirSync(unZips);
//         }
//         const distPath = `./unZips/${userId}`;
//         if (!fs.existsSync(distPath)) {
//             fs.mkdirSync(distPath);
//         }
//         const fileName = file.originalname;
//         await fs.promises.writeFile(tempFilePath, file.buffer);
//         // await commonController.unZipFile(tempFilePath, distPath, res);
//         extractionSuccess = commonController.unzipFolder(tempFilePath, distPath);
//         if (extractionSuccess) {
//             console.log('Extraction completed successfully!');
//             const unZipFileName = commonController.getFIleName(distPath);
//             const checkFolder = await commonController.checkSubfolders(`${distPath}/${unZipFileName}`, res, userId);
//         } else {
//             console.error('Error during extraction!');
//         }
//     } catch (error) {}
// });

router.post('/postDataset', upload.single('file'), projectController.postDataset);

router.post('/postTrainModel', projectController.postTrainModel);

router.get('/getResultFolder/:id', projectController.getResultFolder);

router.get('/getModelResults/:id', projectController.getModelResults);

router.get('/getResultsFiles/:id', projectController.getResultsFiles);

module.exports = router;

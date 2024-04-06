var express = require('express');
const projectController = require('../controllers/projectController');
var router = express.Router();
const fs = require('fs');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const { google } = require('googleapis');

router.get('/', async (req, res, next) => {
    try {
        res.send({"abc":"abc"})
    } catch (error) {
        return { Error: `Something went wrong : ${error}` };
    }
});



router.post('/postProject', async (req, res, next) => {
    try {
        console.log(`Create Project payload request : ${JSON.stringify(req.body)}`);
        const payload = req.body;
        // const userId = req.decoded.userId;
        // const userId = 'faiz123';
        const result = await projectController.createProject( payload);
        res.json({ result });
    } catch (error) {
        return { Error: `Something went wrong : ${error}` };
    }
});

router.get('/getUserProject/:id', async (req, res, next) => {
    try {
        console.log(`Get User's Project payload request : ${JSON.stringify(req.params.id)}`);
        const userId = req.params.id;
        // const userId = req.decoded.userId;
        const result = await projectController.getUserProject(userId);
        res.json({ result });
    } catch (error) {
        return { Error: `Something went wrong : ${error}` };
    }
});

router.post('/postProjectData', upload.single('file'), async (req, res, next) => {
    const payload = req.body;

    const file = req.file;
    const tempFilePath = `./uploads/${file.originalname}`;
    const fileName = file.originalname
    await fs.promises.writeFile(tempFilePath, file.buffer);
    const apikeys = require('../../apiKey.json');
    const SCOPE = ['https://www.googleapis.com/auth/drive'];
    async function authorize() {
        const jwtClient = new google.auth.JWT(apikeys.client_email, null, apikeys.private_key, SCOPE);

        await jwtClient.authorize();

        return jwtClient;
    }

    // A Function that will upload the desired file to google drive folder
    async function uploadFile(authClient) {
        return new Promise((resolve, reject) => {
            const drive = google.drive({ version: 'v3', auth: authClient });

            var fileMetaData = {
                name: file.originalname,
                parents: ['1cYxVrBUFiiq-PVUAUr4QAVEkTd2gbcFL'], // A folder ID to which file will get uploaded
            };

            drive.files.create(
                {
                    resource: fileMetaData,
                    media: {
                        body: fs.createReadStream(tempFilePath), // files that will get uploaded
                        mimeType: 'text/plain',
                    },
                    fields: 'id',
                },
                function (error, file) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(file);
                    }
                }
            );
        });
    }

    authorize()
        .then(uploadFile)
        .then(() => {
            projectController.uploadProjectData(payload,fileName)
            fs.unlink(tempFilePath, (error) => {
                if (error) {
                    console.error('Error deleting file:', error);
                } else {
                    console.log('File deleted successfully!');
                }
            });
            console.log("File Uploaded Successfully");
            res.status(200).json({ message: 'Data uploaded successfully' });
        })
        .catch((error) => {
            console.error('Error uploading file:', error);
            res.status(500).json({ message: 'Failed' });
        }); // function call
});

module.exports = router;

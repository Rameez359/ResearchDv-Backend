const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const fs = require('fs');
const unzipper = require('unzipper');
const AdmZip = require('adm-zip');

require('dotenv').config();

const projectController = require('./projectController');
const apikeys = require('../../apiKey.json');
const SCOPE = ['https://www.googleapis.com/auth/drive'];
const parentFolderId = process.env.DATASET_FOLDER_ID;
const secretKey = 'AiMultiModel';

const createTransporter = async () => {
    const oauth2Client = new OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.REFRESH_TOKEN,
    });

    const accessToken = await new Promise((resolve, reject) => {
        oauth2Client.getAccessToken((err, token) => {
            if (err) {
                console.log(`Error in client authentication: ${err}`);
                reject(err);
            }
            resolve(token);
        });
    });

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.EMAIL,
            accessToken,
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            refreshToken: process.env.REFRESH_TOKEN,
        },
    });

    return transporter;
};

const unZipFile1 = async (filePath, distPath, res) => {
    console.log('Files', filePath);
    let destPath;
    const zip = new AdmZip(filePath);

    zip.extractAllTo(distPath, true); // Extract all files, overwrite existing ones

    console.log('All files extracted successfully!');

    console.log('Folder unzipped successfully!');

    // let fileUnzipPromise = new Promise((resolve, reject) => {
    //     fs.createReadStream(filePath)
    //         .pipe(unzipper.Extract({ path: distPath }))
    //         .on('close', async () => {
    //             console.log('Files unzipped successfully!');
    //             const checkFolder = await checkSubfolders('./unZips/abc', res);
    //         });
    //     resolve();
    // });

    // fileUnzipPromise
    //     .then(() => {
    //         console.log('Completed!');
    //         return true;
    //     })
    //     .catch((error) => {
    //         console.log('Error::', error);
    //     });
};

const unzipFolder = (filePath, distPath, callback) => {
    console.log('In zip folder', filePath);
    const zip = new AdmZip(filePath);
    zip.extractAllTo(distPath, true, callback); // Extract all files with callback
    return true; // Indicate successful extraction
};
const uploadFile = async (authClient, file) => {
    return new Promise((resolve, reject) => {
        const drive = google.drive({ version: 'v3', auth: authClient });

        var fileMetaData = {
            name: file.originalname,
            parents: [parentFolderId], // A folder ID to which file will get uploaded
        };

        drive.files.create(
            {
                resource: fileMetaData,
                media: {
                    body: fs.createReadStream('./uploads/testFolder.zip'), // files that will get uploaded
                    mimeType: 'text/plain',
                },
                fields: 'id',
            },
            async function (error, file) {
                if (error) {
                    reject(error);
                } else {
                    await projectController.uploadProjectData(payload, fileName);
                    console.log('File Uploaded Successfully');
                    resolve(file);
                }
            }
        );
    });
};

const authorize = async () => {
    console.log('Started Authorization');
    const jwtClient = new google.auth.JWT(apikeys.client_email, null, apikeys.private_key, SCOPE);

    await jwtClient.authorize();

    return jwtClient;
};

const checkSubfolders = async (folderPath, res, userId) => {
    try {
        console.log('folderPath is', folderPath);
        fs.promises
            .readdir(folderPath)
            .then(async (subfolders) => {
                const hasTest = subfolders.includes('test');
                const hasTrain = subfolders.includes('train');
                const hasValid = subfolders.includes('valid');

                if (hasTest && hasTrain && hasValid) {
                    console.log('Folder contains subfolders: test, train, and valid');
                    await UploadFolderData(folderPath, userId, res);
                    // res.status(200).json({ message: 'File have required folders' });
                } else {
                    console.log('Missing required subfolders.');
                    return returnResponse(res, 400, `Uploaded file didn't have required folders`);
                    return false;
                }
            })
            .catch((error) => {
                console.error('Error checking subfolders:', error);
            });
    } catch (error) {
        console.error('Error checking subfolders:', error);
    }
};

const UploadFolderData = async (folderPath, userId, res) => {
    let mainFolderId;
    let validationId;
    let trainId;
    let testId;
    const mainFolderName = generateUniqueName(secretKey);
    console.log('Unique Name:', mainFolderName);
    let operation = 'parent';

    mainFolderId = await createFolder(parentFolderId, folderPath, mainFolderName, operation);
    await fs.promises
        .readdir(folderPath)
        .then(async (subfolders) => {
            console.log(subfolders);
            for (let i = 0; i < subfolders.length; i++) {
                operation = 'parent';
                const path = `${folderPath}/${subfolders[i]}`;
                console.log(`Creating Folder ${path} .....`);
                const classFolderId = await createFolder(mainFolderId, path, subfolders[i], operation);

                if (subfolders[i] == 'test') testId = classFolderId;
                if (subfolders[i] == 'train') trainId = classFolderId;
                if (subfolders[i] == 'valid') validationId = classFolderId;

                const classFolderPath = path;
                console.log(`After Creating Folder ${path} .....`);

                await createClassFolder(classFolderPath, classFolderId);
            }
        })
        .then(async () => {
            console.log(
                `mainFolderName: ${mainFolderName}, mainFolderId: ${mainFolderId}, validationId: ${validationId}, trainId : ${trainId}, testId : ${testId}`
            );
            const addDataset = await projectController.createDataset(
                mainFolderName,
                mainFolderId,
                validationId,
                trainId,
                testId,
                userId
            );
            return returnResponse(res, 200, `File Uploaded Successfully`,addDataset);
        })
        .catch((error) => {
            console.error('Error checking subfolders:', error);
            return returnResponse(res, 500, `Server Error : ${error}`,error);
        });
};

const createClassFolder = async (classFolderPath, classFolderId) => {
    fs.promises
        .readdir(classFolderPath)
        .then(async (classfolders) => {
            for (let j = 0; j < classfolders.length; j++) {
                operation = 'child';
                const classPath = `${classFolderPath}/${classfolders[j]}`;
                console.log('class path is', classPath);

                const folderId = await createFolder(classFolderId, classPath, classfolders[j], operation);
                console.log('Created Folder Id is ', folderId);
            }
        })
        .catch((error) => {
            console.error('Error checking subfolders:', error);
        });
};
const createFolder = async (folderId, folderPath = null, folderName, operation) => {
    try {
        console.log(folderPath);

        const authClient = await authorize();
        const drive = google.drive({ version: 'v3', auth: authClient });

        console.log('Folder Name', folderName);
        const folderMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [`${folderId}`], // A folder ID to which file will get uploaded
        };

        const res = await drive.files.create({
            resource: folderMetadata,
            fields: 'id',
        });

        console.log('Folder ID:', res.data.id);
        const newFolderId = res.data.id;
        if (operation === 'child') await uploadSubfolderData(folderPath, newFolderId);
        return newFolderId;
    } catch (err) {
        console.error('Error creating folder:', err.message);
    }
};

const uploadSubfolderData = async (subFolderPath, parentFolderId) => {
    fs.promises
        .readdir(subFolderPath)
        .then(async (subfiles) => {
            console.log(subfiles);
            for (let i = 0; i < subfiles.length; i++) {
                const folderId = await uploadImageToDrive(parentFolderId, subFolderPath, subfiles[i]);
            }
        })
        .catch((error) => {
            console.error('Error checking subfolders:', error);
        });
};

// Function to upload an image file to Google Drive
const uploadImageToDrive = async (folderId, folderPath, folderName) => {
    try {
        const imagePath = `${folderPath}/${folderName}`;
        console.log(imagePath);

        const authClient = await authorize();
        const drive = google.drive({ version: 'v3', auth: authClient });

        const fileMetadata = {
            name: imagePath.split('/').pop(), // Extracting the file name from the path
            parents: [folderId], // Specify the ID of the folder where you want to upload the image
        };

        const media = {
            mimeType: 'image/jpeg', // Change the MIME type if needed
            body: fs.createReadStream(imagePath),
        };

        const res = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });

        console.log('Image uploaded with ID:', res.data.id);
    } catch (err) {
        console.error('Error uploading image:', err.message);
    }
};

const generateUniqueName = (secretKey) => {
    const timestamp = Date.now().toString();
    const data = secretKey + timestamp;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    const uniqueName = hash.substring(0, 10); // Adjust the length of the unique name as needed
    return uniqueName;
};

const sendMail = async (mailOption) => {
    let emailTransporter = await createTransporter();
    await emailTransporter.sendMail(mailOption);
};
const generateCode = () => {
    const min = 1000000; // Minimum 7-digit number
    const max = 9999999; // Maximum 7-digit number
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
const returnRes = (data, reqStatus = 'TRUE', statusCode, res, msg = null) => {
    res.status(statusCode).json({
        response: data,
        requestStatus: reqStatus,
        statusCode: statusCode,
    });
};

const getFIleName = (distPath) => {
    try {
        const files = fs.readdirSync(distPath);
        console.log('Unzipped file names:');
        const unZipFileName = files[0];
        return unZipFileName;
    } catch (err) {
        console.error(err);
    }
};
const createFolder1 = async (folderId, folderPath = null, folderName, operation) => {
    try {
        console.log(folderPath);

        const authClient = await authorize();
        const drive = google.drive({ version: 'v3', auth: authClient });

        console.log('Folder Name', folderName);
        const folderMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [`${folderId}`], // A folder ID to which file will get uploaded
        };

        const res = await drive.files.create({
            resource: folderMetadata,
            fields: 'id',
        });

        console.log('Folder ID:', res.data.id);
        const newFolderId = res.data.id;
        if (operation === 'child') await uploadSubfolderData(folderPath, newFolderId);
        return newFolderId;
    } catch (err) {
        console.error('Error creating folder:', err.message);
    }
};

const returnResponse = (res, statusCode, msg, data = null) => {
    const response = {
        statusCode: statusCode,
        message: msg,
        data: data,
    };
    res.status(statusCode).json(response);
};
module.exports = {
    createClassFolder,
    unZipFile1,
    unzipFolder,
    unzipFolder,
    uploadFile,
    authorize,
    checkSubfolders,
    UploadFolderData,
    createClassFolder,
    createFolder,
    uploadSubfolderData,
    uploadImageToDrive,
    generateUniqueName,
    sendMail,
    generateCode,
    returnRes,
    getFIleName,
    createFolder1,
    returnResponse,
};

const crypto = require('crypto');
const AdmZip = require('adm-zip');
const fs = require('fs');
const common = require('./commonController');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
require('dotenv').config();

const apikeys = require('../../apiKey.json');
const SCOPE = ['https://www.googleapis.com/auth/drive'];
const parentFolderId = process.env.DATASET_FOLDER_ID;
const secretKey = process.env.SECRET_KEY;

exports.createFolder1 = async (folderId, folderName) => {
    try {
        const authClient = await exports.authorize();
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
        return newFolderId;
    } catch (err) {
        console.error('Error creating folder:', err.message);
    }
};
exports.unzipFolder = async (filePath, distPath, callback) => {
    console.log('In zip folder', filePath);
    const zip = new AdmZip(filePath);
    zip.extractAllTo(distPath, true, callback); // Extract all files with callback
    console.log('Extraction completed successfully!');

    return true; // Indicate successful extraction
};

exports.getFileName = async (distPath) => {
    try {
        const files = fs.readdirSync(distPath);
        console.log(`Unzipped file names: ${files[0]}`);
        const unZipFileName = files[0];
        return unZipFileName;
    } catch (err) {
        console.error(err);
    }
};

exports.checkSubfolders = async (folderPath) => {
    console.log('folderPath is', folderPath);
    try {
        const subfolders = fs.readdirSync(folderPath);
        const hasTest = subfolders.includes('test');
        const hasTrain = subfolders.includes('train');
        const hasValid = subfolders.includes('val') || subfolders.includes('valid');

        if (hasTest && hasTrain && hasValid) {
            console.log('Folder contains subfolders: test, train, and valid');
            return true;
        } else {
            console.log('Missing required subfolders.');
            return false;
        }
    } catch (error) {
        console.error('Error checking subfolders:', error);
        return false; // Indicate error for synchronous behavior
    }
};

exports.uploadFile = async (file, folderPath, fileName) => {
    console.log('In uploadFile');

    return new Promise(async (resolve, reject) => {
        const authClient = await exports.authorize();
        const drive = google.drive({ version: 'v3', auth: authClient });

        var fileMetaData = {
            name: fileName,
            parents: [parentFolderId], // A folder ID to which file will get uploaded
        };

        const response = drive.files.create(
            {
                resource: fileMetaData,
                media: {
                    body: fs.createReadStream(`${folderPath}`), // files that will get uploaded
                    mimeType: 'application/zip',
                },
                fields: 'id',
            },
            async function (error, response) {
                if (error) {
                    reject(error);
                } else {
                    // await projectController.uploadProjectData(payload, fileName);
                    console.log(`File Uploaded Successfully ${response.data.id}`);
                    resolve(response.data.id);
                }
            }
        );
    });
};

exports.listFiles = async (folderId) => {
    try {
        const resultFolders = [];
        const folders = await exports.readDriveData(folderId);
        if (folders.length) {
            console.log('Folders within the parent folder:');
            folders.forEach(async (folder) => {
                // const subFolders = await exports.readDriveData(folder.id);
                let datasetResults = [];
                // if (subFolders.length) {
                //     subFolders.forEach((subFolders) => {
                //         datasetResults = { id: subFolders.id, datasetName: subFolders.name };
                //     });
                // }
                console.log(`${folder.id} - ${folder.name} - ${folder.size}`);

                let result = {};
                if (datasetResults.length) result = { id: folder.id, name: folder.name, datasets: datasetResults };
                else result = { id: folder.id, name: folder.name, size: folder.size };
                resultFolders.push(result);
            });
        } else {
            console.log('No folders found in the parent folder.');
        }

        return resultFolders;
    } catch (err) {
        console.error('Error listing files:', err);
    }
};

exports.readDriveData = async (folderId) => {
    const authClient = await exports.authorize();
    const drive = google.drive({ version: 'v3', auth: authClient });

    const response = await drive.files.list({
        pageSize: 10, // Adjust page size as needed
        fields: 'nextPageToken, files(id, name, size, mimeType)',
        q: `'${folderId}' in parents`,
    });

    const folders = response.data.files.filter(
        (file) => file.mimeType === 'application/vnd.google-apps.folder' || 'application/vnd.google-apps.file'
    );
    return folders;
};

exports.fetchDriveFile = async (folderId) => {
    try {
        const authClient = await exports.authorize();
        const drive = google.drive({ version: 'v3', auth: authClient });
        const response = await drive.files.list({
            q: `'${folderId}' in parents`,
            fields: 'files(id, name, size)',
        });

        const files = response.data.files;

        const imagePromises = files.map(async (file) => {
            const response = await drive.files.get(
                {
                    fileId: file.id,
                    alt: 'media',
                },
                { responseType: 'stream' }
            );

            const chunks = [];
            for await (const chunk of response.data) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            const base64String = buffer.toString('base64');

            console.log('Base64 String:', base64String.substring(0, 30)); // Log the first 30 characters

            return {
                name: file.name,
                size: file.size ? `${file.size} bytes` : 'Unknown size',
                data: base64String,
            };
        });

        // Wait for all image fetches to complete
        const images = await Promise.all(imagePromises);

        return images;
    } catch (error) {
        console.error('Error fetching images from folder:', error);
        throw error;
    }
};
exports.authorize = async () => {
    console.log('Started Authorization');
    const jwtClient = new google.auth.JWT(apikeys.client_email, null, apikeys.private_key, SCOPE);

    await jwtClient.authorize();

    return jwtClient;
};

exports.returnResponse = (res, statusCode, msg, data = null) => {
    const response = {
        statusCode: statusCode,
        message: msg,
        data: data,
    };
    res.status(statusCode).json(response);
};

exports.generateUniqueName = () => {
    const timestamp = Date.now().toString();
    const data = secretKey + timestamp;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    const uniqueName = hash.substring(0, 7); // Adjust the length of the unique name as needed
    return uniqueName;
};

exports.deleteFolder = async (folderPath) => {
    try {
        const files = fs.readdirSync(folderPath);
        for (const file of files) {
            const filePath = `${folderPath}/${file}`;
            if (fs.lstatSync(filePath).isDirectory()) {
                exports.deleteFolder(filePath); // Recursive call for subdirectories
            } else {
                fs.unlinkSync(filePath); // Delete files
            }
        }
        fs.rmdirSync(folderPath);
        console.log(`Folder deleted: ${folderPath}`);
    } catch (err) {
        console.error(`Error deleting folder: ${err.message}`);
    }
};

var express = require('express');
var router = express.Router();
const multer = require('multer');
const userController = require('../controllers/userController');
const verifyToken = require('../controllers/verifyToken');
const { ObjectId } = require('mongodb');
const bodyParser = require('body-parser');
const storage = multer.memoryStorage();
const upload = multer({ storage });
router.use(bodyParser.json());
// router.use(verifyToken);

/* GET users listing. */
router.get('/', userController.getAllUsers);

/* Create new user. */
router.post('/create', upload.single('image'), userController.createNewUser);

/* Update user by Id */
router.put('/update/:id', userController.updateUserById);

/* Delete user by Id */
router.delete('/delete/:id', userController.deleteUserById);

module.exports = router;

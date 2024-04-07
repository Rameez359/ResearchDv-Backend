const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const database = require('../../private/database/connectDb');
const { returnRes, sendMail, generateCode } = require('./commonController');
const { ObjectId } = require('mongodb');
require('dotenv').config();

const db = database.getDbClient();

const secret_key = process.env.SECRET_KEY;
const clientID = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const callbackURL = process.env.CALLBACK_URL;

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized request' });
    }

    jwt.verify(token, secret_key, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.decoded = decoded;
        next();
    });
};

const localSignupStepOne = async (req, res, next) => {
    console.log(`Local SignUp body start with request : [${JSON.stringify(req.body)}]`);

    const { name, email, dateOfBirth } = req.body;
    if (!(name && email && dateOfBirth)) returnRes('Incomplete Information', 'FALSE', 400, res);

    const newUser = req.body;
    const date = new Date();
    newUser.createdAt = date;
    newUser.updatedAt = date;

    const verificationCode = generateCode();
    newUser.verificationCode = verificationCode;
    const userResp = await db.collection('NewUsers').insertOne(req.body);
    console.log(`New Temporary User Request Ended with Response: [${JSON.stringify(userResp)}`);
    const data = {
        msg: 'User Created',
        userId: userResp.insertedId,
    };
    if (userResp) {
        returnRes(data, 'TRUE', 201, res);
    } else returnRes('Something went wrong in inserting user', 'FALSE', 400, res);
};

const localSignupStepTwo = async (req, res, next) => {
    console.log(`Verify Account body start with request : [${JSON.stringify(req.body)}]`);

    const { userId, code } = req.body;
    const user = await db.collection('NewUsers').findOne({ _id: new ObjectId(userId) });
    if (!user) returnRes('User not found', 'FALSE', 400, res);

    if (user.verificationCode === parseInt(code)) {
        await db
            .collection('NewUsers')
            .findOneAndUpdate({ _id: userId }, { $set: { status: 'APPROVED' } }, { returnNewDocument: 'true' });
        returnRes('User has been verified successfully', 'TRUE', 200, res);
    } else returnRes('Invalid Verification Code', 'FALSE', 400, res);
};

const localSignupStepThree = async (req, res, next) => {
    console.log(`Create username start with request : [${JSON.stringify(req.body)}]`);

    const { username, password, userId } = req.body;
    console.log(`UserID is: ${userId}`);
    if (!(username && userId)) returnRes('Please send all required params', 'FALSE', 400, res);

    const userData = await db.collection('NewUsers').findOne({ _id: new ObjectId(userId) });
    console.log(`User Data Ended with Response: [${JSON.stringify(userData)}`);
    if (!userData) returnRes('User not found', 'FALSE', 400, res);

    const encryptPassword = CryptoJS.AES.encrypt(password, secret_key).toString();
    const newUser = {
        name: userData.name,
        username: username,
        email: userData.email,
        dateOfBirth: userData.dateOfBirth,
        password: encryptPassword,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
    };

    const userResp = await db.collection('users').insertOne(newUser);
    await db.collection('NewUsers').deleteOne({ _id: new ObjectId(userId) });

    if (userResp.insertedId) returnRes('User has been created successfully', 'TRUE', 201, res);
};

const checkDuplicateUsername = async (req, res, next) => {
    console.log(`Verify username start with request : [${JSON.stringify(req.body)}]`);
    const { username } = req.body;
    if (!username) returnRes('Please send all required params', 'FALSE', 400, res);

    const checkUsername = await db.collection('users').findOne({ username: username });
    if (checkUsername) returnRes('Username already found', 'FALSE', 200, res);
    else returnRes('No username found', 'TRUE', 200, res);
};

const checkDuplicateAccount = async (req, res, next) => {
    console.log(`Check duplicate start with request : [${JSON.stringify(req.query)}]`);
    const { email } = req.query;
    if (!email) returnRes('Please send all required params', 'FALSE', 400, res);

    const checkAccount = await db.collection('users').findOne({ email: email });
    if (checkAccount) returnRes('Account already found', 'FALSE', 200, res);
    else returnRes('No account found', 'TRUE', 200, res);
};

const localSignIn = async (req, res, next) => {
    console.log(`Local SignIn start with request : [${JSON.stringify(req.body)}]`);
    const { username_mail, password } = req.body;
    if (!(username_mail && password)) returnRes('Please send all required params', 'FALSE', 400, res);

    const verifyUser = await db
        .collection('users')
        .findOne({ $or: [{ username: username_mail }, { email: username_mail }] });
    if (!verifyUser) return returnRes('Account not found', 'FALSE', 404, res);

    const decryptPassword = CryptoJS.AES.decrypt(verifyUser.password, secret_key).toString(CryptoJS.enc.Utf8);
    if (password !== decryptPassword) return returnRes('Incorrect Password', 'FALSE', 401, res);

    //create JWT token
    const token = jwt.sign({ userId: verifyUser._id, userName: verifyUser.userName }, secret_key, {
        expiresIn: '24h',
    });

    const mailOptions = {
        from: 'alirameez359@gmail.com',
        to: verifyUser.email,
        subject: 'SIGN -IN',
        text: `Your account is recently signed in. If you not signed in then please update your password.`,
    };
    // const sendmail = sendMail(mailOptions);

    const data = {
        msg: 'User has been signed successfully',
        userId: verifyUser._id,
        username: verifyUser.username,
        token: token,
    };
    console.log(`User SignIn Response : ${JSON.stringify(data)}`);
    return returnRes(data, 'TRUE', 200, res);
};
module.exports = {
    verifyToken,
    localSignupStepOne,
    localSignupStepTwo,
    localSignupStepThree,
    checkDuplicateUsername,
    checkDuplicateAccount,
    localSignIn,
};

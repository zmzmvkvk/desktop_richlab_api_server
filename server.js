require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const http = require('http');
const WebSocket = require('ws');
const db = require('./db'); // db.js 파일을 통해 MongoDB 연결
const User = require('./models/user');

const app = express();
const PORT = process.env.PORT || 4000;
const SECRET_KEY = process.env.JWT_SECRET;

app.use(cors());
app.use(bodyParser.json());

db.once('open', function () {
    const userCollection = db.collection('user');
    const changeStream = userCollection.watch();

    changeStream.on('change', (change) => {
        console.log('Change detected:', change);
        // 변경 사항이 발생하면 모든 클라이언트에 알림
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(change));
            }
        });
    });
});

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.post('/login', async (req, res) => {
    const { userid, userpw } = req.body;
    try {
        const user = await User.findOne({ userid, userpw });
        if (user) {
            const token = jwt.sign({ userid: user.userid, username: user.username, brandname: user.brandname, mobile: user.mobile }, SECRET_KEY, { expiresIn: '5h' });
            res.json({ success: true, token, username : user.username, brandname: user.brandname, mobile: user.mobile});
        } else {
            res.json({ success: false });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.get('/verify-token', (req, res) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).send({ success: false, message: 'No token provided.' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(500).send({ success: false, message: 'Failed to authenticate token.' });
        }

        res.status(200).send({ success: true, username: decoded.username });
    });
});

app.get('/user-info', async (req, res) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).send({ success: false, message: 'No token provided.' });
    }

    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
        if (err) {
            return res.status(500).send({ success: false, message: 'Failed to authenticate token.' });
        }

        try {
            const user = await User.findOne({ userid: decoded.userid });

            if (!user) {
                return res.status(404).send({ success: false, message: 'User not found.' });
            }

            res.status(200).send({ success: true, user });
        } catch (err) {
            res.status(500).send({ success: false, message: 'Failed to fetch user info.' });
        }
    });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('message', (message) => {
        console.log('Received message from client:', message);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});


server.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
});

// 전역 에러 핸들러 추가
process.on('uncaughtException', (err) => {
    console.error('There was an uncaught error', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

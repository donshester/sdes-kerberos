import {usersDb, serverDb, SSDb, KTGS_SS, TICKET_DURATION} from "../storage/index.js";
import {BufferCrypt} from "../../shared/cipher/models/buffer_crypt.js";
import express from "express";
import crypto from 'crypto';
import {checkTimestamp} from "../../shared/utils.js";


const router = express.Router()


router.get('/', (req, res) => {
    res.send('KDC Server');
});

router.post('/authenticate', (req, res) => {
    console.log('\n--- Authentication Request Received ---\n');

    const { userId } = req.body;
    console.log('\n--- User ID ---\n', userId);

    console.log('\n--- Users Database ---\n', usersDb);
    if (usersDb[userId]) {
        const KC_TGS = crypto.randomBytes(16).toString('hex');
        console.log('\n--- Generated KC_TGS ---\n', KC_TGS);

        const { id, KAS_TGS } = serverDb['server1'];
        console.log('\n--- Server ID and KAS_TGS ---\n', id, KAS_TGS);

        const timestamp = Date.now();
        console.log('\n--- Timestamp Generated ---\n', timestamp);

        const TGTString = `${userId}:${id}:${timestamp}:${TICKET_DURATION}:${KC_TGS}`;
        console.log('\n--- TGT before first encryption ---\n', TGTString);

        const encryptedTGT = BufferCrypt.sdesEncrypt(KAS_TGS, Buffer.from(TGTString, 'utf8'));
        console.log('\n--- Encrypted TGT ---\n', encryptedTGT.toString('base64'));

        console.log('\n--- KC_TGS before encryption ---\n', KC_TGS);

        const encryptedKC_TGS = BufferCrypt.sdesEncrypt(usersDb[userId].KC, Buffer.from(KC_TGS, 'utf8'));
        console.log('\n--- Encrypted KC_TGS ---\n', encryptedKC_TGS.toString('base64'));

        const doubleEncryptedTGT = BufferCrypt.sdesEncrypt(usersDb[userId].KC, encryptedTGT);
        console.log('\n--- Double Encrypted TGT ---\n', doubleEncryptedTGT.toString('base64'));

        res.json({
            encryptedKC_TGS: encryptedKC_TGS.toString('base64'),
            encryptedTGT: doubleEncryptedTGT.toString('base64'),
        });

        console.log('\n--- Authentication Processed Successfully ---\n');
    } else {
        console.log('\n--- Authentication Failed ---\n');
        res.status(401).send('Authentication failed');
    }
});
router.post('/tgs-request', (req, res) => {
    console.log('\n--- TGS Request Received ---\n');

    const { encryptedTGT, encryptedAut1, serviceId } = req.body;
    const { id, KAS_TGS} = serverDb['server1'];
    console.log('\n--- Server ID and KAS_TGS ---\n', id, KAS_TGS);

    const tgt = BufferCrypt.sdesDecrypt(KAS_TGS, Buffer.from(encryptedTGT, 'base64'));
    const TGTString = tgt.toString('utf8');
    console.log('\n--- Decrypted TGT String ---\n', TGTString);

    const [userId, serverId, timestamp, duration, KC_TGS] = TGTString.split(':');

    const aut1 = BufferCrypt.sdesDecrypt(KC_TGS, Buffer.from(encryptedAut1, 'base64'));
    const aut1String = aut1.toString('utf8');
    console.log('\n--- Decrypted Aut1 String ---\n', aut1String);

    const [autUserId, autTimestamp] = aut1String.split(':');

    if (userId !== autUserId || !checkTimestamp(parseInt(timestamp), parseInt(autTimestamp)) || serverId !== id) {
        console.log('\n--- Authentication Failed ---\n');
        return res.status(401).send('Authentication failed');
    }

    const KC_SS = crypto.randomBytes(16).toString('hex');
    console.log('\n--- Generated KC_SS ---\n', KC_SS);

    const serviceTicket = `${userId}:${serviceId}:${Date.now()}:${TICKET_DURATION}:${KC_SS}`;
    console.log('\n--- Service Ticket ---\n', serviceTicket);

    const encryptedServiceTicket = BufferCrypt.sdesEncrypt(KTGS_SS, Buffer.from(serviceTicket, 'utf8'));
    console.log('\n--- Encrypted Service Ticket ---\n', encryptedServiceTicket.toString('base64'));

    const encryptedKC_SS = BufferCrypt.sdesEncrypt(KC_TGS, Buffer.from(KC_SS, 'utf8'));
    console.log('\n--- Encrypted KC_SS ---\n', encryptedKC_SS.toString('base64'));

    const doubleEncryptedTicket = BufferCrypt.sdesEncrypt(KC_TGS, encryptedServiceTicket);
    console.log('\n--- Double Encrypted Ticket ---\n', doubleEncryptedTicket.toString('base64'));

    if (!SSDb[serviceId]) {
        SSDb[serviceId] = [];
    }
    SSDb[serviceId].push({ userId, KC_SS });

    res.json({
        encryptedServiceTicket: doubleEncryptedTicket.toString('base64'),
        encryptedKC_SS: encryptedKC_SS.toString('base64')
    });

    console.log('\n--- TGS Request Processed Successfully ---\n');
});


export default router;
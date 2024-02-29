import express from "express";
import {BufferCrypt} from "../../shared/cipher/models/buffer_crypt.js";
import {KTGS_SS, SSDb} from "../storage/index.js";
import {checkTimestamp} from "../../shared/utils.js";

const router = express.Router()


router.get('/', (req, res) => {
    res.send(   'SS Server');
});
router.post('/service-request', (req, res) => {
    console.log('\n--- Service Request Received ---\n');

    const { encryptedTGS, encryptedAut2 } = req.body;
    console.log('\n--- Encrypted TGS ---\n', encryptedTGS);
    console.log('\n--- Encrypted Aut2 ---\n', encryptedAut2);

    const decryptedTGS = BufferCrypt.sdesDecrypt(KTGS_SS, Buffer.from(encryptedTGS, 'base64'));
    const decryptedTGSString = decryptedTGS.toString('utf8');
    console.log('\n--- Decrypted TGS String ---\n', decryptedTGSString);

    const [userId, serviceId, timestamp, duration, KC_SS] = decryptedTGSString.split(':');
    console.log('\n--- KC_SS ---\n', KC_SS);
    const decryptedAut2 = BufferCrypt.sdesDecrypt(KC_SS, Buffer.from(encryptedAut2, 'base64'));
    const aut2String = decryptedAut2.toString('utf8');
    console.log('\n--- Decrypted Aut2 String ---\n', aut2String);

    const [autUserId, autTimestamp] = aut2String.split(':');

    if (!(serviceId in SSDb) || userId !== autUserId || !checkTimestamp(parseInt(autTimestamp), parseInt(timestamp))) {
        console.log('\n--- Authentication Failed ---\n');
        return res.status(401).send('Authentication failed');
    }

    const date = new Date(parseInt(autTimestamp));
    console.log('\n--- Date Generated ---\n', date);

    const responseTimestamp = (parseInt(autTimestamp, 10) + 1).toString();
    console.log('\n--- Response Timestamp Generated ---\n', responseTimestamp);

    const encryptedResponse = BufferCrypt.sdesEncrypt(KC_SS, Buffer.from(responseTimestamp, 'utf8'));
    console.log('\n--- Encrypted Response ---\n', encryptedResponse.toString('base64'));

    res.json({
        encryptedResponse: encryptedResponse.toString('base64'),
    });

    console.log('\n--- Service Request Processed Successfully ---\n');
});
export default router;
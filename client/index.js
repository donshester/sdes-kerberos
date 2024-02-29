import axios from "axios";
import {USER_NAME, UserKC} from "../shared/user-info.js";
import {BufferCrypt} from "../shared/cipher/models/buffer_crypt.js";


const KDS_server = axios.create({
    baseURL: 'http://localhost:3000'
});

const SS_server = axios.create({
    baseURL: 'http://localhost:4000'
});


const authenticateAndProcess = async () => {
    try {
        const authenticateResponse = await KDS_server.post('/authenticate', {
            userId: USER_NAME,
        });

        const { encryptedKC_TGS, encryptedTGT } = authenticateResponse.data;
        const raw_enc_KC_TGS = Buffer.from(encryptedKC_TGS, 'base64');
        const raw_enc_TGT = Buffer.from(encryptedTGT, 'base64');
        let dec_KC_TGS = BufferCrypt.sdesDecrypt(UserKC, raw_enc_KC_TGS);
        let dec_TGT = BufferCrypt.sdesDecrypt(UserKC, raw_enc_TGT);
        console.log('\n--- Decrypted KC_TGS ---\n', dec_KC_TGS.toString('utf8'));
        console.log('\n--- Decrypted TGT ---\n', dec_TGT.toString('base64'));

        const timestamp1 = Date.now();

        const aut1 = `${USER_NAME}:${timestamp1}`;
        console.log('\n--- Aut1 Generated ---\n', aut1);

        const enc_aut1 = BufferCrypt.sdesEncrypt(dec_KC_TGS.toString('utf8'), Buffer.from(aut1, 'utf8'));
        console.log('\n--- Encrypted Aut1 ---\n', enc_aut1.toString('base64'));

        const enc_aut1_based = enc_aut1.toString('base64');

        const tgsResponse = await KDS_server.post('/tgs-request', {
            encryptedTGT: dec_TGT.toString('base64'), encryptedAut1: enc_aut1_based, serviceId: 'SS1',
        });

        const {encryptedServiceTicket, encryptedKC_SS} = tgsResponse.data;
        let raw_enc_KC_SS = Buffer.from(encryptedKC_SS, 'base64');
        let raw_enc_Ticket = Buffer.from(encryptedServiceTicket, 'base64');

        let dec_KC_SS = BufferCrypt.sdesDecrypt(dec_KC_TGS.toString('utf8'), raw_enc_KC_SS);
        let dec_Ticket = BufferCrypt.sdesDecrypt(dec_KC_TGS.toString('utf8'), raw_enc_Ticket);
        console.log('\n--- Decrypted KC_SS ---\n', dec_KC_SS.toString('utf8'));
        console.log('\n--- Decrypted Ticket after first decryption---\n', dec_Ticket.toString('base64'));


        const timestamp2 = Date.now();

        const aut2 = `${USER_NAME}:${timestamp2}`;
        console.log('\n--- Aut2 Generated ---\n', aut2);
        const encryptedAut2 = BufferCrypt.sdesEncrypt(dec_KC_SS.toString('utf8'), Buffer.from(aut2, 'utf8'));
        console.log('\n--- Encrypted Aut2 ---\n', encryptedAut2.toString('base64'));

        const ssResponse = await SS_server.post('/service-request', {
            encryptedTGS: dec_Ticket.toString('base64'), encryptedAut2: encryptedAut2.toString('base64'),
        })
        const {encryptedResponse} = ssResponse.data;
        let raw_enc_ssResponse = Buffer.from(encryptedResponse, 'base64');
        const responseString = BufferCrypt.sdesDecrypt(dec_KC_SS.toString('utf8'), raw_enc_ssResponse).toString('utf8');
        console.log('\n--- Decrypted Response String ---\n', responseString);
    } catch (error) {
        console.log('\n--- Error Occurred ---\n');
        console.log(error);
    }
};

authenticateAndProcess();
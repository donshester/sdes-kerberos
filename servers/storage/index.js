import {USER_NAME, UserKC} from "../../shared/user-info.js";

export const TICKET_DURATION= 60000
export const usersDb = {
    [USER_NAME]: {KC: UserKC}
};
export const serverDb = {
    'server1': { id:'serverId1', KAS_TGS: 'secret_KAS_TGS' },
};


export const SSDb = {
    'SS1': [],
};

export const KTGS_SS = 'secret_tgs_ss';
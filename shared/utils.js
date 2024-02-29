import {TICKET_DURATION} from "../servers/storage/index.js";

export function checkTimestamp(userTimestamp, timestamp) {
    const timeDifference = timestamp - userTimestamp;
    return timeDifference <= TICKET_DURATION;
}
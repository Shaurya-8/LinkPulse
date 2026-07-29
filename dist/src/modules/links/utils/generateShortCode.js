import { randomInt } from "crypto";
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
export function generateShortCode(minLength = 6, maxLength = 8) {
    const length = randomInt(minLength, maxLength + 1);
    let code = "";
    for (let i = 0; i < length; i++) {
        code += ALPHABET[randomInt(ALPHABET.length)];
    }
    return code;
}
//# sourceMappingURL=generateShortCode.js.map
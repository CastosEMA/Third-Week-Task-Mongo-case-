import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pathToKey = path.join(__dirname, '../KeyPair', 'id_rsa_priv.pem');
const PRIV_KEY = fs.readFileSync(pathToKey, 'utf8');


function validPassword(password: string, hash: any, salt: any): boolean {
    const hashVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === hashVerify;
}

function genPassword(password: string) {
    const salt = crypto.randomBytes(32).toString('hex');
    const genHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    
    return {
      salt: salt,
      hash: genHash
    };
}

function issueJWT(user:any){
    const _id = user._id;
  
    const expiresIn = '60s';
  
    const payload = {
      sub: _id,
      iat: Date.now()
    };
  
    const signedToken = jwt.sign(payload, PRIV_KEY, { expiresIn: expiresIn, algorithm: 'RS256' });
  
    return {
      token: "Bearer " + signedToken,
      expires: expiresIn
    };
}

function issueRefresh(user:any){
    const _id = user._id;

    const expiresIn = '30d';


    const payload = {
        sub: _id,
        iat: Date.now()
    };

    const signedRefreshToken = jwt.sign(payload, PRIV_KEY, { expiresIn: expiresIn, algorithm: 'RS256' });

    return {
        token: "Bearer " + signedRefreshToken,
        expires: expiresIn
    };
}

export { validPassword, genPassword, issueJWT, issueRefresh };
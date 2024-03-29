import { Router, Request, Response, NextFunction } from 'express';
import mongoose, {disconnect, Schema} from 'mongoose';
import passport from 'passport';
import jsonwebtoken, {JwtPayload} from 'jsonwebtoken';
import User from '../database_operations/userSchema.js';
import * as utils from '../lib/utils.js';
import {issueRefresh} from "../lib/utils.js";

const router = Router();

async function verifyToken (req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.jwtToken?.token;

    if(token){
        const [ , accessToken] = token.split(' ');
        const decodedToken: JwtPayload | null= jsonwebtoken.decode(accessToken, {complete: true});
        const sub = decodedToken?.payload.sub;

        const neededUser = await User.findOne({_id: sub});
        if(neededUser){
            next();
        }else{
            console.log('No such user')
        }
    }else if(req.user){
        next();
    }else{
        return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
    }
};

router.get('/login', (req, res) => {
    res.render('login');
});



router.post('/login', async (req, res, next) => {
    try {
        const user = await User.findOne({username: req.body.username});

        if(!user) {
            return res.status(401).json({success: false, msg: "Could not find user"});
        }
        
        const isValid = utils.validPassword(req.body.password, user.hash, user.salt);

        if(isValid){
            const tokenObject = utils.issueJWT(user);
            const refreshObject = utils.issueRefresh(user);
            res.cookie('jwtToken', tokenObject, { maxAge: 60 * 1000, httpOnly: true, secure: true });
            res.cookie('refreshToken', refreshObject, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true, secure: true });
            res.status(200).redirect("/add-holiday");
        } else {
            console.log("Password entered incorrectly!");
            return res.status(401).json({success: false, msg: "You entered the wrong password"});
        }
    } catch (err) {
        return next(err);

    }
});

router.post('/refresh-jwt', async (req, res, next) => {
try{
    const token = req.cookies?.jwtToken?.token;
    const refreshToken = req.cookies?.refreshToken?.token;
    const [ , accessToken] = token.split(' ');

    const decodedToken: JwtPayload | null= jsonwebtoken.decode(accessToken, {complete: true});

    const sub = decodedToken?.payload.sub;
    const neededUser  = await User.findOne({_id: sub});
    console.log(neededUser)
    if(refreshToken){
        const tokenObject = utils.issueJWT(neededUser);
        res.cookie('jwtToken', tokenObject, { maxAge: 60 * 1000, httpOnly: true, secure: true });
        res.redirect('/add-holiday');
    }
}catch (err){return next(err)}

});

router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/register', (req, res, next) => {
    const saltHash = utils.genPassword(req.body.password);

    const salt = saltHash.salt;
    const hash = saltHash.hash;
    
    const newUser = new User({
        username: req.body.username,
        hash: hash,
        salt: salt,
    });

    newUser.save()
    .then((user) => {
        const jwt = utils.issueJWT(user);
        //const refresh = utils.issueRefresh(user);
        res.status(200).redirect("/login");
    })
    .catch(err => next(err));
});

router.post('/logout', (req, res, next) => {
    res.clearCookie('jwtToken');
    res.redirect('/login');
});

export {
    router,
    verifyToken,
}
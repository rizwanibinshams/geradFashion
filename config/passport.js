const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const User = require('../models/userSchema')
require('dotenv').config()

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  "https://geradfashion.shop/auth/google/callback" ||"/auth/google/callback" ,
    passReqToCallback: true
}, 
async (req, accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value

        if (!email) {
            return done(new Error('No email found from Google profile'), null)
        }

        let user = await User.findOne({ email })
     
        if (!user) {
            user = await User.create({
                name: profile.displayName,
                email: email,
                googleId: profile.id,
                // Add any other required fields with default values
            })
        }

        // Update last login timestamp
        user.lastLogin = new Date()
        await user.save()

        return done(null, user)
    } catch (error) {
        return done(error, null)
    }
}))

passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id)
        if (!user) {
            return done(null, false)
        }
        done(null, user)
    } catch (err) {
        done(err, null)
    }
})

module.exports = passport;

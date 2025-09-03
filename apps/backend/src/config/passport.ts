import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { env } from './env';
import { AuthService } from '../services/authService';
import logger from './logger';

const authService = new AuthService();

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_REDIRECT_URI,
        scope: ['profile', 'email'],
      },
      async (accessToken: string, refreshToken: string, profile: Profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          
          if (!email) {
            return done(new Error('No email found in Google profile'), null);
          }

          const authResponse = await authService.createGoogleUser({
            googleId: profile.id,
            email: email,
            name: profile.displayName,
          });

          return done(null, authResponse);
        } catch (error) {
          logger.error('Google OAuth error:', error);
          return done(error, null);
        }
      }
    )
  );
} else {
  logger.warn('Google OAuth not configured - missing environment variables');
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;
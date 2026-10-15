import crypto from "crypto";
import Customer from "../models/customer.model.js";
import generateToken, { cookieOptions } from "../utils/generateToken.js";

// "Continue with Google" - OAuth 2.0 authorization code flow with PKCE.
// The browser only ever sees Google's consent screen and, at the end, our usual
// HttpOnly session cookie. Google's tokens stay on the server.

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

const STATE_COOKIE = "shopkart_oauth";
const STATE_MAX_AGE = 10 * 60 * 1000; // the sign-in has to finish within 10 minutes

const isGoogleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const base64url = (buffer) => buffer.toString("base64url");

// Public URL of the site, e.g. https://shopkart-sooty.vercel.app or http://localhost:5180.
// APP_URL wins; otherwise it comes from the request (behind Vercel or the Vite proxy).
const appUrl = (req) => (process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");

const redirectUri = (req) => `${appUrl(req)}/api/auth/google/callback`;

// Only same-site paths are allowed as the "where to go next" target
const safeNext = (value) =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/api") ? value : "";

const stateCookieOptions = () => ({ ...cookieOptions(), path: "/api/auth", maxAge: STATE_MAX_AGE });

const fail = (req, res, code) => {
  res.clearCookie(STATE_COOKIE, { ...cookieOptions(), path: "/api/auth" });
  res.redirect(`${appUrl(req)}/login?oauth_error=${code}`);
};

// GET /auth/providers - lets the frontend show the Google button only when it is set up
export const getProviders = (req, res) => {
  res.json({ success: true, google: isGoogleConfigured() });
};

// GET /auth/google?next=/checkout  - sends the browser to Google's consent screen
export const startGoogleLogin = (req, res) => {
  if (!isGoogleConfigured()) return fail(req, res, "not_configured");

  const state = base64url(crypto.randomBytes(24));
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());

  res.cookie(STATE_COOKIE, JSON.stringify({ state, verifier, next: safeNext(req.query.next) }), stateCookieOptions());

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });

  res.redirect(`${GOOGLE_AUTH_URL}?${params}`);
};

const sameValue = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

// GET /auth/google/callback?code=&state=  - Google sends the browser back here
export const googleCallback = async (req, res) => {
  if (!isGoogleConfigured()) return fail(req, res, "not_configured");
  if (req.query.error) return fail(req, res, "cancelled"); // e.g. the user pressed Cancel

  let saved;
  try {
    saved = JSON.parse(req.cookies?.[STATE_COOKIE] || "");
  } catch {
    return fail(req, res, "expired");
  }

  // The state must match what we issued, otherwise this request didn't start here
  const { code, state } = req.query;
  if (!code || !state || !saved?.state || !sameValue(saved.state, state)) {
    return fail(req, res, "invalid_state");
  }

  res.clearCookie(STATE_COOKIE, { ...cookieOptions(), path: "/api/auth" });

  // 1. Swap the one-time code for tokens (server to server, with our client secret)
  let tokens;
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri(req),
        grant_type: "authorization_code",
        code_verifier: saved.verifier,
      }),
    });
    tokens = await response.json();
    if (!response.ok || !tokens.access_token) throw new Error(tokens.error_description || tokens.error || "token exchange failed");
  } catch (error) {
    console.error("Google token exchange failed:", error.message);
    return fail(req, res, "google_failed");
  }

  // 2. Ask Google who signed in
  let profile;
  try {
    const response = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    profile = await response.json();
    if (!response.ok || !profile.sub) throw new Error("userinfo request failed");
  } catch (error) {
    console.error("Google userinfo failed:", error.message);
    return fail(req, res, "google_failed");
  }

  if (!profile.email || profile.email_verified !== true) return fail(req, res, "email_unverified");

  // 3. Find the customer: by Google id, else link an existing account with the same verified email, else create one
  const email = profile.email.toLowerCase();
  let customer = await Customer.findOne({ googleId: profile.sub });

  if (!customer) {
    customer = await Customer.findOne({ email });
    if (customer) {
      customer.googleId = profile.sub;
      if (!customer.avatarUrl && profile.picture) customer.avatarUrl = profile.picture;
      await customer.save();
    } else {
      customer = await Customer.create({
        fullName: profile.name?.trim() || email.split("@")[0],
        email,
        googleId: profile.sub,
        avatarUrl: profile.picture,
      });
    }
  }

  // 4. Same session as a password login: our own JWT in an HttpOnly cookie
  generateToken(res, customer._id);

  const fallback = customer.role === "admin" ? "/admin" : "/home";
  res.redirect(`${appUrl(req)}${saved.next || fallback}`);
};

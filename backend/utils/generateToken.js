import jwt from "jsonwebtoken";

// A project-specific name so it never clashes with other apps running on localhost
export const COOKIE_NAME = "shopkart_token";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export const cookieOptions = () => ({
  httpOnly: true, // JavaScript in the browser cannot read this cookie
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
});

// The payload only carries the customer id - never the password or other personal data
const generateToken = (res, customerId) => {
  const token = jwt.sign({ id: customerId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: SEVEN_DAYS });

  return token;
};

export default generateToken;

# ShopKart

A full-stack MERN e-commerce app built for Engineering Labs 01–06 ([problem statements](https://github.com/mrinal1224/Lab-2029-Problem-Statements)).

### 🔗 Live demo: **https://shopkart-sooty.vercel.app**

**Customer flow:** Register → Login → Browse / Search / Filter → Wishlist → Cart → Checkout → Razorpay (Test Mode) → Order confirmation → My Orders.

| Layer    | Tech |
|----------|------|
| Backend  | Node.js, Express 5, MongoDB Atlas + Mongoose, bcrypt, jsonwebtoken, cookie-parser, Razorpay SDK |
| Frontend | React 18 (Vite 8), React Router 7, Axios, Context API (auth and cart state), plain CSS |
| Hosting  | Vercel: one project with two services (Express API at `/api`, Vite SPA at `/`) |

---

## 1. For evaluators: try it in 5 minutes

> **No real money is involved.** Payments run in **Razorpay Test Mode**, so nothing is charged.

1. Open **https://shopkart-sooty.vercel.app**.
2. **Register** a new account. Every page except Login and Register requires sign-in. Use any email, a password of **at least 6 characters**, and a **10-digit Indian mobile number starting with 6–9** (e.g. `9876543210`).
3. **Browse** the 20 seeded products. Try the search box, the category filter and price sorting.
4. Click the ♡ on a few products, then open **Wishlist**. Try **Move to Cart** and **Remove**.
5. Open **Cart** and change quantities. You can't go above the product's stock. Then click **Checkout**.
6. Fill in the shipping form. The phone must have 10 digits starting with 6–9 and the pincode must have 6 digits (e.g. `560001`). Then click **Place Order · Pay ₹…**.
7. **Pay with Netbanking (easiest; see below).**
8. You land on the receipt page, the cart count drops to **0**, and the order appears under **My Orders** with a progress tracker.

### 💳 Paying in Test Mode: use **Netbanking**

Netbanking is the quickest test method because it needs no card numbers, OTPs or UPI IDs:

1. In the Razorpay popup, choose **Netbanking**.
2. Pick **any bank**, such as SBI or HDFC.
3. A Razorpay test page opens. Click **Success** to complete the payment.
   - Click **Failure** instead to test the failure path. An error is shown, the order is **not** placed, and your cart is kept.

Other test methods also work. The UPI ID `success@razorpay` succeeds and `failure@razorpay` fails, and test cards are listed in [Razorpay's test details](https://razorpay.com/docs/payments/payments/test-card-details/).

### Things worth knowing while evaluating

- **Login uses an HttpOnly cookie.** The JWT is never visible to JavaScript or stored in `localStorage`. It is sent automatically because the frontend and API share one domain.
- **The server is the source of truth for money.** Checkout sends only the shipping address. The server recalculates the total from the database and re-checks stock. It then verifies Razorpay's HMAC-SHA256 signature before marking an order paid, reducing stock and clearing the cart.
- **Closing the Razorpay popup or a failed payment never places an order.** The cart stays as it was.
- **The "Simulate next step →" button on an order page is a development-only demo** that stands in for an admin panel. On the live site it returns *"Status updates are disabled in production"* on purpose, so customers can't mark their own orders as shipped or delivered. Run the app locally to see the tracker move through PLACED → CONFIRMED → SHIPPED → DELIVERED.
- **Product creation (`POST /api/products`) is an open API**, as Lab 03 allows. There is no admin UI.
- **The first request after a period of inactivity can take a few seconds** while the serverless function starts and connects to MongoDB.
- **API health check:** https://shopkart-sooty.vercel.app/api should return `{"success":true,"message":"ShopKart API is running"}`.

---

## 2. Running locally

### Requirements

- **Node.js 18+**
- **MongoDB**: one of these two
  - a local MongoDB Community Server ([download](https://www.mongodb.com/try/download/community)), or
  - a free MongoDB Atlas cluster ([atlas](https://www.mongodb.com/cloud/atlas))
- **Razorpay account** in **Test Mode**, so you can get test API keys ([dashboard](https://dashboard.razorpay.com))

> ShopKart uses its **own** database, `shopkart_trinankur`. MongoDB creates it on the first write, so it never touches your other databases. The seed script only writes to that database's `products` collection.

### Backend

```bash
cd backend
npm install
cp .env.example .env    # then fill in the values below
```

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default `5050`) |
| `NODE_ENV` | `development` locally. In `production`, the cookie becomes `secure` and the demo status endpoint is turned off. |
| `CLIENT_URL` | Frontend origin(s) allowed by CORS (default `http://localhost:5180`). Only needed if you set `VITE_API_URL` to a different origin. |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/shopkart_trinankur` for local MongoDB, or an Atlas URI such as `mongodb+srv://<user>:<pass>@<cluster>/shopkart_trinankur` |
| `JWT_SECRET` | Long random string used to sign JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `RAZORPAY_KEY_ID` | Your **test** Key ID (`rzp_test_...`) |
| `RAZORPAY_KEY_SECRET` | Your **test** Key Secret. It stays on the backend only. |

**Getting Razorpay test keys:** log in to the Razorpay Dashboard, switch to **Test Mode**, open **Account & Settings → API Keys**, then click **Generate Key**. Paste both values into `backend/.env`.

Load the sample products (20 items across Electronics, Fashion, Books and Home):

```bash
npm run seed          # inserts products only if the collection is empty
npm run seed:fresh    # deletes ShopKart's products and inserts them again
```

Start the API on http://localhost:5050/api:

```bash
npm run dev           # or: npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5180**. The frontend calls `/api` on its own origin, and the Vite dev server proxies `/api` to `http://localhost:5050`. No frontend `.env` is needed.

| Variable | Default |
|----------|---------|
| `VITE_API_URL` | `/api` (optional override, e.g. `http://localhost:5050/api`) |

---

## 3. Deployment (Vercel)

[`vercel.json`](vercel.json) deploys the repo as **one Vercel project with two services**:

| Public path | Service | What it is |
|-------------|---------|------------|
| `/api`, `/api/*` | `backend` | The Express app, run as a Vercel Function. The full path, including `/api`, is passed through. |
| everything else | `frontend` | The Vite build. Unknown paths fall back to `index.html` so client-side routes work on refresh. |

- **Production environment variables:** set in Vercel project settings: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `NODE_ENV=production`.
- **Automatic deploys:** every push to `main` deploys to production through the connected GitHub repo.
- **Atlas Network Access:** must allow `0.0.0.0/0`, because Vercel Functions don't use fixed IPs.
- **Code changes for Vercel:**
  - The backend exports the Express app instead of calling `listen()` when running on Vercel.
  - It connects to MongoDB lazily, with a cached connection that warm invocations reuse.
- **Run both services locally like production:** `vercel dev` from the repo root.

---

## 4. Project structure

```text
vercel.json        Vercel services + routing
backend/
├── config/        db.js (cached Mongo connection), razorpay.js
├── controllers/   customer, product, wishlist, cart, order
├── middlewares/   auth.middleware.js (JWT from HttpOnly cookie), error.middleware.js
├── models/        customer.model.js (+ wishlist, cart), product.model.js, order.model.js
├── routes/        customer, product, wishlist, cart, order  (all mounted under /api)
├── seed/          products.js, seed.js
├── utils/         generateToken.js, validators.js
└── index.js       Express app (exported for Vercel, listens locally)

frontend/src/
├── components/    Navbar, ProductCard, SearchBar, WishlistButton, WishlistCard, CartItem,
│                  CheckoutForm, OrderSummary, OrderCard, OrderTracker, ProtectedRoute, ...
├── context/       AuthContext.jsx, CartContext.jsx (global cart state)
├── pages/         Login, Register, Home, Products, ProductDetails, Wishlist, Cart,
│                  Checkout, OrderSuccess, Orders, OrderDetails, NotFound
├── services/      api.js (all API calls, axios withCredentials)
└── utils/         format.js, validation.js, razorpay.js
```

> The labs call the user model both "Customer" (Lab 01) and "User" (Labs 04–06). ShopKart uses a single `Customer` model that holds `wishlist` and `cart`; `Order.user` references it.

---

## 5. API reference

**Base URL:**
- Live: `https://shopkart-sooty.vercel.app/api`
- Local: `http://localhost:5050/api`

Every protected route (🔒) reads the JWT from the `shopkart_token` HttpOnly cookie. For Postman, an `Authorization: Bearer <token>` header also works. The user is always taken from the token, never from the request body. Every response is JSON with a `success` flag, and errors include a `message`.

### Customers (Lab 01)
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/customers/register` | `{fullName, email, password, phone}`. Returns 400 for missing fields, a password under 6 characters or a bad phone, and 409 for a duplicate email. |
| POST | `/api/customers/login` | Sets the HttpOnly cookie. Returns 401 "Invalid email or password" without saying which one was wrong. |
| GET | `/api/customers/me` 🔒 | Current customer, without the password |
| POST | `/api/customers/logout` 🔒 | Clears the cookie |
| PATCH | `/api/customers/change-password` 🔒 | `{oldPassword, newPassword}` (bonus) |

### Products (Lab 03)
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/products` | Open API. Returns 400 for a missing field, price ≤ 0 or stock < 0. |
| GET | `/api/products?search=&category=&sort=` | Case-insensitive name search, category filter, and `sort=price_asc` / `price_desc` (bonus) |
| GET | `/api/products/categories` | Distinct categories for the dropdown |
| GET | `/api/products/:id` | 400 for an invalid id, 404 if not found |

### Wishlist (Lab 04), all 🔒
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/wishlist/:productId` | 201. Returns 400, 404, or 409 if already saved. |
| GET | `/api/wishlist` | Saved products, loaded with `populate()` |
| DELETE | `/api/wishlist/:productId` | 404 if the product is not in the wishlist |
| PATCH | `/api/wishlist/:productId/toggle` | Returns `{saved: true/false}` (bonus) |

### Cart (Lab 05), all 🔒
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/cart/:productId` | Adds 1, or adds 1 more if already in the cart. 400 if it would exceed stock. |
| GET | `/api/cart` | Products loaded with `populate()`, plus quantity |
| PATCH | `/api/cart/:productId` | `{quantity}`. Must be a whole number from 1 to stock. 404 if not in the cart. |
| DELETE | `/api/cart/:productId` | Returns the updated cart |

### Orders (Lab 06), all 🔒
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/orders/create-payment-order` | `{shippingAddress}` only. The server re-checks stock, calculates the total, saves a `PENDING_PAYMENT` order and creates the Razorpay order (amount in paise). |
| POST | `/api/orders/verify-payment` | `{shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature}`. Checks the HMAC-SHA256 signature against the **stored** Razorpay order id, then marks the order PAID/PLACED, reduces stock and clears the cart. |
| POST | `/api/orders/:id/payment-failed` | Marks a failed attempt (the cart is kept) |
| GET | `/api/orders` | Current user's placed orders, newest first (unpaid attempts are hidden) |
| GET | `/api/orders/:id` | 404 if the order belongs to someone else |
| PATCH | `/api/orders/:id/status` | `{status}`. Moves the order forward PLACED → CONFIRMED → SHIPPED → DELIVERED. Bonus, **development only** (403 in production). |

---

## 6. How the lab rules are covered

- **Passwords**: stored as bcrypt hashes (`select: false`) and never included in a response.
- **Auth**: the JWT payload holds only the customer id. It lives in an HttpOnly, SameSite=Lax cookie (also `Secure` in production), and Axios uses `withCredentials: true`. Protected pages call `GET /api/customers/me`. When a session expires mid-use, a 401 sends the user back to Login.
- **Wishlist**: stores Product ObjectIds (`ref: "Product"`), uses `populate()` and `$addToSet` to prevent duplicates. Wishlist data is fetched per page with no global state. The navbar count comes from the backend.
- **Cart**: stores product references and quantities. Subtotal and item count are calculated in `CartContext`, not stored. Stock is checked on every change, and the navbar, product cards, cart page and checkout all share one cart state.
- **Checkout**: the frontend sends only the address. Any `totalAmount` it sends is ignored. Each order keeps a snapshot of name, price and image, so old orders don't change when prices do. The Razorpay secret never leaves the server, and the cart is cleared only after the signature is verified.
- **UI states**: products, wishlist, cart, orders and order pages each have loading, empty and error states, with **Try Again** buttons where needed.

**Extras:**
- Receipt-style order confirmation
- Order progress tracker
- "Move to Cart" from the wishlist
- Low-stock and out-of-stock labels
- Debounced search
- Responsive navbar with a mobile menu
- Change password
- Single-domain Vercel deployment

# ShopKart

A full-stack MERN e-commerce app built for Engineering Labs 01–06 ([problem statements](https://github.com/mrinal1224/Lab-2029-Problem-Statements)). It has a customer storefront and a separate admin panel.

### 🔗 Live demo: **https://shopkart-sooty.vercel.app**

| Account | Email | Password | What you can do |
|---------|-------|----------|-----------------|
| **Admin** (placeholder) | `admin@shopkart.dev` | `Admin@123` | Analytics, all orders, update order status, inventory and stock |
| **Customer** | Register your own, or **Continue with Google** | 6+ characters | Shop, save addresses, pay in Test Mode, track orders |

> The admin details are listed only here, not anywhere in the app. Log in with them on the normal login page. Admins land on the admin panel. Their store header shows only **Home** and **Admin**, with no bag, wishlist or orders, because admins don't shop.

**Customer flow:** Register → Login → Browse / Search / Filter → Wishlist → Bag → Choose or add an address → Razorpay (Test Mode) → Receipt → Order tracking.
**Admin flow:** Analytics → Orders (Confirm → Ship → Deliver, or Cancel) → Inventory (restock).

| Layer    | Tech |
|----------|------|
| Backend  | Node.js, Express 5, MongoDB Atlas + Mongoose, bcrypt, jsonwebtoken, cookie-parser, Razorpay SDK |
| Frontend | React 18 (Vite 8), React Router 7, Axios, Context API (auth, cart, addresses, toasts), lucide-react icons, hand-written CSS |
| Hosting  | Vercel: one project with two services (Express API at `/api`, Vite SPA at `/`) |

---

## 1. For evaluators: try it in 10 minutes

> **No real money is involved.** Payments run in **Razorpay Test Mode**, so nothing is charged.

### As a customer

1. Open **https://shopkart-sooty.vercel.app** and **register**, or click **Continue with Google**. Every page except Login and Register requires sign-in.
   - Use a password of **at least 6 characters**.
   - Use a **10-digit Indian mobile number starting with 6–9**, e.g. `9876543210`.
2. **Home** shows bestsellers, category tiles and, once you have some, your wishlist and bag.
3. **Shop:** try the category chips, the search box and sorting (Newest, Most popular, Price).
   - Hover a product to use **Add to bag** without leaving the grid.
   - The ♡ saves it to your wishlist.
4. **Product page:**
   - Availability shows as **In stock**, **Few left** or **Sold out**. Customers never see exact stock numbers; those are admin-only.
   - A delivery estimate shows for your saved address.
   - "More from this category" appears underneath.
5. **Account → Saved addresses:** add a Home or Work address.
   - **Use my current location** fills in city, state and pincode after you allow location access.
   - Mark one address as **Default**. It then shows in the header ("Deliver to …") and is pre-selected at checkout.
6. **Bag → Checkout:** pick a saved address or add a new one inline. Then click **Pay ₹…**.
7. **Pay with Netbanking (easiest; see below).**
8. You land on a **receipt**, the bag count drops to **0**, and the order appears under **Orders** with a tracking timeline.

### As the admin

1. Log out, then log in with `admin@shopkart.dev` / `Admin@123`. You land on **/admin**.
2. **Analytics:**
   - Revenue, paid orders, average order value and customers for the last 7, 14, 30 or 90 days.
   - A daily revenue chart. Hover a bar, or use **View as table**.
   - The order pipeline, top products, sales by category, items running low and the latest orders.
3. **Orders:** every paid order, with status tabs and a search box.
   - The **Next step** button moves an order forward: **Confirm → Mark shipped → Mark delivered**.
   - Click a row to open the order details, its timeline, and **Cancel order**. Cancelling is allowed while an order is Placed or Confirmed, and it puts the stock back.
4. **Inventory:** the stock list for all 20 products, with units sold and a stock meter.
   - Type a new number and click **Save**, or use **+10**, **+50** or **Refill** (back to 100).
5. Log back in as your customer and open the order. The **timeline shows the new status with dates**.

### 💳 Paying in Test Mode: use **Netbanking**

Netbanking is the quickest test method because it needs no card numbers, OTPs or UPI IDs:

1. In the Razorpay popup, choose **Netbanking**.
2. Pick **any bank**, such as SBI or HDFC.
3. A Razorpay test page opens. Click **Success** to complete the payment.
   - Click **Failure** instead to test the failure path. An error is shown, the order is **not** placed, and your bag is kept.

Other test methods also work. The UPI ID `success@razorpay` succeeds and `failure@razorpay` fails, and test cards are listed in [Razorpay's test details](https://razorpay.com/docs/payments/payments/test-card-details/).

### Things worth knowing while evaluating

- **Exact stock numbers are admin-only.** Customers see only In stock, Few left (10 or fewer) or Sold out, and API error messages don't reveal stock counts either.
- **Stock starts at 100 for every product.** The bestsellers have seeded sales history: for example, the Classic White T-Shirt has sold 46 and has 54 left. That makes the catalogue look like it has been ordered from before.
  - Each paid order reduces `stock` and increases `sold`. Cancelling an order reverses both.
  - The analytics page says so too: **revenue comes only from real paid orders**, but **"units sold" includes the seeded history**.
- **Only the admin can change an order's status.** Customers can only follow their orders. The old customer-side "Simulate next step" button and its `PATCH /api/orders/:id/status` endpoint have been removed.
- **Admin routes are protected on the server**, not just hidden in the UI. Every `/api/admin/*` call checks for `role: "admin"` and returns 403 otherwise.
- **The admin credentials are public placeholders** so evaluators can try the panel. For a real store, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` and re-run `npm run seed:admin`.
- **Login uses an HttpOnly cookie.** The JWT is never visible to JavaScript or stored in `localStorage`.
- **Google sign-in (OAuth 2.0)** uses the authorization-code flow with `state` and PKCE, run entirely on the server.
  - Google's tokens never reach the browser. After Google confirms the account, the server sets the same ShopKart session cookie as a password login.
  - A Google account with the same verified email as an existing account is linked to it.
  - New Google accounts have no password or phone. They can set a password later under **Account**, and the phone is collected with the delivery address.
- **The server is the source of truth for money.** Checkout sends only the shipping address.
  - The server recalculates the total from the database and re-checks stock.
  - It verifies Razorpay's HMAC-SHA256 signature before marking the order paid, reducing stock and clearing the bag.
- **Closing the Razorpay popup, or a failed payment, never places an order.** The bag stays as it was.
- **"Use my current location"** uses the browser's geolocation plus BigDataCloud's free reverse-geocoding API, which needs no key. If permission is denied, or you're outside India, it says so and you type the address instead.
- **Delivery is free on every order**, and the delivery dates shown (3–5 days) are estimates.
- **Product creation (`POST /api/products`) is still an open API**, as Lab 03 allows.
- **The first request after a period of inactivity can take a few seconds** while the serverless function starts and connects to MongoDB.
- **API health check:** https://shopkart-sooty.vercel.app/api should return `{"success":true,"message":"ShopKart API is running"}`.

---

## 2. Features

**Storefront**
- Editorial design: Fraunces / Geist / Geist Mono type, warm paper palette, consistent line icons. It works at phone width.
- Home page with bestsellers, category tiles, a "your bag is waiting" reminder and a "still thinking about these?" wishlist row.
- Catalogue:
  - category chips with counts, debounced search and four sort orders
  - filters kept in the URL, e.g. `/products?category=Books`
  - skeleton loading
- Product cards:
  - hover "Add to bag"
  - heart toggle
  - **Bestseller**, **Few left** and **Sold out** badges (no exact stock numbers for customers)
  - "N sold" counts
- Product page: breadcrumbs, an availability line, a delivery estimate for your default address, related products.
- **Address book**:
  - up to 6 saved addresses, labelled Home, Work or Other, each with an optional area/landmark line
  - one default, shown in the header
  - "Use my current location" autofill
  - a choice of Indian states
- Checkout:
  - saved-address cards with an inline "add new address" form
  - optional "save to my address book"
  - item thumbnails in the summary
- Receipt with a "PAID" stamp, plus an order history with filters and a dated tracking timeline (including cancelled orders).
- Toast notifications, navbar badges that bump when they change, password visibility toggle, password strength hint.

**Admin panel** (`/admin`, separate layout)
- **Analytics:**
  - revenue and order stat tiles with change vs the previous period
  - daily revenue chart with tooltips and a table view
  - order pipeline, top products, sales by category, items running low, latest orders
- **Orders:**
  - status tabs with counts
  - search by customer, email, city or `#ORDERID`
  - one-click "next step" buttons
  - a detail drawer with the timeline, a skip-ahead option (steps in between are still recorded) and cancel
- **Inventory:**
  - units, stock value, low-stock and sold-out tiles
  - category and level filters
  - inline stock editing with +10, +50 and Refill shortcuts
- The sidebar badges show orders waiting for confirmation and products running low.

---

## 3. Running locally

### Requirements

- **Node.js 18+**
- **MongoDB**: one of these two
  - a local MongoDB Community Server ([download](https://www.mongodb.com/try/download/community)), or
  - a free MongoDB Atlas cluster ([atlas](https://www.mongodb.com/cloud/atlas))
- **Razorpay account** in **Test Mode**, so you can get test API keys ([dashboard](https://dashboard.razorpay.com))

> ShopKart uses its **own** database, `shopkart_trinankur`. MongoDB creates it on the first write, so it never touches your other databases.

### Backend

```bash
cd backend
npm install
cp .env.example .env    # then fill in the values below
```

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default `5050`) |
| `NODE_ENV` | `development` locally. In `production`, the auth cookie becomes `secure`. |
| `CLIENT_URL` | Frontend origin(s) allowed by CORS (default `http://localhost:5180`). Only needed if you set `VITE_API_URL` to a different origin. |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/shopkart_trinankur` for local MongoDB, or an Atlas URI such as `mongodb+srv://<user>:<pass>@<cluster>/shopkart_trinankur` |
| `JWT_SECRET` | Long random string used to sign JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `RAZORPAY_KEY_ID` | Your **test** Key ID (`rzp_test_...`) |
| `RAZORPAY_KEY_SECRET` | Your **test** Key Secret. It stays on the backend only. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Optional. Override the placeholder admin created by `npm run seed:admin`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional. Enable **Continue with Google**. The button is hidden until both are set. |
| `APP_URL` | Optional. Public URL of the site, used to build the Google redirect URI. Normally worked out from the request. |

**Setting up Google sign-in:**
1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type **Web application**.
2. Add these **Authorised redirect URIs**:
   - `http://localhost:5180/api/auth/google/callback` for local development
   - `https://shopkart-sooty.vercel.app/api/auth/google/callback` for production
3. Put the client ID and secret in `backend/.env` locally, and in the Vercel project's environment variables for production.

**Getting Razorpay test keys:** log in to the Razorpay Dashboard, switch to **Test Mode**, open **Account & Settings → API Keys**, then click **Generate Key**. Paste both values into `backend/.env`.

Load the data:

```bash
npm run seed          # inserts the 20 sample products if the collection is empty
npm run seed:admin    # creates (or resets) the admin account: admin@shopkart.dev / Admin@123
npm run seed:stock    # resets stock and sold counts to the seeded values (keeps product ids, carts and orders)
npm run seed:fresh    # deletes ShopKart's products and inserts them again (new ids)
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

## 4. Deployment (Vercel)

[`vercel.json`](vercel.json) deploys the repo as **one Vercel project with two services**:

| Public path | Service | What it is |
|-------------|---------|------------|
| `/api`, `/api/*` | `backend` | The Express app, run as a Vercel Function. The full path, including `/api`, is passed through. |
| everything else | `frontend` | The Vite build. Unknown paths fall back to `index.html` so client-side routes work on refresh. |

- **Production environment variables:** set in Vercel project settings: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NODE_ENV=production`, plus `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for Google sign-in.
- **Seeding production:** the seed scripts run from your machine against the same `MONGO_URI`, e.g. `npm run seed:admin`.
- **Automatic deploys:** every push to `main` deploys to production through the connected GitHub repo.
- **Atlas Network Access:** must allow `0.0.0.0/0`, because Vercel Functions don't use fixed IPs.
- **Serverless setup:**
  - The backend exports the Express app instead of calling `listen()` when running on Vercel.
  - It connects to MongoDB lazily, with a cached connection that warm invocations reuse.

---

## 5. Project structure

```text
vercel.json          Vercel services + routing
backend/
├── config/          db.js (cached Mongo connection), razorpay.js
├── controllers/     customer, address, oauth (Google), product, wishlist, cart, order, admin
├── middlewares/     auth.middleware.js (protect + adminOnly), error.middleware.js
├── models/          customer.model.js (+ role, addresses, wishlist, cart),
│                    product.model.js (+ sold), order.model.js (+ statusHistory)
├── routes/          auth, customer, product, wishlist, cart, order, admin  (all under /api)
├── seed/            products.js, seed.js (seed / fresh / sync-stock), admin.js
├── utils/           generateToken.js, validators.js
└── index.js         Express app (exported for Vercel, listens locally)

frontend/src/
├── components/      Navbar, Footer, ProductCard, WishlistButton, WishlistCard, CartItem,
│                    AddressForm, AddressText, OrderSummary, OrderProgress (timeline),
│                    ProtectedRoute, AdminRoute, GuestRoute, ProductSkeleton, ...
├── context/         AuthContext, CartContext, AddressContext, ToastContext
├── pages/           Home, Products, ProductDetails, Wishlist, Cart, Checkout, OrderSuccess,
│                    Orders, OrderDetails, Account, Login, Register, NotFound
│   └── admin/       AdminLayout, Analytics, AdminOrders, Inventory
├── services/        api.js (all API calls, axios withCredentials)
└── utils/           format.js, validation.js, razorpay.js, location.js
```

> The labs call the user model both "Customer" (Lab 01) and "User" (Labs 04–06). ShopKart uses a single `Customer` model (with a `role` of `customer` or `admin`) that holds `addresses`, `wishlist` and `cart`; `Order.user` references it.

---

## 6. API reference

**Base URL:**
- Live: `https://shopkart-sooty.vercel.app/api`
- Local: `http://localhost:5050/api`

**Conventions:**
- Every protected route (🔒) reads the JWT from the `shopkart_token` HttpOnly cookie. For Postman, an `Authorization: Bearer <token>` header also works.
- The user is always taken from the token, never from the request body.
- 🛡️ marks admin-only routes.
- Every response is JSON with a `success` flag, and errors include a `message`.

### Customers (Lab 01)
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/customers/register` | `{fullName, email, password, phone}`. Returns 400 for missing fields, a password under 6 characters or a bad phone, and 409 for a duplicate email. |
| POST | `/api/customers/login` | Sets the HttpOnly cookie. Returns 401 "Invalid email or password" without saying which one was wrong. |
| GET | `/api/customers/me` 🔒 | Current customer (including `role`), without the password |
| POST | `/api/customers/logout` 🔒 | Clears the cookie |
| PATCH | `/api/customers/change-password` 🔒 | `{oldPassword, newPassword}` (bonus). Google accounts without a password can set one with just `{newPassword}`. |

### Sign in with Google (OAuth 2.0)
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/auth/providers` | `{google: true/false}`. Whether Google sign-in is configured. |
| GET | `/api/auth/google?next=/path` | Redirects to Google's consent screen. Sets a 10-minute HttpOnly cookie holding `state` and the PKCE verifier. |
| GET | `/api/auth/google/callback` | Google redirects here. The server checks `state`, exchanges the code with the client secret and PKCE verifier, reads the verified email, finds, links or creates the customer, sets the session cookie, then redirects to `/home`, `/admin` or `next`. Errors redirect to `/login?oauth_error=…`. |

### Address book, all 🔒
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/customers/addresses` | Saved addresses, default first |
| POST | `/api/customers/addresses` | `{label?, fullName, phone, addressLine1, addressLine2?, city, state, pincode, isDefault?}`. The same validation as checkout. Maximum 6. The first address becomes the default. |
| PATCH | `/api/customers/addresses/:addressId` | Edit an address |
| PATCH | `/api/customers/addresses/:addressId/default` | Make it the default |
| DELETE | `/api/customers/addresses/:addressId` | Removing the default promotes another address |

### Products (Lab 03)
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/products` | Open API. Returns 400 for a missing field, price ≤ 0 or stock < 0. |
| GET | `/api/products?search=&category=&sort=` | Case-insensitive name search, category filter. `sort` is `newest`, `popular` (by units sold), `price_asc` or `price_desc`. |
| GET | `/api/products/categories` | Distinct categories |
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
| POST | `/api/orders/verify-payment` | `{shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature}`. Checks the HMAC-SHA256 signature against the **stored** Razorpay order id. Then it marks the order PAID/PLACED, records the status history, reduces `stock`, increases `sold` and clears the cart. |
| POST | `/api/orders/:id/payment-failed` | Marks a failed attempt (the cart is kept) |
| GET | `/api/orders` | Current user's placed orders, newest first (unpaid attempts are hidden) |
| GET | `/api/orders/:id` | 404 if the order belongs to someone else |

### Admin, all 🔒🛡️ (403 for non-admins)
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/admin/analytics?days=7\|14\|30\|90` | Summary with change vs the previous period, daily revenue, status counts, top products, category sales, low stock, recent orders |
| GET | `/api/admin/orders?status=&search=` | All paid orders with the customer populated, plus counts per status |
| GET | `/api/admin/orders/:id` | Full order with customer details |
| PATCH | `/api/admin/orders/:id/status` | `{status}`. Forward only: PLACED → CONFIRMED → SHIPPED → DELIVERED. Skipping ahead records the steps in between. `CANCELLED` is allowed from PLACED or CONFIRMED and returns the items to stock. |
| GET | `/api/admin/products?search=&category=&level=low\|out` | Stock list with `stock` and `sold` |
| PATCH | `/api/admin/products/:id/stock` | `{stock}`. A whole number from 0 to 100,000. |

---

## 7. How the lab rules are covered

- **Passwords**: stored as bcrypt hashes (`select: false`) and never included in a response.
- **Auth**:
  - The JWT payload holds only the customer id. It lives in an HttpOnly, SameSite=Lax cookie (also `Secure` in production), and Axios uses `withCredentials: true`.
  - Protected pages call `GET /api/customers/me`. When a session expires mid-use, a 401 sends the user back to Login.
  - Admin pages also check the role, and the API enforces it with the `adminOnly` middleware.
- **Wishlist**: stores Product ObjectIds (`ref: "Product"`), uses `populate()` and `$addToSet` to prevent duplicates. Wishlist data is fetched per page with no global state. The navbar count comes from the backend.
- **Cart**: stores product references and quantities. Subtotal and item count are calculated in `CartContext`, not stored. Stock is checked on every change, and the navbar, product cards, bag page and checkout all share one cart state.
- **Checkout**:
  - The frontend sends only the address. Any `totalAmount` it sends is ignored.
  - Each order keeps a snapshot of name, price and image, so old orders don't change when prices do.
  - The Razorpay secret never leaves the server, and the cart is cleared only after the signature is verified.
- **UI states**: products, wishlist, bag, orders, order pages and every admin page have loading (skeleton or spinner), empty and error states, with **Try again** buttons where needed.

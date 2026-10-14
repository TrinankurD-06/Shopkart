# ShopKart

A MERN e-commerce app built for Engineering Labs 01–06 ([problem statements](https://github.com/mrinal1224/Lab-2029-Problem-Statements)).

**Customer flow:** Register → Login → Browse / Search / Filter → Wishlist → Cart → Checkout → Razorpay (Test Mode) → Order confirmation → My Orders.

| Layer    | Tech |
|----------|------|
| Backend  | Node.js, Express 5, MongoDB + Mongoose, bcrypt, jsonwebtoken, cookie-parser, Razorpay SDK |
| Frontend | React 18 (Vite), React Router 6, Axios, Context API (cart state), plain CSS |

---

## 1. Requirements

- **Node.js 18+**
- **MongoDB**: one of these two
  - a local MongoDB Community Server ([download](https://www.mongodb.com/try/download/community)), or
  - a free MongoDB Atlas cluster ([atlas](https://www.mongodb.com/cloud/atlas))
- **Razorpay account** in **Test Mode**, so you can get test API keys ([dashboard](https://dashboard.razorpay.com))

> ShopKart uses its **own** database, `shopkart_trinankur`. MongoDB creates it on the first write, so it never touches your other databases. The seed script only writes to that database's `products` collection.

---

## 2. Setup

### Backend

```bash
cd backend
npm install
```

`backend/.env` already exists and includes a randomly generated `JWT_SECRET`. To recreate it, copy `backend/.env.example`. Then fill in:

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default `5050`) |
| `NODE_ENV` | `development` (in `production`, the cookie becomes `secure` and the demo status endpoint is turned off) |
| `CLIENT_URL` | Frontend origin allowed to send cookies (default `http://localhost:5180`) |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/shopkart_trinankur` for local MongoDB, or an Atlas URI such as `mongodb+srv://<user>:<pass>@<cluster>/shopkart_trinankur` |
| `JWT_SECRET` | Long random string used to sign JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `RAZORPAY_KEY_ID` | Your **test** Key ID (`rzp_test_...`) |
| `RAZORPAY_KEY_SECRET` | Your **test** Key Secret. It stays on the backend only. |

**Getting new Razorpay test keys:** log in to the Razorpay Dashboard, switch to **Test Mode**, open **Account & Settings → API Keys**, then **Generate Key**. Paste both values into `backend/.env` and restart the backend.

Load the sample products (20 items across Electronics, Fashion, Books and Home):

```bash
npm run seed          # inserts products only if the collection is empty
npm run seed:fresh    # deletes ShopKart's products and inserts them again
```

Start the API:

```bash
npm run dev           # or: npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5180**. The frontend reads the API URL from `frontend/.env`:

| Variable | Default |
|----------|---------|
| `VITE_API_URL` | `http://localhost:5050` |

> Open the app at `localhost` and not `127.0.0.1`, so the browser treats the frontend and the API as the same site and sends the auth cookie.

---

## 3. Testing a payment (Test Mode)

1. Add products to the cart and go to **Checkout**.
2. Fill in the shipping form and click **Place Order · Pay ₹…**.
3. In the Razorpay popup, pay with a test method from [Razorpay's test card/UPI list](https://razorpay.com/docs/payments/payments/test-card-details/). For example, UPI ID `success@razorpay` succeeds and `failure@razorpay` fails.
4. On success, the backend verifies the signature, marks the order **PAID / PLACED**, reduces stock and clears the cart. The navbar then shows **Cart (0)** and you land on the receipt page.
5. If the payment fails or you close the popup, an error is shown and the cart is kept.

No real money is involved.

---

## 4. Project structure

```text
backend/
├── config/        db.js, razorpay.js
├── controllers/   customer, product, wishlist, cart, order
├── middlewares/   auth.middleware.js (JWT from HttpOnly cookie), error.middleware.js
├── models/        customer.model.js (+ wishlist, cart), product.model.js, order.model.js
├── routes/        customer, product, wishlist, cart, order
├── seed/          products.js, seed.js
├── utils/         generateToken.js, validators.js
└── index.js

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

Every protected route (🔒) reads the JWT from the `shopkart_token` HttpOnly cookie. For Postman, an `Authorization: Bearer <token>` header also works. The user is always taken from the token, never from the request body.

### Customers (Lab 01)
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/customers/register` | `{fullName, email, password, phone}`. Returns 400 for missing fields, a short password or a bad phone, and 409 for a duplicate email. |
| POST | `/customers/login` | Sets the HttpOnly cookie. Returns 401 "Invalid email or password" without saying which one was wrong. |
| GET | `/customers/me` 🔒 | Current customer, without the password |
| POST | `/customers/logout` 🔒 | Clears the cookie |
| PATCH | `/customers/change-password` 🔒 | `{oldPassword, newPassword}` (bonus) |

### Products (Lab 03)
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/products` | Open API. Returns 400 for a missing field, price ≤ 0 or stock < 0. |
| GET | `/products?search=&category=&sort=` | Case-insensitive name search, category filter, and `sort=price_asc` / `price_desc` (bonus) |
| GET | `/products/categories` | Distinct categories for the dropdown |
| GET | `/products/:id` | 400 for an invalid id, 404 if not found |

### Wishlist (Lab 04), all 🔒
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/wishlist/:productId` | 201. Returns 400, 404, or 409 if already saved. |
| GET | `/wishlist` | Saved products, loaded with `populate()` |
| DELETE | `/wishlist/:productId` | 404 if the product is not in the wishlist |
| PATCH | `/wishlist/:productId/toggle` | Returns `{saved: true/false}` (bonus) |

### Cart (Lab 05), all 🔒
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/cart/:productId` | Adds 1, or adds 1 more if already in the cart. 400 if it would exceed stock. |
| GET | `/cart` | Products loaded with `populate()`, plus quantity |
| PATCH | `/cart/:productId` | `{quantity}`. Must be a whole number from 1 to stock. 404 if not in the cart. |
| DELETE | `/cart/:productId` | Returns the updated cart |

### Orders (Lab 06), all 🔒
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/orders/create-payment-order` | `{shippingAddress}` only. The server re-checks stock, calculates the total, saves a `PENDING_PAYMENT` order and creates the Razorpay order (amount in paise). |
| POST | `/orders/verify-payment` | `{shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature}`. Checks the HMAC-SHA256 signature against the **stored** Razorpay order id, then marks the order PAID/PLACED, reduces stock and clears the cart. |
| POST | `/orders/:id/payment-failed` | Marks a failed attempt (the cart is kept) |
| GET | `/orders` | Current user's placed orders, newest first |
| GET | `/orders/:id` | 404 if the order belongs to someone else |
| PATCH | `/orders/:id/status` | `{status}`. Moves the order forward PLACED → CONFIRMED → SHIPPED → DELIVERED. Bonus, development only. |

---

## 6. How the lab rules are covered

- **Passwords**: stored as bcrypt hashes (`select: false`) and never included in a response.
- **Auth**: the JWT payload holds only the customer id. It lives in an HttpOnly, SameSite=Lax cookie, and Axios uses `withCredentials: true`. Protected pages call `GET /customers/me`.
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

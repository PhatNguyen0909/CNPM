# Product Requirements Document (PRD)
## Food Delivery Platform - Frontend Application

**Project Name:** CNPM - Food Delivery App  
**Document Version:** 1.0  
**Date:** November 8, 2025  
**Repository:** PhatNguyen0909/CNPM  
**Technology Stack:** React 19, Vite, React Router, Axios

---

## 1. Problem Alignment

### 1.1 High Level Approach

Xây dựng một nền tảng web frontend cho dịch vụ giao đồ ăn trực tuyến, kết nối người dùng với nhiều nhà hàng/quán ăn. Ứng dụng cung cấp trải nghiệm mua sắm trực tuyến hoàn chỉnh từ việc khám phá nhà hàng, chọn món ăn, tùy chỉnh đơn hàng, thanh toán đến theo dõi đơn hàng.

**Core Architecture:**
- **Single Page Application (SPA)** sử dụng React 19 với React Router để điều hướng
- **State Management** thông qua Context API (StoreContext) quản lý trạng thái toàn cục
- **RESTful API Integration** với backend thông qua Axios client
- **Authentication** dựa trên JWT token lưu trong cookie
- **Responsive Design** hỗ trợ cả desktop và mobile

### 1.2 Narrative

**Vấn đề:**
Trong thời đại số hiện nay, việc đặt đồ ăn trực tuyến đã trở thành nhu cầu thiết yếu của người tiêu dùng. Tuy nhiên, nhiều nền tảng hiện tại gặp các vấn đề:
- Trải nghiệm người dùng phức tạp và không thân thiện
- Thiếu thông tin chi tiết về nhà hàng và món ăn
- Quy trình đặt hàng rườm rà, nhiều bước không cần thiết
- Không hỗ trợ tùy chỉnh món ăn (options, toppings)
- Khó khăn trong việc theo dõi trạng thái đơn hàng
- Giỏ hàng không đồng bộ giữa các phiên làm việc

**Người dùng mục tiêu:**
1. **Khách hàng cuối (End Users):** Người tiêu dùng muốn đặt đồ ăn trực tuyến một cách nhanh chóng và tiện lợi
2. **Nhà hàng/Quán ăn:** Các merchant muốn tiếp cận khách hàng qua kênh online

**Pain Points được giải quyết:**
- ✅ Khó khăn trong việc tìm kiếm và lọc nhà hàng phù hợp
- ✅ Thiếu thông tin đánh giá và rating để ra quyết định
- ✅ Không thể tùy chỉnh món ăn theo sở thích cá nhân
- ✅ Giỏ hàng không được bảo vệ khi thêm món từ nhiều nhà hàng khác nhau
- ✅ Quy trình thanh toán thiếu minh bạch về phí giao hàng và tổng tiền
- ✅ Không biết trạng thái đơn hàng sau khi đặt

### 1.3 Goals

#### Business Goals
1. **Tăng tỷ lệ chuyển đổi (Conversion Rate)**
   - Giảm số bước trong quy trình checkout từ 5 xuống 3 bước
   - Tăng tỷ lệ hoàn thành đơn hàng lên 70%

2. **Mở rộng thị trường**
   - Hỗ trợ đa nhà hàng với khả năng scale
   - Cung cấp nền tảng cho merchant dễ dàng quản lý menu

3. **Retention & Engagement**
   - Tăng số lượng người dùng quay lại thông qua trải nghiệm tốt
   - Giảm bounce rate xuống dưới 40%

#### User Goals
1. **Khám phá nhà hàng dễ dàng**
   - Tìm kiếm nhà hàng theo nhiều tiêu chí: cuisine, rating, reviews
   - Xem thông tin chi tiết: địa chỉ, đánh giá, menu

2. **Đặt hàng nhanh chóng và chính xác**
   - Thêm món vào giỏ hàng với 1 click
   - Tùy chỉnh món ăn với options (size, toppings, extras)
   - Thêm ghi chú cho từng món

3. **Thanh toán minh bạch**
   - Xem rõ breakdown chi phí: subtotal, delivery fee, total
   - Nhập thông tin giao hàng một cách đơn giản

4. **Theo dõi đơn hàng**
   - Xem lịch sử tất cả đơn hàng
   - Theo dõi trạng thái realtime của đơn hàng đang xử lý

#### Technical Goals
1. **Performance**
   - Time to Interactive (TTI) < 3 seconds
   - Smooth navigation với lazy loading
   - Optimized API calls với caching strategy

2. **Reliability**
   - Error handling toàn diện cho API failures
   - Graceful degradation khi backend không available
   - Validation data từ backend để tránh inconsistency

3. **Security**
   - JWT authentication với token refresh
   - Secure cookie storage cho auth token
   - Protected routes cho các trang yêu cầu đăng nhập

4. **Maintainability**
   - Component-based architecture dễ mở rộng
   - Consistent code style với ESLint
   - Clear separation of concerns (services, components, context)

---

## 2. Solution Alignment

### 2.1 Key Features

#### Feature 1: Authentication & User Management
**Priority:** P0 (Critical)

**Chức năng:**
- Login/Signup modal với JWT token authentication
- Protected routes cho `/order` và `/track-order`
- User profile management trong Context (id, name, email)
- Auto-attach token vào mọi authenticated API requests

**Success Metrics:** 90% đăng nhập thành công lần đầu

---

#### Feature 2: Restaurant Discovery & Filtering
**Priority:** P0 (Critical)

**Chức năng:**
- Hiển thị danh sách nhà hàng dạng grid với pagination (8/page)
- **Filters:** Cuisine type, Rating (≥ 3★, 4★, 4.5★)
- **Sort:** Highest Rating, Most Reviews, Newest
- Responsive sidebar/overlay filters cho mobile
- Restaurant card: Image, Name, Cuisine, Rating, Reviews, Address

**Data Flow:** API → Filter by cuisine → Filter by rating → Sort → Paginate → Display

**Success Metrics:** 70% users sử dụng filters, <30s để tìm nhà hàng

---

#### Feature 3: Menu Display & Food Items
**Priority:** P0 (Critical)

**Chức năng:**
- Menu page theo restaurant ID với category navigation
- Food cards hiển thị: Image, Name, Description, Price, Add button
- Menu grouped theo categories với sticky navigation
- Fetch & cache menu từ API, filter items ACTIVE

**Success Metrics:** >2 phút trên menu page, 60% conversion to cart

---

#### Feature 4: Smart Cart System
**Priority:** P1 (High)

**Chức năng:**
- **Dual structure:** Simple cart + Configurable cart lines (support options)
- **Food Options Modal:** Customize size, toppings, extras với price calculation
- **Single Merchant Rule:** Validation giỏ hàng chỉ 1 nhà hàng, confirm khi thay đổi
- Cart operations: add, remove, update quantity, clear
- Item notes & option selections

**Success Metrics:** 40% đơn hàng có món customize, <5% abandonment

---

#### Feature 5: Cart Management UI
**Priority:** P1 (High)

**Chức năng:**
- **Cart Drawer:** Slide-in overlay với items list, quantity controls, summary
- **Cart Page:** Full table view với detailed editing
- Real-time price calculation: Subtotal + Delivery Fee = Total
- Empty state handling, require login để thao tác

**Success Metrics:** 80% users dùng drawer, <10% abandonment rate

---

#### Feature 6: Checkout & Order Placement
**Priority:** P0 (Critical)

**Chức năng:**
- Protected checkout page với delivery info form (auto-fill từ profile)
- Order summary với price breakdown
- Form validation: required fields, email/phone format
- Submit order → Clear cart → Navigate to tracking page

**Success Metrics:** >95% success rate, <2 phút hoàn tất checkout

---

#### Feature 7: Order Tracking
**Priority:** P1 (High)

**Chức năng:**
- Accordion view hiển thị tất cả orders của user
- Order details: Code, Status, Items, Payment summary, Timestamps
- Status flow: PENDING → PREPARING → READY → DELIVERING → COMPLETED/CANCELED
- Lazy load details khi expand accordion

**Success Metrics:** 90% users check status ít nhất 1 lần

---

#### Feature 8: Search & Responsive Design
**Priority:** P2 (Medium) / P1 (High)

**Chức năng:**
- Search bar trong Navbar với debounced input
- Search by restaurant/food name, cuisine type
- Responsive breakpoints: Mobile <768px, Tablet 768-1024px, Desktop >1024px
- Mobile optimizations: Touch-friendly UI, lazy loading, optimized bundle

**Success Metrics:** 30% users dùng search, >60% mobile traffic

---

### 2.2 Key Flows - Operational Flow

#### Sơ đồ tổng quan kiến trúc và luồng hoạt động chính:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          FOOD DELIVERY PLATFORM                                  │
│                        Frontend Architecture & Data Flow                         │
└─────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER (Browser)                                 │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐        ┌──────────────┐        ┌──────────────┐            │
│  │   User 1     │        │   User 2     │        │   User N     │            │
│  │  [Desktop]   │        │   [Mobile]   │        │   [Tablet]   │            │
│  │              │        │              │        │              │            │
│  │  - Browse    │        │  - Search    │        │  - Order     │            │
│  │  - Login     │        │  - Add Cart  │        │  - Track     │            │
│  │  - Checkout  │        │  - Checkout  │        │  - Review    │            │
│  └──────┬───────┘        └──────┬───────┘        └──────┬───────┘            │
│         │                       │                       │                     │
│         └───────────────────────┼───────────────────────┘                     │
│                                 │                                             │
│                         [HTTPS Request]                                       │
│                                 │                                             │
└─────────────────────────────────┼─────────────────────────────────────────────┘
                                  │
                                  ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        REACT SPA APPLICATION                                     │
│                        (Single Page Application)                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐            │
│  │                    PRESENTATION LAYER                            │            │
│  │                                                                  │            │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │            │
│  │  │  Navbar  │  │  Header  │  │  Footer  │  │  Search  │       │            │
│  │  │  + Cart  │  │  Banner  │  │          │  │   Bar    │       │            │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │            │
│  │                                                                 │            │
│  │  ┌─────────────────────────────────────────────────────────┐  │            │
│  │  │              PAGES (React Router)                        │  │            │
│  │  │                                                           │  │            │
│  │  │  /home          /restaurant/:id      /cart      /order   │  │            │
│  │  │  ├─Restaurant   ├─FoodDisplay        ├─Items    ├─Form   │  │            │
│  │  │  ├─Filters      ├─Categories         ├─Summary  ├─Submit │  │            │
│  │  │  └─Pagination   └─FoodItems          └─Checkout └─Pay    │  │            │
│  │  │                                                           │  │            │
│  │  │  /track-order                    /login (Modal)          │  │            │
│  │  │  ├─Orders List                   ├─Login Form            │  │            │
│  │  │  └─Order Details                 └─Signup Form           │  │            │
│  │  └─────────────────────────────────────────────────────────┘  │            │
│  │                                                                 │            │
│  │  ┌─────────────────────────────────────────────────────────┐  │            │
│  │  │                    MODALS & OVERLAYS                     │  │            │
│  │  │                                                           │  │            │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │  │            │
│  │  │  │   Login    │  │   Food     │  │    Cart    │        │  │            │
│  │  │  │   Popup    │  │  Options   │  │   Drawer   │        │  │            │
│  │  │  │            │  │   Modal    │  │ (Slide-in) │        │  │            │
│  │  │  └────────────┘  └────────────┘  └────────────┘        │  │            │
│  │  └─────────────────────────────────────────────────────────┘  │            │
│  └──────────────────────────────────────────────────────────────┘            │
│                                   ↕                                            │
│  ┌─────────────────────────────────────────────────────────────────┐          │
│  │                    STATE MANAGEMENT LAYER                        │          │
│  │                                                                  │          │
│  │              ┌────────────────────────────────┐                 │          │
│  │              │      StoreContext (Context API) │                 │          │
│  │              │                                 │                 │          │
│  │              │  ┌──────────────────────────┐  │                 │          │
│  │              │  │   Global State:          │  │                 │          │
│  │              │  │   - token (JWT)          │  │                 │          │
│  │              │  │   - user (profile)       │  │                 │          │
│  │              │  │   - restaurants[]        │  │                 │          │
│  │              │  │   - foods[]              │  │                 │          │
│  │              │  │   - cartItems{}          │  │                 │          │
│  │              │  │   - cartLines[]          │  │                 │          │
│  │              │  └──────────────────────────┘  │                 │          │
│  │              │                                 │                 │          │
│  │              │  ┌──────────────────────────┐  │                 │          │
│  │              │  │   Actions/Methods:       │  │                 │          │
│  │              │  │   - addToCart()          │  │                 │          │
│  │              │  │   - removeFromCart()     │  │                 │          │
│  │              │  │   - updateCartLineQty()  │  │                 │          │
│  │              │  │   - clearCart()          │  │                 │          │
│  │              │  │   - login/logout()       │  │                 │          │
│  │              │  └──────────────────────────┘  │                 │          │
│  │              └────────────────────────────────┘                 │          │
│  └──────────────────────────────────────────────────────────────────┘          │
│                                   ↕                                            │
│  ┌─────────────────────────────────────────────────────────────────┐          │
│  │                      API SERVICE LAYER                           │          │
│  │                                                                  │          │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │          │
│  │  │  apiClient   │  │ restaurantAPI│  │   menuAPI    │         │          │
│  │  │  (Axios)     │  │              │  │              │         │          │
│  │  │              │  │ - fetch      │  │ - fetchMenu  │         │          │
│  │  │ - Base URL   │  │   merchants  │  │   byMerchant │         │          │
│  │  │ - Interceptor│  │              │  │              │         │          │
│  │  │ - JWT Auth   │  └──────────────┘  └──────────────┘         │          │
│  │  └──────────────┘                                               │          │
│  │                                                                  │          │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │          │
│  │  │   cartAPI    │  │   orderAPI   │  │   userAPI    │         │          │
│  │  │              │  │              │  │              │         │          │
│  │  │ - validate   │  │ - createOrder│  │ - login()    │         │          │
│  │  │   WhenAdding │  │ - getOrders  │  │ - register() │         │          │
│  │  │              │  │ - getOrderById│  │              │         │          │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │          │
│  └──────────────────────────────────────────────────────────────────┘          │
│                                   ↕                                            │
│  ┌─────────────────────────────────────────────────────────────────┐          │
│  │                        UTILITIES LAYER                           │          │
│  │                                                                  │          │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │          │
│  │  │  cookieUtils   │  │ formatCurrency │  │   assets       │   │          │
│  │  │  - getCookie() │  │  - formatVND() │  │   - images     │   │          │
│  │  │  - setCookie() │  │                │  │   - icons      │   │          │
│  │  │  - deleteCookie│  │                │  │                │   │          │
│  │  └────────────────┘  └────────────────┘  └────────────────┘   │          │
│  └──────────────────────────────────────────────────────────────────┘          │
│                                                                                │
└────────────────────────────────────┬───────────────────────────────────────────┘
                                     │
                            [REST API Calls]
                                     │
                                     ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND API SERVER                                      │
│                        (External System - Not in scope)                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │                        API ENDPOINTS                                    │    │
│  │                                                                          │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │    │
│  │  │ Authentication   │  │  Restaurant APIs │  │    Menu APIs     │    │    │
│  │  │                  │  │                  │  │                  │    │    │
│  │  │ POST /auth/login │  │ GET /merchants   │  │ GET /menu-items  │    │    │
│  │  │ POST /auth/      │  │                  │  │   /merchant/:id  │    │    │
│  │  │      register    │  │                  │  │                  │    │    │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘    │    │
│  │                                                                         │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │    │
│  │  │   Cart APIs      │  │   Order APIs     │  │   Database       │    │    │
│  │  │                  │  │                  │  │                  │    │    │
│  │  │ POST /cart       │  │ POST /check-out  │  │  - Users         │    │    │
│  │  │   ?menuItemId=.. │  │ GET /my-orders   │  │  - Merchants     │    │    │
│  │  │                  │  │ GET /my-orders   │  │  - Menu Items    │    │    │
│  │  │ (Validation)     │  │     /:id         │  │  - Orders        │    │    │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘    │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘


════════════════════════════════════════════════════════════════════════════════
                            MAIN USER FLOWS
════════════════════════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────────────────────────┐
│  FLOW 1: BROWSE & DISCOVERY                                                   │
└──────────────────────────────────────────────────────────────────────────────┘

User → Homepage → [GET /merchants] → Restaurant List → Apply Filters
  ↓                                                           ↓
  │                                                    (Cuisine, Rating, Sort)
  │                                                           ↓
  └──────────────→ Click Restaurant Card → Navigate to /restaurant/:id


┌──────────────────────────────────────────────────────────────────────────────┐
│  FLOW 2: MENU BROWSING & ADD TO CART                                         │
└──────────────────────────────────────────────────────────────────────────────┘

Restaurant Page → [GET /menu-items/merchant/:id] → Display Menu
  ↓
  ├─→ Simple Item → Click "+" → Check Login → Check Same Restaurant
  │                                               ↓
  │                                          Add to cartItems{}
  │
  └─→ Item with Options → Click Item → Open Food Options Modal
                                          ↓
                                    Select: Size, Toppings, Note
                                          ↓
                                    [POST /cart?menuItemId=...] (Validate)
                                          ↓
                                    Add to cartLines[]
                                          ↓
                                    Update Cart Badge


┌──────────────────────────────────────────────────────────────────────────────┐
│  FLOW 3: CART MANAGEMENT                                                      │
└──────────────────────────────────────────────────────────────────────────────┘

Click Cart Icon → Check Login → Open Cart Drawer
  ↓
  ├─→ View Items → Modify Quantity (+/-) → Update cartItems/cartLines
  │
  ├─→ Remove Item → Confirm → removeFromCart() / removeCartLine()
  │
  ├─→ Clear All → Confirm → clearCart()
  │
  └─→ Proceed to Checkout → Navigate to /order


┌──────────────────────────────────────────────────────────────────────────────┐
│  FLOW 4: CHECKOUT & ORDER PLACEMENT                                          │
└──────────────────────────────────────────────────────────────────────────────┘

/order Page → Check Login & Cart → Display Checkout Form
  ↓
Fill Delivery Info (Auto-fill from profile) → Review Order Summary
  ↓
Click "Place Order" → Validate Form → [POST /check-out]
  ↓
Success → Clear Cart → Navigate to /track-order?code={orderCode}


┌──────────────────────────────────────────────────────────────────────────────┐
│  FLOW 5: ORDER TRACKING                                                       │
└──────────────────────────────────────────────────────────────────────────────┘

/track-order → Check Login → [GET /my-orders] → Display Orders List (Accordion)
  ↓
Click Order → Expand Accordion → [GET /my-orders/:id] → Display Details
  ↓
Show: Status, Items, Payment Summary, Timestamps

Status Flow: PENDING → PREPARING → READY → DELIVERING → COMPLETED
                                                    ↓
                                               CANCELED


┌──────────────────────────────────────────────────────────────────────────────┐
│  FLOW 6: AUTHENTICATION                                                       │
└──────────────────────────────────────────────────────────────────────────────┘

Click Login → Open Login Modal
  ↓
  ├─→ Login: Enter Email & Password → [POST /auth/login]
  │                                          ↓
  │                                    Receive JWT Token
  │                                          ↓
  │                                    Store in Cookie
  │                                          ↓
  │                                    Update StoreContext
  │
  └─→ Signup: Enter Name, Email, Password → [POST /auth/register]
                                                  ↓
                                            Auto Login with Token

Logout: Click Logout → Delete Cookie → Clear Context → Redirect to Home


════════════════════════════════════════════════════════════════════════════════
                         DATA FLOW SUMMARY
════════════════════════════════════════════════════════════════════════════════

┌─────────┐     Request      ┌─────────┐    Process     ┌──────────┐
│  User   │ ══════════════> │ React   │ ═════════════> │  State   │
│ Actions │                  │   UI    │                │ Context  │
└─────────┘                  └─────────┘                └──────────┘
     ↑                            ↕                           ↕
     │                       ┌─────────┐                 ┌──────────┐
     │      Response         │   API   │    API Call     │ Backend  │
     └═══════════════════════│ Service │ ═══════════════>│   API    │
                             └─────────┘                 └──────────┘

```

---

### 2.3 Future Considerations

**Phase 2 (3-6 tháng):**
- Real-time tracking với WebSocket & map integration
- Advanced filters: price range, delivery time, dietary preferences
- Personalization: recommendations, favorites, re-order
- Payment integration: Cards, E-wallets (MoMo, ZaloPay), COD
- Rating & reviews system với photo uploads

**Phase 3 (6-12 tháng):**
- Advanced user profile: multiple addresses, saved payments
- Merchant admin portal: menu management, order updates, analytics
- PWA features: offline mode, push notifications, add to home screen
- AI/ML: smart search, predictive delivery time, fraud detection
- Accessibility & i18n: WCAG compliance, multi-language support

---

## 3. Technical Architecture

### 3.1 Component Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar/         # Navigation with cart & auth
│   ├── Footer/         # Site footer
│   ├── Header/         # Hero banner
│   ├── SearchBar/      # Search functionality
│   ├── ExploreMenu/    # Category carousel
│   ├── RestaurantDisplay/  # Restaurant grid
│   ├── Sidebar/        # Filters sidebar
│   ├── FoodDisplay/    # Menu items grid
│   ├── FoodItem/       # Individual food card
│   ├── FoodOptionsModal/  # Customization modal
│   ├── CartDrawer/     # Slide-in cart
│   ├── LoginPopup/     # Auth modal
│   └── ProtectedRoute/ # Auth guard
│
├── pages/              # Route-level pages
│   ├── Home/          # Landing & restaurant discovery
│   ├── Restaurant/    # Restaurant detail & menu
│   ├── Cart/          # Full cart page
│   ├── PlaceOrder/    # Checkout page
│   └── TrackOrder/    # Order tracking
│
├── context/
│   └── StoreContext.jsx  # Global state management
│
├── services/           # API layer
│   ├── apiClient.js   # Axios instance & interceptors
│   ├── restaurantAPI.js
│   ├── menuAPI.js
│   ├── cartAPI.js
│   ├── orderAPI.js
│   └── userAPI.js
│
├── utils/
│   ├── cookieUtils.js     # Cookie helpers
│   └── formatCurrency.js  # VND formatter
│
└── assets/            # Static assets & data
    ├── assets.js      # Image imports
    └── itemOptions.js # Options configuration
```

### 3.2 State Management

**Global State (StoreContext):**
- `token`: JWT auth token
- `user`: User profile object
- `restaurants`: Array of restaurants
- `foods`: Array of food items (aggregated menu)
- `cartItems`: Legacy cart object
- `cartLines`: Configured cart items array
- Methods: addToCart, removeFromCart, addCartLine, updateCartLineQty, clearCart, etc.

**Local State:**
- Component-specific UI state
- Form inputs
- Modal visibility
- Loading & error states

### 3.3 API Integration Pattern

```javascript
// Service layer handles all API calls
const restaurantAPI = {
  async fetchActiveMerchants(signal) {
    const response = await getPublicApi().get("/merchants", { signal });
    return normalizeData(response.data);
  }
};

// Components consume services via Context or direct import
const { restaurants } = useContext(StoreContext);

// Error handling at service level
try {
  const data = await orderAPI.createOrder(payload);
  // success flow
} catch (error) {
  // show user-friendly error
  alert(error.message || "Có lỗi xảy ra");
}
```

### 3.4 Authentication Flow

```
1. User enters credentials → LoginPopup
2. Call userAPI.login() or userAPI.register()
3. Receive token + user profile
4. Store token in cookie (setCookie)
5. Update Context: setToken(token, userProfile)
6. Attach token to apiClient headers
7. Protected routes check token validity
8. API interceptor auto-attaches token to requests
```

### 3.5 Build & Deployment

- **Build Tool:** Vite 7.x (fast HMR, optimized production builds)
- **Dev Server:** `npm run dev` on port 5173
- **Production Build:** `npm run build` → generates optimized static files
- **Preview:** `npm run preview` để test production build locally
- **Linting:** ESLint với React plugins
- **Testing:** Vitest (configured but not fully implemented)

---

## 4. Non-Functional Requirements

### 4.1 Performance
- Initial page load: < 3 seconds
- Time to Interactive: < 3 seconds
- API response time: < 500ms
- Smooth animations: 60fps
- Bundle size: < 500KB (gzipped)

### 4.2 Security
- HTTPS only
- JWT token với secure HttpOnly cookies
- XSS protection via React's built-in escaping
- CSRF protection
- Input validation & sanitization
- No sensitive data in localStorage

### 4.3 Scalability
- Handle 10,000+ concurrent users
- Support 1,000+ restaurants
- Support 50,000+ menu items
- Efficient data fetching with pagination
- CDN for static assets

### 4.4 Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

### 4.5 Accessibility
- Semantic HTML
- Alt text cho images
- Keyboard navigation
- Focus indicators
- ARIA labels where needed

---

## 5. Success Metrics & KPIs

### User Engagement
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Session duration > 5 minutes
- Pages per session > 4

### Conversion Funnel
- Homepage → Restaurant page: 60%
- Restaurant page → Add to cart: 40%
- Cart → Checkout: 70%
- Checkout → Order placed: 90%

### Business Metrics
- Order completion rate > 65%
- Average order value (AOV) > 100,000 VND
- Repeat order rate > 40% within 30 days
- Cart abandonment rate < 30%

### Technical Metrics
- Error rate < 1%
- API success rate > 99%
- Uptime > 99.5%
- Page load time < 3s for 95th percentile

---

## 6. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Backend API downtime | High | Medium | Implement retry logic, fallback to cached data, show meaningful error messages |
| Cart sync issues | Medium | Medium | Validate cart với backend trước checkout, implement cart recovery |
| Authentication failures | High | Low | Clear error messages, token refresh mechanism, logout/re-login flow |
| Performance degradation | Medium | Medium | Code splitting, lazy loading, image optimization, CDN usage |
| Browser compatibility | Low | Low | Polyfills, progressive enhancement, testing on target browsers |
| Security vulnerabilities | High | Low | Regular dependency updates, security audits, follow OWASP guidelines |

---

## 7. Dependencies & Integrations

### Frontend Dependencies
- **react**: ^19.1.1 - UI library
- **react-dom**: ^19.1.1 - React rendering
- **react-router-dom**: ^7.9.1 - Routing
- **axios**: ^1.12.2 - HTTP client
- **vite**: ^7.1.2 - Build tool
- **eslint**: ^9.33.0 - Code linting

### Backend API Endpoints (Expected)
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /merchants` - Fetch restaurants
- `GET /menu-items/merchant/:id` - Fetch menu by merchant
- `POST /cart?menuItemId=...` - Validate cart
- `POST /check-out` - Create order
- `GET /my-orders` - Fetch user orders
- `GET /my-orders/:id` - Fetch order details

### Environment Variables
```bash
VITE_API_BASE_URL=/potato-api
```

---

## 8. Timeline & Roadmap

### Completed (Current State)
- ✅ Project setup with Vite + React
- ✅ Authentication system
- ✅ Restaurant discovery & filtering
- ✅ Menu display
- ✅ Cart management (dual structure)
- ✅ Configurable items với options
- ✅ Checkout flow
- ✅ Order tracking
- ✅ Responsive design

### Next Sprint (Sprint 1 - Weeks 1-2)
- [ ] Implement search functionality
- [ ] Add loading skeletons
- [ ] Error boundary components
- [ ] Toast notifications system

### Sprint 2 (Weeks 3-4)
- [ ] Payment gateway integration
- [ ] Promo code functionality
- [ ] Enhanced form validation
- [ ] Unit tests với Vitest

### Sprint 3 (Weeks 5-6)
- [ ] Rating & review system
- [ ] User profile page
- [ ] Order history filters
- [ ] Performance optimizations

---

## 9. Appendix

### Design Principles
1. **User-Centric:** Every feature phục vụ user needs
2. **Simplicity:** Giảm cognitive load, rõ ràng và dễ hiểu
3. **Consistency:** UI patterns nhất quán trên toàn app
4. **Feedback:** Luôn có feedback cho user actions
5. **Error Prevention:** Validate và guide user để tránh lỗi

### Code Standards
- **Naming:** camelCase cho variables/functions, PascalCase cho components
- **File Structure:** One component per file, co-locate CSS
- **Comments:** JSDoc cho functions phức tạp, inline comments cho business logic
- **Error Handling:** Try-catch cho async operations, user-friendly error messages
- **Performance:** Memoization với useMemo/useCallback khi cần, avoid unnecessary re-renders

### Testing Strategy
- **Unit Tests:** Test utility functions và pure logic
- **Integration Tests:** Test API services
- **Component Tests:** Test component rendering và interactions
- **E2E Tests:** Test critical user flows (future)

---

**Document Owner:** Development Team  
**Last Updated:** November 8, 2025  
**Next Review:** December 8, 2025

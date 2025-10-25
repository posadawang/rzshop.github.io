# 阿智小舖 - 遊戲帳號電商網站

一個完整的電商網站，專為遊戲帳號交易設計，包含商品展示、購物車、用戶系統和藍新金流整合。

## 🚀 功能特色

### 前端功能
- ✅ 響應式設計，支援手機、平板、電腦
- ✅ 商品分類瀏覽（部落衝突、荒野亂鬥、皇室戰爭、其他遊戲）
- ✅ 商品搜尋功能
- ✅ 商品詳情頁面
- ✅ 購物車功能
- ✅ 用戶登入/註冊系統
- ✅ 結帳流程
- ✅ 訂單管理

### 後端整合
- ✅ 藍新金流支付整合
- ✅ 用戶認證系統
- ✅ 訂單處理系統
- ✅ 安全交易保障

## 📁 專案結構

```
rzshop-local/
├── index.html              # 首頁
├── checkout.html           # 結帳頁面
├── order-complete.html     # 訂單完成頁面
├── return.html             # 付款回調頁面
├── assets/
│   ├── css/
│   │   ├── style.css       # 主要樣式
│   │   └── checkout.css    # 結帳頁面樣式
│   ├── js/
│   │   ├── app.js          # 主要功能
│   │   ├── checkout.js     # 結帳功能
│   ├── order-complete.js  # 訂單完成功能
│   │   └── payment-return.js # 付款回調處理
│   ├── data/
│   │   └── products.json   # 商品資料
│   └── images/            # 商品圖片
├── api/
│   ├── login.php          # 登入API
│   └── register.php       # 註冊API
└── README.md              # 說明文件
```

## 🛠️ 安裝與設定

### 1. 環境需求
- PHP 7.4+ (用於API)
- 現代瀏覽器 (Chrome, Firefox, Safari, Edge)
- 本地伺服器 (Apache, Nginx, 或 PHP內建伺服器)

### 2. 快速開始

#### 方法一：使用PHP內建伺服器
```bash
# 進入專案目錄
cd rzshop-local

# 啟動PHP伺服器
php -S localhost:8000
```

#### 方法二：使用Apache/Nginx
將專案檔案放到網站根目錄，確保PHP支援已啟用。

### 3. 藍新金流設定

在 `assets/js/app.js` 和 `assets/js/checkout.js` 中修改以下設定：

```javascript
const NEWEBPAY_CONFIG = {
    MerchantID: '您的商店代碼',        // 替換為您的商店代碼
    HashKey: '您的HashKey',          // 替換為您的HashKey
    HashIV: '您的HashIV',            // 替換為您的HashIV
    ReturnURL: 'https://您的網域/return.html',
    NotifyURL: 'https://您的網域/notify.html',
    CustomerURL: 'https://您的網域/customer.html'
};
```

## 🎮 使用說明

### 1. 瀏覽商品
- 在首頁選擇遊戲分類
- 使用搜尋功能尋找特定商品
- 點擊商品查看詳細資訊

### 2. 購物流程
1. **加入購物車**：點擊商品旁的購物車圖示
2. **查看購物車**：點擊右上角購物車圖示
3. **結帳**：填寫收件人資訊，選擇付款方式
4. **付款**：使用藍新金流完成付款
5. **完成**：查看訂單確認頁面

### 3. 用戶功能
- **註冊**：點擊右上角「註冊」按鈕
- **登入**：使用註冊的帳號密碼登入
- **查看訂單**：登入後可查看訂單記錄

## 🔧 自訂設定

### 1. 修改商品資料
編輯 `assets/data/products.json` 檔案：

```json
{
  "id": "商品ID",
  "category": "商品分類",
  "title": "商品標題",
  "price": 價格,
  "originalPrice": 原價,
  "description": "商品描述",
  "thumbnail": "縮圖路徑",
  "gallery": ["圖片1", "圖片2"],
  "stock": 庫存數量,
  "tags": ["標籤1", "標籤2"],
  "rating": 評分,
  "reviews": 評價數量,
  "featured": 是否為熱門商品
}
```

### 2. 修改網站資訊
- 編輯 `index.html` 中的網站標題和描述
- 修改 `assets/css/style.css` 中的顏色主題
- 更新 `assets/images/` 中的圖片

### 3. 藍新金流整合
1. 申請藍新金流帳號
2. 取得商店代碼、HashKey、HashIV
3. 修改JavaScript中的設定
4. 設定回調URL

## 🔒 安全注意事項

1. **HTTPS**：生產環境請使用HTTPS
2. **API安全**：實作適當的API驗證
3. **資料驗證**：所有用戶輸入都應驗證
4. **敏感資料**：不要在前端暴露敏感資訊

## 📱 響應式設計

網站已針對以下裝置優化：
- 手機 (320px+)
- 平板 (768px+)
- 桌面 (1024px+)

## 🐛 常見問題

### Q: 圖片無法顯示？
A: 確保圖片路徑正確，或使用placeholder圖片

### Q: 購物車資料遺失？
A: 檢查瀏覽器是否支援localStorage

### Q: 藍新金流付款失敗？
A: 檢查商店代碼和HashKey設定是否正確

### Q: 用戶登入問題？
A: 檢查API檔案是否正確放置，PHP是否正常運作

## 📞 技術支援

如有問題，請檢查：
1. 瀏覽器控制台錯誤訊息
2. PHP錯誤日誌
3. 網路連線狀態
4. 檔案權限設定

## 📄 授權

本專案僅供學習和展示用途，請勿用於商業用途。

---

**注意**：這是一個演示專案，實際部署時請確保所有安全措施都已實作。

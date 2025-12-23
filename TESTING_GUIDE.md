# 🎮 Hướng Dẫn Test Game

## ✅ CÁC LỖI ĐÃ SỬA

### 1. **Game Mode (Trình duyệt khác nhau)**
- ❌ **Trước**: Player 1 vừa join là game tự động bắt đầu
- ✅ **Sau**: Cả 2 players phải join xong, sau đó bấm nút **"START GAME"** để bắt đầu

### 2. **Test Mode (?test=true)**
- ❌ **Trước**: Player 2 không thấy bài của mình
- ✅ **Sau**: Mỗi player thấy bài của mình
- ❌ **Trước**: Không có nút bắt đầu ván mới khi game over
- ✅ **Sau**: Có nút **"NEW GAME"** sau khi game over

---

## 🚀 CÁCH CHẠY VÀ TEST

### **Bước 1: Chạy Backend**
```powershell
cd backend
npm start
```
Thấy: `🎮 Poker-Roulette server running on port 3001`

### **Bước 2: Chạy Frontend**
```powershell
cd frontend
npm start
```
Trình duyệt tự động mở `http://localhost:3000`

---

## 🎯 CÁCH TEST - GAME MODE (Normal)

### **Phương pháp 1: Dùng 2 trình duyệt**
1. **Chrome**: `http://localhost:3000` → Nhập "Player1" → Enter
2. **Firefox**: `http://localhost:3000` → Nhập "Player2" → Enter
3. Cả 2 players thấy thông báo "Both players ready!"
4. **Bất kỳ player nào bấm "START GAME"** → Game bắt đầu
5. Chơi đến khi có người chết → Bấm **"NEW GAME"** để chơi lại

### **Phương pháp 2: Dùng Incognito**
1. **Tab thường**: `http://localhost:3000` → "Player1"
2. **Tab Incognito** (Ctrl+Shift+N): `http://localhost:3000` → "Player2"
3. Bấm **"START GAME"** để bắt đầu

---

## 🧪 CÁCH TEST - TEST MODE (Nhiều player trong 1 trình duyệt)

1. Mở: `http://localhost:3000?test=true`
2. Bấm **"➕ Add Player"** 2 lần
3. Bạn sẽ thấy 2 màn hình game cạnh nhau
4. Mỗi player có bài riêng và có thể thao tác độc lập
5. Khi game over, cả 2 player đều có nút **"🔄 NEW GAME"**

---

## 🎲 FLOW GAME MỚI

```
1. Player 1 join → Waiting...
2. Player 2 join → Both ready!
3. Bất kỳ ai bấm "START GAME" → Game bắt đầu
4. Ante (1 bullet mỗi người)
5. Pre-flop → Flop → Turn → River
6. Showdown → Loser bắn
7. Nếu sống → Tự động bắt đầu hand mới
8. Nếu chết → Game Over → Bấm "NEW GAME" để chơi lại
```

---

## 🔍 KIỂM TRA TÍNH NĂNG

### ✅ Game Mode
- [ ] Player 1 join → không tự động bắt đầu
- [ ] Player 2 join → hiện nút "START GAME"
- [ ] Bấm START → game bắt đầu đúng
- [ ] Player 2 thấy được bài của mình
- [ ] Game over → có nút "NEW GAME"
- [ ] Bấm NEW GAME → reset về waiting

### ✅ Test Mode
- [ ] Add 2 players → 2 màn hình độc lập
- [ ] Player 2 thấy được bài
- [ ] Game over → cả 2 có nút NEW GAME
- [ ] Bấm NEW GAME → reset thành công

### ✅ Viewer Mode
- [ ] Player thứ 3 join → chế độ viewer
- [ ] Viewer không có nút action
- [ ] Viewer thấy được tất cả bài sau showdown

---

## 🐛 NẾU GẶP LỖI

### Backend không chạy
```powershell
cd backend
npm install
npm start
```

### Frontend không chạy
```powershell
cd frontend
npm install
npm start
```

### Port bị chiếm
- Backend: Đổi port trong `backend/server.js` (dòng `const PORT`)
- Frontend: Tạo file `.env` trong `frontend/` với nội dung:
  ```
  PORT=3001
  ```

---

## 💡 LƯU Ý

1. **Cả 2 players đều có thể bấm START GAME** (không phải chỉ host)
2. **Cả 2 players đều có thể bấm NEW GAME** sau khi game over
3. Player nào disconnect → game reset về WAITING
4. Bullets reset về 8/8 khi bắt đầu game mới

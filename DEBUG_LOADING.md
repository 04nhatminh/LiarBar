# Debug Guide - Sửa lỗi Loading

## 🔍 Các bước debug:

### 1. Kiểm tra Backend logs
```powershell
cd backend
npm start
```

Xem log khi join:
- `Client connected: xxx`
- `nickname joined as player1/player2`
- `Sending game_state to xxx`

### 2. Kiểm tra Frontend console (F12)
Mở Developer Tools → Console tab

Xem log:
- `Setting up socket listeners`
- `Joining game as: xxx`
- `Received game state: {...}`

### 3. Nếu không thấy "Received game state"

**Kiểm tra:**
- Backend có chạy không? (http://localhost:3001/health)
- Socket có connect không? → Xem "Connecting to server..." hay "Loading game..."

## ✅ Test nhanh:

1. **Stop tất cả terminal** (Ctrl+C)

2. **Xóa cache browser**:
   - Chrome: Ctrl+Shift+Delete → Clear cache
   - Hoặc: Mở Incognito (Ctrl+Shift+N)

3. **Chạy lại backend**:
```powershell
cd backend
npm start
```

4. **Chạy lại frontend** (terminal mới):
```powershell
cd frontend
npm start
```

5. **Test**:
   - Mở http://localhost:3000
   - Nhập nickname → Enter
   - Xem console logs (F12)

## 🐛 Nếu vẫn bị:

### Check 1: Backend running?
```powershell
curl http://localhost:3001/health
```
Phải trả về: `{"status":"ok","players":0}`

### Check 2: Port conflicts?
Đổi port backend nếu cần trong `server.js`:
```javascript
const PORT = process.env.PORT || 3002;
```

### Check 3: CORS issues?
Xem console có lỗi CORS không.

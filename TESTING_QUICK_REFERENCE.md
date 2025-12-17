# Real-Time Messaging - Testing Quick Reference

**Use this guide for quick setup and common test commands**

---

## Quick Start (5 Minutes)

### 1. Start Backend
```bash
cd backend
npm run dev
# Should see: "Server running on http://localhost:8000"
```

### 2. Start Frontend (Tab 1)
```bash
cd frontend
npm run dev
# Should see: "VITE...ready in XXX ms"
```

### 3. Open Two Browsers
```
Browser A: http://localhost:5173 → Login as User1
Browser B: http://localhost:5173 → Login as User2
```

### 4. Test Message
```
A: Click User2 → Type "Hello" → Send
B: Verify message appears instantly
```

---

## What to Look For in Logs

### Browser Console (F12)
```javascript
✅ Good signs:
  "Socket connected successfully: [socket-id]"
  "Received direct message: [message-object]"
  "Adding message to chat - Valid for current conversation"

❌ Bad signs:
  "Socket disconnected"
  "connect_error"
  "Error: Cannot read property..."
```

### Backend Console
```
✅ Good signs:
  "✅ [CONNECTION] User connected"
  "✅ Message saved to DB with ID:"
  "📨 Emitting real-time message to receiver"
  "✅ Real-time message emitted successfully"

❌ Bad signs:
  "❌ Error in send_direct_message"
  "Receiver is OFFLINE" (if receiver should be online)
  "NOT FOUND" (for socket ID or receiver)
```

---

## Cross-System Testing Setup

### If Users on Different Machines

**Find Your IP:**
```bash
# On Windows
ipconfig

# On Mac/Linux
ifconfig

# Look for IPv4 Address (e.g., 192.168.1.100)
```

**Update Backend CORS:**
```javascript
// backend/index.js - Lines 25-29 and 31-36

// Change this:
origin: "http://localhost:5173"

// To this (example):
origin: ["http://localhost:5173", "http://192.168.1.100:5173"]

// Or allow all (dev only):
origin: "*"
```

**Restart Backend:**
```bash
npm run dev
```

**On Other Machine:**
```
Open: http://192.168.1.100:5173
(Replace IP with actual IP from ipconfig)
```

---

## Offline Message Testing

### Step-by-Step

```
1. Browser A: Open User1 chat with User2
2. Browser B: Open User2 chat with User1
3. Browser B: Close entire browser window
4. Browser A: Send 3 messages to User2
5. Browser A: Backend logs should show:
   "⚠️ Receiver is OFFLINE"
   "Message stored in database for delivery"
6. Browser B: Reopen and login as User2
7. Browser B: User1 should show "3" unread badge
8. Browser B: Click User1
9. Verify: All 3 messages appear with timestamps
```

---

## Common Issues & Quick Fixes

### Issue: "Socket disconnected" in Console

**Fix:**
```bash
1. Refresh browser (Ctrl+F5)
2. Restart backend server
3. Check if backend is running on port 8000
```

### Issue: Messages Appear Only After Page Refresh

**Fix:**
```bash
1. Check Backend logs for: "Receiver Socket ID: NOT FOUND"
2. If showing NOT FOUND, receiver socket not registered
3. Solution: Ensure both users online and socket connected
4. Look for: "✅ User registered in activeUsers map"
```

### Issue: CORS Error in Network Tab (F12)

**Fix:**
```bash
1. Check backend/index.js line 26 and 33
2. Add your frontend URL to CORS origins
3. Restart backend
4. Clear browser cache (Ctrl+Shift+Delete)
5. Refresh frontend (Ctrl+F5)
```

### Issue: "Receiver not found" Error

**Fix:**
```bash
1. Check if User ID is correct
2. Verify user exists in database:
   SELECT * FROM users WHERE id = 'user-id';
3. Check user is logged in properly
```

---

## Database Queries for Testing

### Check All Messages
```sql
SELECT id, sender_id, receiver_id, content, is_read, created_at
FROM messages
WHERE group_id IS NULL
ORDER BY created_at DESC
LIMIT 20;
```

### Check Unread Messages for User
```sql
SELECT id, sender_id, content, created_at
FROM messages
WHERE receiver_id = 'USER_ID'
AND is_read = false
AND group_id IS NULL
ORDER BY created_at DESC;
```

### Check User Online Status
```sql
SELECT id, user_name, is_online, last_seen
FROM users
WHERE user_name IN ('User1', 'User2')
ORDER BY last_seen DESC;
```

### Mark All Messages as Read (for testing)
```sql
UPDATE messages
SET is_read = true
WHERE receiver_id = 'USER_ID';
```

---

## Console Debugging (Browser F12)

### Check Socket Status
```javascript
// Paste in console:
socket.connected          // true/false
socket.id                 // shows socket ID
socket.io._reconnection   // reconnection status
```

### Listen to All Socket Events (Debug)
```javascript
// Paste in console:
socket.onAny((event, ...args) => {
  console.log(`Socket event: ${event}`, args);
});
```

### Manually Send a Message (Testing)
```javascript
// Paste in console (change IDs):
socket.emit("send_direct_message", {
  receiverId: "user-2-id-here",
  content: "Test message from console"
});
```

### Check Active Users (Requires Debug Endpoint)
```javascript
// Paste in console (if endpoint added):
fetch('http://localhost:8000/debug/active-users')
  .then(r => r.json())
  .then(console.log);
```

---

## Performance Testing

### Stress Test - 100 Rapid Messages

```javascript
// Browser A console:
for(let i = 0; i < 100; i++) {
  setTimeout(() => {
    socket.emit("send_direct_message", {
      receiverId: "user-2-id",
      content: `Rapid message ${i}`
    });
  }, i * 50);  // Send one every 50ms
}
```

**Expected Results:**
- All 100 messages arrive
- No duplicates
- Correct order maintained
- Backend handles without crashing

---

## Quick Test Checklist

### ✅ Single System (Both Users on Localhost)
- [ ] User A sends message to User B
- [ ] Message appears instantly in User B
- [ ] User B sends message back
- [ ] Message appears instantly in User A
- [ ] No errors in console

### ✅ Cross System (Users on Different Machines)
- [ ] Ping between machines works
- [ ] CORS configured in backend
- [ ] User A can see User B's name in list
- [ ] Send test message
- [ ] Verify appears on other machine < 500ms
- [ ] No CORS errors in Network tab

### ✅ Offline Delivery
- [ ] User B goes offline (close browser)
- [ ] User A sends message
- [ ] Backend logs: "Receiver is OFFLINE"
- [ ] User B comes online
- [ ] Message appears with unread count
- [ ] All previous messages appear

### ✅ Group Messaging
- [ ] Create group with 2 users
- [ ] Both users open group
- [ ] User A sends group message
- [ ] User B receives instantly
- [ ] Message shows correct sender name

### ✅ Error Handling
- [ ] Stop backend server
- [ ] Try to send message
- [ ] See error alert
- [ ] Restart backend
- [ ] Messages work again

---

## Production Pre-Launch Checklist

Before deploying to production, verify:

```
Functionality:
  [ ] All 8 test cases from REALTIME_MESSAGING_PRODUCTION_GUIDE.md passed
  [ ] No console errors in F12
  [ ] No red errors in backend terminal
  [ ] Database has test messages
  [ ] Unread counts working
  [ ] Cross-system tested and working

Configuration:
  [ ] CORS origins updated for production domain
  [ ] Socket.io port (8000) accessible externally
  [ ] Frontend URL points to production backend
  [ ] Environment variables (.env) configured
  [ ] Database connection verified
  [ ] JWT_SECRET is strong (min 32 chars)

Security:
  [ ] No hardcoded passwords in code
  [ ] Environment variables used for secrets
  [ ] HTTPS enabled (production)
  [ ] SSL certificate valid
  [ ] CORS restricts to known domains
  [ ] Input validation on all endpoints
  [ ] Rate limiting on message sending

Performance:
  [ ] Database indexes created
  [ ] Message delivery < 100ms locally
  [ ] No memory leaks in long sessions
  [ ] Backend doesn't crash under load
  [ ] Connection recovery works

Monitoring:
  [ ] Error logging configured (Sentry/LogRocket)
  [ ] Performance monitoring setup
  [ ] Database backups scheduled
  [ ] Logs monitored daily first week
  [ ] Alert system configured
```

---

## One-Line Test Commands

```bash
# Check backend running
curl http://localhost:8000

# Check if port 8000 open (Windows)
netstat -tuln | findstr :8000

# Check if port 8000 open (Mac/Linux)
lsof -i :8000

# Restart backend
npm run dev

# View database (if psql available)
psql postgresql://user:pass@localhost/chatdb

# Kill process on port 8000 (if stuck)
# Windows:
netstat -tuln | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti :8000 | xargs kill -9
```

---

## Emergency Debugging

If messages completely not working:

1. **Check Backend Logs:**
   ```bash
   Look for: "User connected" logs
   If NO logs = socket connection failing
   If logs present = connection working
   ```

2. **Check Socket Connection:**
   ```javascript
   // Browser console:
   socket.connected  // Must be true
   ```

3. **Check Database:**
   ```sql
   -- Messages saved?
   SELECT COUNT(*) FROM messages;

   -- Users exist?
   SELECT * FROM users LIMIT 5;
   ```

4. **Check CORS:**
   ```javascript
   // Browser Network tab (F12)
   Look for: Response headers with "Access-Control-Allow-Origin"
   ```

5. **Check JWT:**
   ```javascript
   // Browser console:
   localStorage.getItem("token")  // Should show token
   ```

If all above looks good but still broken, restart everything:
```bash
1. Kill backend (Ctrl+C)
2. Kill frontend dev server (Ctrl+C)
3. Clear browser cache (Ctrl+Shift+Delete)
4. npm run dev (backend)
5. npm run dev (frontend in new terminal)
6. Refresh browser (Ctrl+F5)
```

---

## Need More Help?

Check these files for detailed information:

- **REALTIME_MESSAGING_PRODUCTION_GUIDE.md** - Full testing procedures & troubleshooting
- **PRODUCTION_READINESS_CHECKLIST.md** - Pre-launch verification
- **Backend Console** - Most detailed debugging info (watch the logs!)
- **Browser F12 Console** - Connection and message flow issues
- **Network Tab (F12)** - CORS and API issues

---

**Pro Tip:** Always start by checking backend console logs first. They show exactly what's happening with socket connections and message delivery. 🔍

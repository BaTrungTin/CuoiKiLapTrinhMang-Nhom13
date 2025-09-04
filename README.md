# 💬 Ứng Dụng Chat Ting Ting

Ứng dụng chat thời gian thực được xây dựng bằng React và Node.js, với tính năng nhắn tin nhóm, xác thực người dùng và giao diện hiện đại.

![Trạng Thái](https://img.shields.io/badge/Trạng_Thái-Hoạt_Động-brightgreen)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Socket.io](https://img.shields.io/badge/Socket.io-4.7.0-orange)

## ✨ Tính Năng

- 🔐 **Xác Thực Người Dùng** - Đăng nhập/đăng ký an toàn với JWT
- 👥 **Chat Nhóm** - Tạo và quản lý cuộc trò chuyện nhóm
- 💬 **Nhắn Tin Thời Gian Thực** - Gửi tin nhắn tức thì với Socket.io
- 🎨 **Giao Diện Hiện Đại** - Thiết kế đẹp, responsive với chế độ sáng/tối
- 📱 **Thân Thiện Mobile** - Tối ưu cho mọi kích thước màn hình
- 🔍 **Tìm Kiếm & Lọc** - Tìm tin nhắn và người dùng nhanh chóng
- 👤 **Hồ Sơ Người Dùng** - Quản lý hồ sơ và avatar của bạn
- 🌙 **Chuyển Đổi Giao Diện** - Chuyển đổi giữa chế độ sáng và tối

## 🚀 Khởi Động Nhanh

### Yêu Cầu Hệ Thống

- Node.js (phiên bản 18 trở lên)
- MongoDB
- npm hoặc yarn

### Cài Đặt

1. **Clone repository**

   ```bash
   git clone https://github.com/yourusername/chat-ting-ting-app.git
   cd chat-ting-ting-app
   ```

2. **Cài đặt dependencies**

   ```bash
   # Cài đặt dependencies cho backend
   cd backend
   npm install

   # Cài đặt dependencies cho frontend
   cd ../frontend
   npm install
   ```

3. **Thiết lập môi trường**

   Tạo file `.env` trong thư mục backend:

   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/chat-app
   JWT_SECRET=your-secret-key
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. **Khởi chạy ứng dụng**

   ```bash
   # Khởi chạy server backend
   cd backend
   npm run dev

   # Khởi chạy frontend (trong terminal mới)
   cd frontend
   npm run dev
   ```

5. **Mở trình duyệt**
   Truy cập `http://localhost:5173`

## 🛠️ Công Nghệ Sử Dụng

### Frontend

- **React 18** - Framework UI
- **Vite** - Công cụ build
- **Tailwind CSS** - Styling
- **Socket.io Client** - Giao tiếp thời gian thực
- **Axios** - HTTP client
- **Zustand** - Quản lý state

### Backend

- **Node.js** - Môi trường runtime
- **Express.js** - Web framework
- **Socket.io** - Giao tiếp thời gian thực
- **MongoDB** - Cơ sở dữ liệu
- **Mongoose** - ODM
- **JWT** - Xác thực
- **Cloudinary** - Upload hình ảnh

## 📱 Hình Ảnh Demo

<div align="center">
  <img src="./docs/screenshots/login-screen.png" alt="Màn Hình Đăng Nhập" width="300"/>
  <img src="./docs/screenshots/chat-interface.png" alt="Giao Diện Chat" width="300"/>
  <img src="./docs/screenshots/group-management.png" alt="Quản Lý Nhóm" width="300"/>
</div>

### 📸 Cách tạo ảnh demo:

1. **Chụp ảnh màn hình ứng dụng:**

   - Chạy ứng dụng: `npm run dev` (cả frontend và backend)
   - Chụp các màn hình chính: Login, Chat, Groups, Profile
   - Lưu vào thư mục `docs/screenshots/`

2. **Chỉnh sửa ảnh:**

   - Kích thước: 800x600px hoặc 1200x800px
   - Format: PNG hoặc JPG
   - Loại bỏ thông tin nhạy cảm

3. **Công cụ hỗ trợ:**
   - **Snipping Tool** (Windows) hoặc **Screenshot** (Mac)
   - **Figma** - Tạo mockup đẹp
   - **Canva** - Chỉnh sửa và thêm hiệu ứng
   - **GIMP/Photoshop** - Chỉnh sửa chuyên nghiệp

## 🔧 API Endpoints

### Xác Thực

- `POST /api/auth/register` - Đăng ký người dùng
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin người dùng hiện tại
- `POST /api/auth/logout` - Đăng xuất

### Nhóm

- `GET /api/groups` - Lấy danh sách nhóm của người dùng
- `POST /api/groups` - Tạo nhóm mới
- `GET /api/groups/:id` - Lấy chi tiết nhóm
- `PUT /api/groups/:id` - Cập nhật nhóm
- `DELETE /api/groups/:id` - Xóa nhóm

### Tin Nhắn

- `GET /api/messages/:groupId` - Lấy tin nhắn của nhóm
- `POST /api/messages` - Gửi tin nhắn
- `DELETE /api/messages/:id` - Xóa tin nhắn

## 🤝 Đóng Góp

1. Fork dự án
2. Tạo branch tính năng (`git checkout -b feature/TinhNangMoi`)
3. Commit thay đổi (`git commit -m 'Thêm tính năng mới'`)
4. Push lên branch (`git push origin feature/TinhNangMoi`)
5. Tạo Pull Request

## 📄 Giấy Phép

Dự án này được cấp phép theo MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 🙏 Lời Cảm Ơn

- [React](https://reactjs.org/) - Framework web được sử dụng
- [Socket.io](https://socket.io/) - Giao tiếp thời gian thực
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Vite](https://vitejs.dev/) - Công cụ build

## 📞 Hỗ Trợ

Nếu bạn có câu hỏi hoặc cần hỗ trợ, hãy liên hệ:

- 📧 Email: support@chattingting.com
- 💬 Discord: [Tham gia server](https://discord.gg/chattingting)
- 🐛 Báo lỗi: [Báo cáo bug](https://github.com/yourusername/chat-ting-ting-app/issues)

---

<div align="center">
  <p>Được tạo với ❤️ bởi Nhóm 13</p>
  <p>⭐ Hãy star repository này nếu bạn thấy hữu ích!</p>
</div>
>>>>>>> edce69d (Cập nhật source code)

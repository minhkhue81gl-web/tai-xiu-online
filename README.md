# TXA V20 Focus Production Compact Edition

Phiên bản thu gọn để toàn bộ màn hình chính nằm gọn trong một khung nhìn trên điện thoại, không cần cuộn.

## Thay đổi chính
- Bố cục tự co theo chiều cao màn hình bằng `100dvh`.
- Ba chỉ số nằm ngang trên điện thoại.
- Đồng hồ, lịch sử và nút nhập được thu nhỏ linh hoạt.
- Sao lưu, khôi phục và xóa dữ liệu chuyển vào phần Cài đặt để màn hình chính gọn hơn.
- Vẫn giữ IndexedDB, PWA, rung phản hồi, nhập Tài/Xỉu và hoàn tác.

## Chạy ứng dụng
Nên chạy bằng một web server cục bộ để PWA và ES Modules hoạt động ổn định, ví dụ:

```bash
python3 -m http.server 8080
```

Sau đó mở `http://localhost:8080`.

> Điểm tín hiệu chỉ là chỉ số tổng hợp từ dữ liệu lịch sử, không phải xác suất thắng.

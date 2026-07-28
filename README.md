# TXA V30 Quantum Analytics

Ứng dụng PWA tĩnh, chạy ngoại tuyến và lưu dữ liệu trên trình duyệt.

## Điểm mới của V30
- 18 mô hình thống kê và mô phỏng chuỗi.
- Trọng số mô hình thích nghi theo walk-forward validation.
- Cổng an toàn tín hiệu: có thể trả về **CHƯA RÕ** thay vì ép chọn.
- Confidence, entropy, tự tương quan, runs test và drift detection.
- Xếp hạng mô hình, Brier score, Monte Carlo 50.000 lần.
- Nhật ký tín hiệu, CSV, sao lưu/khôi phục JSON.
- 3 chế độ giao diện và hỗ trợ PWA offline.

## Cách chạy
Mở `index.html` bằng trình duyệt. Để PWA và service worker hoạt động đầy đủ, nên chạy qua máy chủ tĩnh, ví dụ:

```bash
python3 -m http.server 8080
```

Sau đó mở `http://localhost:8080`.

## Lưu ý quan trọng
V30 chỉ phân tích dữ liệu lịch sử. Các điểm số và mức nghiêng không phải bảo đảm dự đoán đúng kết quả ngẫu nhiên.

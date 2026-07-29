# TXA V20 Focus Production Edition

Ứng dụng PWA chạy ngoại tuyến, chỉ tập trung vào khu vực **“Ván tiếp theo nghiêng về”**.

## Điểm nâng cấp production

- Mã nguồn tách module rõ ràng.
- IndexedDB lưu lịch sử ổn định hơn localStorage.
- PWA + Service Worker dùng ngoại tuyến.
- Sao lưu/khôi phục JSON có kiểm tra schema.
- Cài đặt ngưỡng tín hiệu và số mẫu tối thiểu.
- Responsive, hỗ trợ reduced-motion và rung phản hồi.
- Có kiểm thử cơ bản cho lõi phân tích.

## Chạy ứng dụng

Do Service Worker cần HTTP, nên chạy bằng máy chủ tĩnh:

```bash
python3 -m http.server 8080
```

Sau đó mở `http://localhost:8080`.

## Chạy kiểm thử

```bash
node tests/engine.test.mjs
```

## Lưu ý

Ứng dụng chỉ phân tích chuỗi dữ liệu lịch sử. Điểm tín hiệu không phải xác suất thắng và không bảo đảm kết quả tiếp theo.

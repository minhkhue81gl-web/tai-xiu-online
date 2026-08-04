# TXA V20 Focus — Production Edition

Bản nâng cấp giao diện theo mẫu màn hình Focus: tối ưu cho điện thoại, hiển thị điểm tín hiệu, đồng thuận, độ ổn định, xu hướng, 20 ván gần nhất và 4 nút thao tác chính.

## Chạy nhanh

Có thể mở trực tiếp `index.html`. Để dùng đầy đủ chế độ PWA/offline, chạy máy chủ tĩnh:

```bash
python3 -m http.server 8080
```

Sau đó mở `http://localhost:8080`.

## Điểm mới

- Giao diện Focus khổ dọc, responsive theo mẫu.
- Thanh điểm tín hiệu gradient và mốc điểm động.
- Lịch sử 20 ván gần nhất dạng chip.
- Cài đặt dạng bảng trượt, chứa thống kê nâng cao, 12 mô hình, Monte Carlo và xuất/nhập dữ liệu.
- Hộp xác nhận riêng khi xóa dữ liệu.
- PWA/offline cache mới.

## Lưu ý

Ứng dụng chỉ phân tích dữ liệu lịch sử và không bảo đảm kết quả ngẫu nhiên của ván tiếp theo.

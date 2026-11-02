# TXA V21 • Validation & Risk Control

Nâng cấp trực tiếp từ TXA V20 Enterprise (giữ bộ 12 mô hình gốc). Dự án là web tĩnh, không cần tài khoản, máy chủ hay API trả phí.

## Khởi chạy

1. Giải nén toàn bộ tệp ZIP.
2. Mở `index.html` trên trình duyệt máy tính hoặc điện thoại (với một số trình duyệt, chế độ `file://` có thể hạn chế lưu cục bộ).
3. Để dùng ổn định và cài như PWA trên điện thoại, chạy trong thư mục dự án:

```sh
python3 -m http.server 8080
```

Truy cập `http://localhost:8080` trên máy đang chạy máy chủ. Muốn truy cập từ điện thoại cùng mạng LAN, sử dụng địa chỉ IP nội bộ của máy và cổng 8080, nếu được hệ điều hành cho phép. Trên iPhone, PWA thường yêu cầu HTTPS hoặc tên miền phù hợp để thêm vào màn hình chính; `localhost` chỉ dùng trên chính thiết bị chạy máy chủ.

## Các tính năng mới

- **Walk-forward / kiểm chứng không nhìn trước:** với mỗi ván i (bắt đầu khi đã có 30 ván lịch sử), dự báo chỉ sử dụng các ván trước i. Bảng thống kê gồm độ bao phủ, số dự đoán đúng, tỷ lệ đúng, Wilson 95% và chỉ số từng mô hình.
- **Nhật ký trực tiếp:** dự đoán của hệ thống được tạo trước khi người dùng nhập kết quả vào ứng dụng và được đối chiếu với kết quả thực tế. Dữ liệu từ bản sao lưu không thể xác nhận độc lập nguồn gốc hoặc dấu thời gian.
- **Bộ lọc cảnh báo:** không hiện như tín hiệu đã kiểm chứng khi chưa có 100 tín hiệu trực tiếp và cận dưới Wilson 95% chưa vượt 50%. Đây chỉ là một ngưỡng sơ bộ, KHÔNG phải chứng cứ về khả năng dự đoán tương lai.
- **Dashboard vốn ảo:** quy tắc 200.000đ; một chu kỳ 1k/2k/4k/8k/16k có kết quả +1k hoặc -31k; dừng phiên ở +15k hoặc sau 5 chu kỳ thua hết; cách nhau 30 phút; dừng ngày ở +30k lãi ròng, tối đa 10 phiên; không cho bắt đầu chu kỳ mới nếu không đủ 31k.
- **Mô phỏng 10.000 ngày:** xác suất đạt mục tiêu, xác suất ngày lỗ, xác suất thiếu vốn, tiền lời/lỗ trung bình và các phân vị, dựa trên tỷ lệ thắng một VÁN giả định.
- **Dữ liệu:** tự lưu trên thiết bị bằng localStorage; hỗ trợ nhập JSON V20, xuất JSON V21 và CSV audit.
- **Offline PWA** khi được phục vụ bằng HTTP(S) với Service Worker.

## Cảnh báo thống kê quan trọng

- Điểm Tài 70/100 là điểm heuristic của 12 mô hình, **không phải xác suất thắng 70%**.
- Trong Tài/Xỉu truyền thống ba xúc xắc, bộ ba đồng số thua cả Tài/Xỉu, mỗi bên thắng 105/216 = 48,611% ván; một số website khác có luật khác.
- Tỷ lệ trả thưởng 1:1 không bảo đảm cơ hội thắng 50%.
- Đúng 5 ván liên tiếp trong chuỗi chỉ giúp thu lại lãi +1k; thua cả chuỗi mất 31k. Chuỗi cược kiểu gấp đôi không cải thiện lợi nhuận kỳ vọng.
- Các ván độc lập không có “trí nhớ”; nghỉ 30 phút không làm thay đổi xác suất của ván sau.
- Kết quả backtest dễ chịu ảnh hưởng của việc nhập kết quả có chọn lọc, thử nhiều mô hình, thay đổi tham số và thiên lệch dữ liệu. Không có bằng chứng phần mềm này dự đoán được kết quả ngẫu nhiên tốt hơn ngẫu nhiên.
- Mô phỏng dùng RNG giả lập và **không phải dự báo** lợi nhuận thực tế. Khi chọn 51%/52%, đó chỉ là giả định độ nhạy, không phải độ chính xác đã đạt được.
- Dashboard chỉ dùng vốn ảo và ghi tay, **không có tính năng tự đặt cược, kết nối tài khoản hay giao dịch tự động**.

## Tệp chính

- `index.html`, `styles.css`: giao diện responsive.
- `engine.js`: 12 mô hình và kiểm chứng walk-forward.
- `risk-engine.js`: máy trạng thái theo dõi vốn ảo và mô phỏng ngày.
- `app.js`: lưu trữ, nhập/xuất, thao tác UI.
- `sw.js`, `manifest.webmanifest`, `assets/icon.svg`: PWA ngoại tuyến.
- `tests/run-tests.js`: kiểm thử số học và logic.

## Chạy kiểm thử

Cần Node.js >= 18, không cần cài thêm thư viện:

```sh
node tests/run-tests.js
```

## Tương thích dữ liệu cũ

- Khởi động V21 sẽ thử đọc lịch sử từ `txa-v20-history` nếu dữ liệu V21 chưa tồn tại **trên cùng origin/trình duyệt**.
- Vì origin có thể thay đổi khi chuyển từ `file://` sang server, cách tin cậy nhất là xuất JSON V20 từ phiên bản cũ rồi nhập vào V21.
- File V20 không có lịch sử dự đoán được tạo trước kết quả, nên dữ liệu nhập từ V20 không được gắn nhãn “đã kiểm chứng trực tiếp”.

## Quy tắc ngày và nghỉ

- Bộ ghi vốn ảo gắn với ngày tạo. Khi chuyển sang ngày mới, ứng dụng không xóa nhật ký cũ; hãy sao lưu rồi bấm **Ngày mới / Đặt lại**.
- Thời gian nghỉ 30 phút tính từ lúc đóng phiên gần nhất; nếu chưa đủ thời gian, nút **Bắt đầu phiên** sẽ bị khóa.
- Nếu bạn ghi nhầm một chu kỳ, hiện chưa có nút hoàn tác riêng cho nhật ký vốn. Hãy sao lưu JSON trước khi thử nghiệm; việc chỉnh sửa trực tiếp JSON nên thực hiện cẩn thận.

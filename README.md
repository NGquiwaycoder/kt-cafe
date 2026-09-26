# K-T — вьетнамская кухня (Ульяновск)

Сайт-визитка сети кафе K-T: меню с ценами для каждого кафе, корзина для подсчёта суммы, адреса на Яндекс Картах, ссылка на Яндекс Еду. Без регистрации, оплаты и сервера — обычный статический сайт для GitHub Pages.

## Структура

| Файл / папка | Что внутри |
|---|---|
| `index.html` | страница |
| `css/style.css` | оформление, светлая и тёмная тема |
| `js/data.js` | **все данные**: блюда, цены, адреса, телефон, ссылки |
| `js/app.js` | логика (менять не нужно) |
| `img/dishes/` | фото блюд, имя файла = `id` блюда |
| `menu/` | PDF-меню для скачивания |

## Hướng dẫn nhanh (tiếng Việt)

**Sửa giá / tên món:** mở `js/data.js`, tìm món (ví dụ `'Фо Бо'`), sửa số sau `p:`.
- `p:` là giá ở quán Рябикова và Камышинская.
- `r:[giá, 'dung tích']` là giá ở quán Рылеева, nếu khác.
- Món có lựa chọn (loại thịt, số cái…) nằm trong `opts`.

**Thêm món mới:** chép một dòng món có sẵn, đổi `id`, rồi đặt ảnh `img/dishes/<id>.webp` (ảnh nền trong suốt, khoảng 360 px).

**Đổi giờ mở cửa / số điện thoại / link:** các dòng đầu của `js/data.js`.

**Thay PDF menu:** chép file mới đè lên file trong `menu/`, giữ nguyên tên file.

**Xem thử trên máy:** chạy `python -m http.server 8000` trong thư mục này rồi mở http://localhost:8000.

**Đăng lên mạng:** commit và push lên nhánh `main`, GitHub Pages sẽ tự cập nhật sau khoảng 1 phút.

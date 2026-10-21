// Dữ liệu tỉnh/thành + quận/huyện (hệ thống cũ, trước sáp nhập
// 1/7/2025) phục vụ bộ chọn địa điểm ở trang Tìm kiếm ứng viên.
// Địa chỉ ứng viên trong hệ thống là chữ tự do ghi theo cách cũ
// (VD: "Quận 1, TP. Hồ Chí Minh") nên bộ chọn khớp theo tên tỉnh
// và tên quận/huyện xuất hiện trong địa chỉ. Các tỉnh/thành là
// trung tâm việc làm có danh sách quận/huyện; các tỉnh còn lại
// chọn ở cấp tỉnh (districts rỗng = toàn tỉnh).
export const PROVINCES = [
  {
    name: "Hồ Chí Minh",
    districts: ["Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7",
      "Quận 8", "Quận 10", "Quận 11", "Quận 12", "Bình Thạnh", "Gò Vấp",
      "Phú Nhuận", "Tân Bình", "Tân Phú", "Bình Tân", "Thủ Đức",
      "Bình Chánh", "Củ Chi", "Hóc Môn", "Nhà Bè", "Cần Giờ"],
  },
  {
    name: "Hà Nội",
    districts: ["Ba Đình", "Hoàn Kiếm", "Đống Đa", "Hai Bà Trưng",
      "Hoàng Mai", "Thanh Xuân", "Cầu Giấy", "Hà Đông", "Long Biên",
      "Nam Từ Liêm", "Bắc Từ Liêm", "Tây Hồ", "Đông Anh", "Gia Lâm",
      "Thanh Trì", "Hoài Đức", "Sóc Sơn", "Mê Linh", "Ba Vì", "Sơn Tây"],
  },
  {
    name: "Đà Nẵng",
    districts: ["Hải Châu", "Thanh Khê", "Sơn Trà", "Ngũ Hành Sơn",
      "Liên Chiểu", "Cẩm Lệ", "Hòa Vang"],
  },
  {
    name: "Bình Dương",
    districts: ["Thủ Dầu Một", "Dĩ An", "Thuận An", "Tân Uyên", "Bến Cát",
      "Bàu Bàng", "Dầu Tiếng", "Phú Giáo", "Bắc Tân Uyên"],
  },
  {
    name: "Đồng Nai",
    districts: ["Biên Hòa", "Long Khánh", "Long Thành", "Nhơn Trạch",
      "Trảng Bom", "Vĩnh Cửu", "Xuân Lộc", "Thống Nhất", "Cẩm Mỹ",
      "Định Quán", "Tân Phú"],
  },
  {
    name: "Hải Phòng",
    districts: ["Hồng Bàng", "Ngô Quyền", "Lê Chân", "Hải An", "Kiến An",
      "Đồ Sơn", "Dương Kinh", "Thủy Nguyên", "An Dương", "An Lão",
      "Cát Hải", "Tiên Lãng", "Vĩnh Bảo", "Kiến Thụy"],
  },
  {
    name: "Cần Thơ",
    districts: ["Ninh Kiều", "Bình Thủy", "Cái Răng", "Ô Môn", "Thốt Nốt",
      "Phong Điền", "Cờ Đỏ", "Thới Lai", "Vĩnh Thạnh"],
  },
  {
    name: "Bắc Ninh",
    districts: ["Bắc Ninh", "Từ Sơn", "Yên Phong", "Tiên Du", "Quế Võ",
      "Gia Bình", "Thuận Thành", "Lương Tài"],
  },
  {
    name: "Bà Rịa - Vũng Tàu",
    districts: ["Vũng Tàu", "Bà Rịa", "Phú Mỹ", "Long Điền", "Đất Đỏ",
      "Xuyên Mộc", "Châu Đức", "Côn Đảo"],
  },
  {
    name: "Khánh Hòa",
    districts: ["Nha Trang", "Cam Ranh", "Ninh Hòa", "Cam Lâm", "Diên Khánh", "Vạn Ninh", "Khánh Vĩnh"],
  },
  {
    name: "Nghệ An",
    districts: ["Vinh", "Cửa Lò", "Thái Hòa", "Diễn Châu", "Đô Lương", "Yên Thành", "Quỳnh Lưu"],
  },
  {
    name: "Quảng Ninh",
    districts: ["Hạ Long", "Cẩm Phả", "Uông Bí", "Móng Cái", "Đông Triều", "Quảng Yên", "Vân Đồn"],
  },
  {
    name: "Thừa Thiên Huế",
    districts: ["Huế", "Hương Thủy", "Hương Trà", "Phú Vang", "Phú Lộc", "Phong Điền", "Quảng Điền"],
  },
  {
    name: "Thanh Hóa",
    districts: ["Thanh Hóa", "Sầm Sơn", "Bỉm Sơn", "Nghi Sơn", "Thọ Xuân", "Triệu Sơn", "Đông Sơn", "Hoằng Hóa"],
  },
  {
    name: "Hưng Yên",
    districts: ["Hưng Yên", "Mỹ Hào", "Văn Lâm", "Văn Giang", "Yên Mỹ", "Khoái Châu", "Ân Thi", "Kim Động"],
  },
  {
    name: "Hải Dương",
    districts: ["Hải Dương", "Chí Linh", "Kinh Môn", "Nam Sách", "Kim Thành", "Thanh Hà", "Ninh Giang", "Gia Lộc", "Cẩm Giàng"],
  },
  {
    name: "Long An",
    districts: ["Tân An", "Kiến Tường", "Đức Hòa", "Bến Lức", "Cần Đước", "Cần Giuộc", "Châu Thành", "Tân Trụ", "Thủ Thừa"],
  },
  {
    name: "Tây Ninh",
    districts: ["Tây Ninh", "Hòa Thành", "Trảng Bàng", "Gò Dầu", "Bến Cầu", "Dương Minh Châu", "Tân Biên", "Tân Châu", "Châu Thành"],
  },
  {
    name: "Vĩnh Phúc",
    districts: ["Vĩnh Yên", "Phúc Yên", "Bình Xuyên", "Yên Lạc", "Vĩnh Tường", "Lập Thạch", "Tam Dương", "Tam Đảo"],
  },
  {
    name: "Bắc Giang",
    districts: ["Bắc Giang", "Việt Yên", "Hiệp Hòa", "Lạng Giang", "Lục Nam", "Lục Ngạn", "Tân Yên", "Yên Dũng", "Yên Thế", "Sơn Động"],
  },
  {
    name: "Thái Nguyên",
    districts: ["Thái Nguyên", "Sông Công", "Phổ Yên", "Đại Từ", "Phú Bình", "Định Hóa", "Phú Lương", "Đồng Hỷ", "Võ Nhai"],
  },
  {
    name: "Tiền Giang",
    districts: ["Mỹ Tho", "Gò Công", "Cai Lậy", "Cái Bè", "Châu Thành", "Chợ Gạo", "Tân Phước"],
  },
  {
    name: "Lâm Đồng",
    districts: ["Đà Lạt", "Bảo Lộc", "Đức Trọng", "Di Linh", "Lâm Hà", "Đơn Dương", "Lạc Dương", "Bảo Lâm"],
  },
  {
    name: "Đắk Lắk",
    districts: ["Buôn Ma Thuột", "Buôn Hồ", "Ea H'leo", "Cư M'gar", "Krông Pắc", "Krông Ana", "Ea Kar", "Lắk"],
  },
  {
    name: "An Giang", districts: ["Long Xuyên", "Châu Đốc", "Tân Châu", "Châu Phú", "Phú Tân", "Chợ Mới", "Thoại Sơn"],
  },
  { name: "Bắc Kạn", districts: [] },
  { name: "Bạc Liêu", districts: [] },
  { name: "Bến Tre", districts: [] },
  { name: "Bình Định", districts: ["Quy Nhơn", "An Nhơn", "Hoài Nhơn", "Phù Cát", "Tuy Phước"] },
  { name: "Bình Phước", districts: ["Đồng Xoài", "Bình Long", "Phước Long", "Chơn Thành", "Đồng Phú"] },
  { name: "Bình Thuận", districts: ["Phan Thiết", "La Gi", "Tuy Phong", "Bắc Bình", "Hàm Thuận Bắc", "Hàm Thuận Nam"] },
  { name: "Cà Mau", districts: [] },
  { name: "Cao Bằng", districts: [] },
  { name: "Đắk Nông", districts: ["Gia Nghĩa", "Đắk Mil", "Đắk Song", "Cư Jút", "Krông Nô"] },
  { name: "Điện Biên", districts: [] },
  { name: "Đồng Tháp", districts: ["Cao Lãnh", "Sa Đéc", "Hồng Ngự", "Lấp Vò", "Lai Vung"] },
  { name: "Gia Lai", districts: ["Pleiku", "An Khê", "Ayun Pa", "Chư Sê", "Đức Cơ"] },
  { name: "Hà Giang", districts: [] },
  { name: "Hà Nam", districts: ["Phủ Lý", "Duy Tiên", "Kim Bảng", "Thanh Liêm", "Lý Nhân"] },
  { name: "Hà Tĩnh", districts: ["Hà Tĩnh", "Hồng Lĩnh", "Kỳ Anh", "Hương Sơn", "Đức Thọ", "Can Lộc"] },
  { name: "Hậu Giang", districts: [] },
  { name: "Hòa Bình", districts: [] },
  { name: "Kiên Giang", districts: ["Rạch Giá", "Hà Tiên", "Phú Quốc", "Kiên Lương", "Hòn Đất", "Giồng Riềng"] },
  { name: "Kon Tum", districts: [] },
  { name: "Lai Châu", districts: [] },
  { name: "Lạng Sơn", districts: [] },
  { name: "Lào Cai", districts: ["Lào Cai", "Sa Pa", "Bảo Thắng", "Văn Bàn", "Bát Xát"] },
  { name: "Nam Định", districts: ["Nam Định", "Giao Thủy", "Hải Hậu", "Nam Trực", "Trực Ninh", "Xuân Trường", "Ý Yên", "Vụ Bản", "Mỹ Lộc"] },
  { name: "Ninh Bình", districts: ["Ninh Bình", "Tam Điệp", "Gia Viễn", "Hoa Lư", "Yên Khánh", "Kim Sơn"] },
  { name: "Ninh Thuận", districts: ["Phan Rang - Tháp Chàm", "Ninh Hải", "Ninh Phước", "Thuận Bắc", "Thuận Nam"] },
  { name: "Phú Thọ", districts: ["Việt Trì", "Phú Thọ", "Lâm Thao", "Phù Ninh", "Thanh Sơn", "Đoan Hùng"] },
  { name: "Phú Yên", districts: ["Tuy Hòa", "Sông Cầu", "Đông Hòa", "Tuy An", "Sơn Hòa"] },
  { name: "Quảng Bình", districts: ["Đồng Hới", "Ba Đồn", "Quảng Trạch", "Bố Trạch", "Lệ Thủy"] },
  { name: "Quảng Nam", districts: ["Tam Kỳ", "Hội An", "Điện Bàn", "Đại Lộc", "Duy Xuyên", "Núi Thành", "Thăng Bình"] },
  { name: "Quảng Ngãi", districts: ["Quảng Ngãi", "Đức Phổ", "Bình Sơn", "Sơn Tịnh", "Tư Nghĩa", "Mộ Đức"] },
  { name: "Quảng Trị", districts: ["Đông Hà", "Quảng Trị", "Hải Lăng", "Triệu Phong", "Gio Linh", "Vĩnh Linh"] },
  { name: "Sóc Trăng", districts: [] },
  { name: "Sơn La", districts: [] },
  { name: "Thái Bình", districts: ["Thái Bình", "Quỳnh Phụ", "Hưng Hà", "Đông Hưng", "Thái Thụy", "Tiền Hải", "Kiến Xương", "Vũ Thư"] },
  { name: "Trà Vinh", districts: [] },
  { name: "Tuyên Quang", districts: [] },
  { name: "Vĩnh Long", districts: ["Vĩnh Long", "Bình Minh", "Long Hồ", "Tam Bình", "Vũng Liêm"] },
  { name: "Yên Bái", districts: [] },
];

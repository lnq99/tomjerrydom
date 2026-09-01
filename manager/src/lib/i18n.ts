// i18n foundation for the manager app.
// Manager UI primary language is Vietnamese. Russian strings are defined here
// for future wiring. Components currently use Vietnamese hardcoded — migrate
// gradually by replacing hardcoded strings with t("key") calls.
//
// Customer-facing surfaces (receipts, QR payment screen) use Russian directly
// in the component, not via this system.

export type Lang = "vi" | "ru"

export const strings = {
  vi: {
    // Navigation
    pos:        "POS",
    orders:     "Đơn hàng",
    products:   "Sản phẩm",
    catalog:    "Danh mục",
    pricing:    "Bảng giá",
    customers:  "Khách hàng",
    analytics:  "Phân tích",
    media:      "Media",
    profile:    "Hồ sơ",

    // POS
    cart:         "Giỏ hàng",
    cartEmpty:    "Giỏ hàng trống",
    clearCart:    "Xóa giỏ",
    total:        "Tổng cộng",
    sell:         "Bán",
    createOrder:  "Tạo đơn hàng",
    payment:      "Thanh toán",
    addCustomer:  "Thêm khách",
    searchProducts: "Tìm kiếm sản phẩm...",
    loading:      "Đang tải...",
    notFound:     "Không tìm thấy",
    manual:       "thủ công",

    // Orders
    orderList:    "Đơn hàng",
    searchOrders: "Tìm ID, tên, số điện thoại...",
    today:        "Hôm nay",
    all:          "Tất cả",
    reset:        "Đặt lại",
    apply:        "Áp dụng",
    cancel:       "Hủy",
    save:         "Lưu",
    done:         "Xong",

    // Order statuses
    statusCompleted:      "Hoàn thành",
    statusPending:        "Đang xử lý",
    statusRequiresAction: "Cần xử lý",
    statusCanceled:       "Đã hủy",
    statusArchived:       "Lưu trữ",
    statusDraft:          "Nháp",

    // Customer
    customer:         "Khách hàng",
    customerName:     "Tên khách hàng",
    customerPhone:    "Số điện thoại",
    customerNote:     "Ghi chú",
    noCustomerInfo:   "Chưa có thông tin khách hàng",

    // Wholesale tier prefix
    wholesale: "Sỉ",
  },

  ru: {
    // Navigation
    pos:        "Касса",
    orders:     "Заказы",
    products:   "Товары",
    catalog:    "Каталог",
    pricing:    "Прайс",
    customers:  "Клиенты",
    analytics:  "Аналитика",
    media:      "Медиа",
    profile:    "Профиль",

    // POS
    cart:         "Корзина",
    cartEmpty:    "Корзина пуста",
    clearCart:    "Очистить",
    total:        "Итого",
    sell:         "Продать",
    createOrder:  "Создать заказ",
    payment:      "Оплата",
    addCustomer:  "Добавить клиента",
    searchProducts: "Поиск товаров...",
    loading:      "Загрузка...",
    notFound:     "Не найдено",
    manual:       "вручную",

    // Orders
    orderList:    "Заказы",
    searchOrders: "Поиск по ID, имени, телефону...",
    today:        "Сегодня",
    all:          "Все",
    reset:        "Сбросить",
    apply:        "Применить",
    cancel:       "Отмена",
    save:         "Сохранить",
    done:         "Готово",

    // Order statuses
    statusCompleted:      "Завершён",
    statusPending:        "В обработке",
    statusRequiresAction: "Требует действия",
    statusCanceled:       "Отменён",
    statusArchived:       "Архив",
    statusDraft:          "Черновик",

    // Customer
    customer:         "Клиент",
    customerName:     "Имя клиента",
    customerPhone:    "Телефон",
    customerNote:     "Примечание",
    noCustomerInfo:   "Нет информации о клиенте",

    // Wholesale tier prefix
    wholesale: "Опт",
  },
} as const satisfies Record<Lang, Record<string, string>>

export type StringKey = keyof typeof strings.vi

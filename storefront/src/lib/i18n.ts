/**
 * Storefront i18n — currently Russian only.
 *
 * To add a language:
 *  1. Add the locale to the Locale union type
 *  2. Add a full entry to `dict`
 *  3. Wire up locale detection (URL params, cookie, or context)
 *     and replace the LOCALE constant with a dynamic lookup
 */

type Locale = "ru" // | "en" | "vi"

const LOCALE: Locale = "ru"

const dict = {
  ru: {
    // ── Navigation / 404 ────────────────────────────────────────────────────
    page_not_found: "Страница не найдена",
    page_not_exist: "Страница, которую вы искали, не существует.",
    go_to_frontpage: "На главную",

    // ── Related products ────────────────────────────────────────────────────
    related_products: "Похожие товары",
    related_products_tagline: "Вам также может понравиться",

    // ── Cart ────────────────────────────────────────────────────────────────
    cart: "Корзина",
    cart_item: "Товар",
    cart_quantity: "Количество",
    cart_price: "Цена",
    cart_total: "Итого",

    // ── Checkout ────────────────────────────────────────────────────────────
    place_order: "Оформить заказ",
    select_payment_method: "Выберите способ оплаты",
    checkout_review: "Подтверждение",
    checkout_review_legal:
      "Нажимая кнопку «Оформить заказ», вы подтверждаете согласие с условиями использования и политикой конфиденциальности.",
    discount_remove_sr: "Удалить промокод из заказа",

    // ── Account — navigation ────────────────────────────────────────────────
    account: "Аккаунт",
    account_overview: "Обзор",
    account_profile: "Профиль",
    account_addresses: "Адреса",
    account_orders: "Заказы",
    account_logout: "Выйти",

    // ── Account — overview ──────────────────────────────────────────────────
    account_signed_in_as: "Вошли как:",
    account_profile_label: "Профиль",
    account_completed: "Заполнено",
    account_addresses_label: "Адреса",
    account_saved: "Сохранено",
    account_recent_orders: "Недавние заказы",
    account_date_placed: "Дата заказа",
    account_order_number: "Номер заказа",
    account_order_total: "Сумма",
    account_no_recent_orders: "Нет недавних заказов",

    // ── Account — info / profile forms ──────────────────────────────────────
    account_info_error: "Произошла ошибка, попробуйте ещё раз",
    account_cancel: "Отменить",
    account_edit: "Изменить",

    profile_name_label: "Имя",
    first_name: "Имя",
    last_name: "Фамилия",

    email: "Email",
    phone: "Телефон",

    password_label: "Пароль",
    password_hidden: "Пароль скрыт в целях безопасности",
    old_password: "Старый пароль",
    new_password: "Новый пароль",
    confirm_password: "Подтвердить пароль",

    // ── Order overview (empty state) ────────────────────────────────────────
    no_orders_title: "Заказов пока нет",
    no_orders_text: "Вы ещё не сделали ни одного заказа — самое время это исправить!",
    continue_shopping: "В магазин",

    // ── Free shipping nudge ─────────────────────────────────────────────────
    free_shipping_unlocked: "Бесплатная доставка разблокирована!",
    unlock_free_shipping: "Бесплатная доставка",
    view_cart: "В корзину",
    view_products: "В магазин",
  },
} as const satisfies Record<Locale, Record<string, string>>

export type TranslationKey = keyof typeof dict.ru

export function t(key: TranslationKey): string {
  return dict[LOCALE][key]
}

// Edit PROMO_MESSAGE below to change the promo text shown on every page.
const PROMO_MESSAGE = "Оптовые цены от 5 000₽ — скидка сразу при добавлении в корзину"
const LEGAL_NOTICE = "Курение вредит здоровью. Продажа несовершеннолетним запрещена."

export default function AnnouncementBar() {
  return (
    <div className="w-full bg-[#1a1a1a] text-white text-[11px] leading-tight">
      <div className="content-container flex items-center justify-between gap-4 py-1.5 min-h-[32px]">
        <p className="text-white/50 hidden small:block truncate">{LEGAL_NOTICE}</p>
        <p className="text-white/70 font-medium text-center small:text-right w-full small:w-auto whitespace-nowrap">
          {PROMO_MESSAGE}
        </p>
      </div>
    </div>
  )
}

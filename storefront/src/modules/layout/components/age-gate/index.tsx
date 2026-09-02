"use client"

import { useEffect, useState } from "react"

const AGE_KEY = "age_verified"

export default function AgeGate() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(AGE_KEY)) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const confirm = () => {
    localStorage.setItem(AGE_KEY, "1")
    setVisible(false)
  }

  const deny = () => {
    window.location.href = "https://www.google.com"
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-white max-w-lg w-full rounded-2xl p-8 text-center shadow-2xl">
        <h1 className="text-2xl font-black uppercase tracking-tight mb-6 leading-tight">
          Добро пожаловать в Tom&amp;Jerry Дом
        </h1>
        <p className="text-sm text-gray-700 mb-4 leading-relaxed">
          Мы не осуществляем дистанционную продажу табачной,
          никотиносодержащей продукцией, кальянов и устройств для
          потребления никотиносодержащей продукцией.
        </p>
        <p className="text-sm text-gray-700 mb-4 leading-relaxed">
          Сайт представляет собой интернет-витрину, позволяет ознакомиться
          с ассортиментом товара доступного для покупки в стационарных
          магазинах сети. Информация на сайте не является рекламой и
          публичной офертой.
        </p>
        <p className="text-sm font-semibold text-gray-900 mb-8">
          Информация на сайте не предназначена для несовершеннолетних.
          Подтвердите, что вам исполнилось 18 лет.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={deny}
            className="flex-1 max-w-[180px] border border-gray-300 text-gray-700 py-3 px-4 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Нет, мне нет 18
          </button>
          <button
            onClick={confirm}
            className="flex-1 max-w-[180px] bg-black text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-gray-900 transition-colors"
          >
            Да, мне есть 18
          </button>
        </div>
      </div>
    </div>
  )
}

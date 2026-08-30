"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { QrCode, Phone, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getBankingDetails, saveBankingDetails } from "@/lib/banking-details"

export default function ProfilePage() {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [qrUrl, setQrUrl] = useState("")

  useEffect(() => {
    const d = getBankingDetails()
    setName(d.name)
    setPhone(d.phone)
    setQrUrl(d.qrUrl)
  }, [])

  function handleSave() {
    saveBankingDetails({ name, phone, qrUrl })
    toast.success("Đã lưu thông tin")
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3">
        <h1 className="text-xl font-bold">Hồ sơ</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Thông tin thanh toán từ khách hàng</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-sm space-y-5">

          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Tên thu ngân
            </label>
            <Input
              placeholder="Nguyễn Văn A"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              Số điện thoại (thanh toán)
            </label>
            <Input
              type="tel"
              placeholder="+7 900 000-00-00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Khách hàng chuyển khoản qua số này
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <QrCode className="h-3.5 w-3.5 text-muted-foreground" />
              Mã QR (link hình ảnh)
            </label>
            <Input
              placeholder="https://..."
              value={qrUrl}
              onChange={(e) => setQrUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Dán link mã QR từ ứng dụng ngân hàng.
              Tải xuống từ ngân hàng, tải lên media và sao chép URL.
            </p>
            {qrUrl && (
              <img
                src={qrUrl}
                alt="QR preview"
                className="mt-2 h-32 w-32 rounded-lg border object-contain bg-white"
              />
            )}
          </div>

          <Button onClick={handleSave} className="w-full">
            Lưu
          </Button>
        </div>
      </div>
    </div>
  )
}

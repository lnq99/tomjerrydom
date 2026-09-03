"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { QrCode, Phone, User, Upload, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getBankingDetails, saveBankingDetails } from "@/lib/banking-details"

export default function ProfilePage() {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [qrUrl, setQrUrl] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const d = getBankingDetails()
    setName(d.name)
    setPhone(d.phone)
    setQrUrl(d.qrUrl)
  }, [])

  function handleQrFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setQrUrl(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ""
  }

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
              Mã QR thanh toán
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleQrFile}
            />
            {qrUrl ? (
              <div className="flex items-start gap-3">
                <img
                  src={qrUrl}
                  alt="QR preview"
                  className="h-32 w-32 rounded-lg border object-contain bg-white shrink-0"
                />
                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Đổi ảnh
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setQrUrl("")}
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Xóa
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed border-border py-8 text-muted-foreground hover:bg-accent transition-colors"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm">Tải lên ảnh QR</span>
                <span className="text-xs">PNG, JPG từ ứng dụng ngân hàng</span>
              </button>
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

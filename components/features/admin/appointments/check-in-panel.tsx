'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, CheckCircle2, Keyboard, ScanLine } from 'lucide-react';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, FormField } from '@/components/ui/form-field';
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils/format';

interface Found {
  code: string;
  patientName: string;
  facilityName: string;
  specialtyName: string;
  roomName: string;
  examDate: string;
  slotLabel: string;
  stt: number | null;
  payMethod: string;
  amount: number;
  objectType: string;
  status: string;
  checkedInAt: string | null;
}

interface Detector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
type DetectorWindow = Window & { BarcodeDetector?: new (options: { formats: string[] }) => Detector };

export function CheckInPanel() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef<number | null>(null);
  const scanning = useRef(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [found, setFound] = useState<Found | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function stopCamera() {
    scanning.current = false;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setCameraOn(false);
  }

  useEffect(
    () => () => {
      scanning.current = false;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      stream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  async function lookup(input: { code?: string; token?: string }) {
    setBusy(true);
    setError('');
    setNotice('');
    setFound(null);
    try {
      const result = await apiFetch<Found>('/api/admin/appointments/check-in', {
        method: 'POST',
        body: input,
      });
      setFound(result);
      if (input.token) stopCamera();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Không tra được phiếu.');
    } finally {
      setBusy(false);
    }
  }

  async function startCamera() {
    setError('');
    const DetectorClass = (window as DetectorWindow).BarcodeDetector;
    if (!DetectorClass) {
      setError('Trình duyệt chưa hỗ trợ quét QR. Vui lòng nhập mã phiếu bên dưới.');
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      stream.current = media;
      if (!video.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      video.current.srcObject = media;
      await video.current.play();
      setCameraOn(true);
      scanning.current = true;
      const detector = new DetectorClass({ formats: ['qr_code'] });
      const tick = async () => {
        if (!scanning.current || !video.current) return;
        try {
          const results = await detector.detect(video.current);
          if (results[0]?.rawValue) {
            stopCamera();
            await lookup({ token: results[0].rawValue });
            return;
          }
        } catch {
          /* Khung hình chưa sẵn sàng: tiếp tục quét. */
        }
        if (scanning.current) frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    } catch {
      stopCamera();
      setError('Không mở được camera. Hãy cấp quyền camera hoặc nhập mã phiếu.');
    }
  }

  async function confirm() {
    if (!found) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await apiFetch<{ checkedInAt: string }>(
        `/api/admin/appointments/${found.code}/check-in`,
        { method: 'POST' },
      );
      setFound({ ...found, checkedInAt: result.checkedInAt });
      setNotice('Đã đánh dấu bệnh nhân đến quầy.');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Chưa check-in được phiếu.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <p className="text-primary text-sm font-semibold">A06 · QUẦY TIẾP NHẬN</p>
        <h1 className="text-ink-navy text-[28px] font-bold">Check-in phiếu khám</h1>
        <p className="text-slate-gray text-sm">
          Quét QR có chữ ký hoặc nhập mã phiếu để đối chiếu trước khi xác nhận.
        </p>
      </header>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-ink-navy flex items-center gap-2 text-lg font-bold">
            <ScanLine size={20} /> Quét mã QR
          </h2>
          <div className="bg-pebble flex aspect-video items-center justify-center overflow-hidden rounded-lg">
            <video
              ref={video}
              muted
              playsInline
              className={cameraOn ? 'h-full w-full object-cover' : 'hidden'}
            />
            {!cameraOn ? <Camera className="text-slate-gray size-10" aria-hidden /> : null}
          </div>
          <Button
            onClick={cameraOn ? stopCamera : startCamera}
            variant={cameraOn ? 'outline' : 'primary'}
            className="w-full"
          >
            {cameraOn ? (
              <>
                <CameraOff size={18} /> Tắt camera
              </>
            ) : (
              <>
                <Camera size={18} /> Bật camera
              </>
            )}
          </Button>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-ink-navy flex items-center gap-2 text-lg font-bold">
            <Keyboard size={20} /> Nhập mã phiếu
          </h2>
          <p className="text-slate-gray text-sm">
            Dùng khi thiết bị không hỗ trợ quét. Kiểm tra phiếu giấy hoặc màn hình của bệnh nhân.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void lookup({ code: manualCode.trim().toUpperCase() });
            }}
            className="space-y-3"
          >
            <FormField id="a06-manual-code" label="Mã đặt khám">
              <input
                id="a06-manual-code"
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="MQ…"
                className="border-border h-11 w-full rounded-md border px-3 uppercase"
              />
            </FormField>
            <Button
              type="submit"
              disabled={busy || manualCode.trim().length < 8}
              variant="outline"
              className="w-full"
            >
              Tra phiếu
            </Button>
          </form>
        </Card>
      </div>
      {found ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-slate-gray text-sm">Phiếu {found.code}</p>
              <h2 className="text-ink-navy text-xl font-bold">{found.patientName}</h2>
            </div>
            <Badge tone={found.checkedInAt ? 'success' : found.status === 'DA_CO_STT' ? 'info' : 'warning'}>
              <CheckCircle2 size={14} />{' '}
              {found.checkedInAt ? 'Đã đến' : found.status === 'DA_CO_STT' ? 'Chưa đến' : 'Chưa đủ điều kiện'}
            </Badge>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-gray">Cơ sở · khoa</dt>
              <dd>
                {found.facilityName} · {found.specialtyName}
              </dd>
            </div>
            <div>
              <dt className="text-slate-gray">Phòng · STT</dt>
              <dd>
                {found.roomName} · <strong>{found.stt ?? 'Chưa có'}</strong>
              </dd>
            </div>
            <div>
              <dt className="text-slate-gray">Ngày · giờ</dt>
              <dd>
                {formatDate(found.examDate)} · {found.slotLabel}
              </dd>
            </div>
            <div>
              <dt className="text-slate-gray">Thanh toán · đối tượng</dt>
              <dd>
                {found.payMethod === 'ONLINE'
                  ? 'Đã thanh toán online'
                  : `Tại viện ${formatMoney(found.amount)}`}{' '}
                · {found.objectType}
              </dd>
            </div>
          </dl>
          {found.checkedInAt ? (
            <p className="text-success text-sm">Đã check-in lúc {formatDateTime(found.checkedInAt)}</p>
          ) : (
            <Button onClick={confirm} disabled={busy || found.status !== 'DA_CO_STT'}>
              <CheckCircle2 size={18} /> Xác nhận đã đến
            </Button>
          )}
        </Card>
      ) : null}
    </div>
  );
}

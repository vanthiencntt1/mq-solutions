'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { UpdateProfileSchema } from '@/lib/domain/account/schemas';

export interface ProfileView {
  nameMasked: string;
  birthYear: number;
  gender: number;
  cccdMasked: string;
  phoneMasked: string;
  email: string;
  addressLine: string;
  insuranceNoMasked: string;
}

// Thông tin cá nhân – C01 mục 7. CCCD, họ tên, năm sinh, giới tính chỉ xem (sửa qua hỗ trợ, A05).
export function ProfileForm({ profile }: { profile: ProfileView }) {
  const [current, setCurrent] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setError,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      phone: '',
      email: profile.email,
      addressLine: profile.addressLine,
      insuranceNo: '',
    },
  });
  const emailChanged = watch('email') !== current.email;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSaved(false);
    try {
      const body = { ...values, insuranceNo: values.insuranceNo || undefined };
      const p = await apiFetch<ProfileView>('/api/me', { method: 'PATCH', body });
      setCurrent(p);
      setValue('phone', '');
      setValue('insuranceNo', '');
      setValue('currentPassword', '');
      setSaved(true);
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'AUTH_WRONG_PASSWORD') setError('currentPassword', { message: 'Mật khẩu không đúng' });
      else setServerError(err.message);
    }
  });

  const readonly: [string, string][] = [
    ['Họ và tên', current.nameMasked],
    ['Số CCCD', current.cccdMasked],
    ['Năm sinh', String(current.birthYear)],
    ['Giới tính', current.gender === 1 ? 'Nam' : 'Nữ'],
  ];

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-1 text-[18px] font-semibold">Thông tin định danh</h2>
        <p className="text-body-sm text-slate-gray mb-4">
          Dùng để đối chiếu hồ sơ tại cơ sở. Cần sửa, vui lòng liên hệ hotline hoặc quầy hỗ trợ.
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          {readonly.map(([k, v]) => (
            <div key={k}>
              <dt className="text-caption text-slate-gray">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <h2 className="text-[18px] font-semibold">Liên hệ và địa chỉ</h2>
          {saved && <Alert tone="success">Đã lưu thay đổi.</Alert>}
          {serverError && <Alert tone="danger">{serverError}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="phone"
              label="Số điện thoại mới"
              error={errors.phone?.message}
              hint={`Đang lưu: ${current.phoneMasked}. Chỉ nhập khi cần thay đổi.`}
            >
              <Input id="phone" type="tel" maxLength={10} autoComplete="off" {...register('phone')} />
            </FormField>
            <FormField id="email" label="Gmail" error={errors.email?.message}>
              <Input id="email" type="email" {...register('email')} />
            </FormField>
          </div>
          {emailChanged && (
            <FormField
              id="currentPassword"
              label="Nhập mật khẩu để đổi Gmail"
              error={errors.currentPassword?.message}
            >
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...register('currentPassword')}
              />
            </FormField>
          )}
          <FormField
            id="addressLine"
            label="Địa chỉ"
            error={errors.addressLine?.message}
            hint="Số nhà, đường, phường / xã, tỉnh / thành"
          >
            <Input id="addressLine" {...register('addressLine')} />
          </FormField>
          <FormField
            id="insuranceNo"
            label="Số thẻ BHYT"
            error={errors.insuranceNo?.message}
            hint={
              current.insuranceNoMasked
                ? `Đang lưu: ${current.insuranceNoMasked}. Nhập số mới để thay.`
                : 'Không bắt buộc'
            }
          >
            <Input id="insuranceNo" maxLength={15} className="uppercase" {...register('insuranceNo')} />
          </FormField>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

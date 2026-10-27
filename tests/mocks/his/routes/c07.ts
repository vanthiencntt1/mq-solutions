// C07: CompletePayment của PKHNEW nhận cùng booking payload với PostBooking.
export const routes: Record<string, (body: Record<string, unknown>) => unknown> = {
  'Booking/CompletePayment': (body) => ({
    id: body.id,
    booking_number: body.booking_number,
    amount: body.amount,
    transaction_code_tt: body.transaction_code_tt,
    transaction_code_gd: body.transaction_code_gd,
  }),
};

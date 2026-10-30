// ISO 4217 codes for common world currencies with their minor-unit digits.
export const CURRENCY_DECIMALS: Record<string, number> = {
  AED: 2, ARS: 2, AUD: 2, BDT: 2, BGN: 2, BHD: 3, BRL: 2, CAD: 2, CHF: 2, CLP: 0,
  CNY: 2, COP: 2, CZK: 2, DKK: 2, EGP: 2, EUR: 2, GBP: 2, GHS: 2, HKD: 2, HUF: 2,
  IDR: 2, ILS: 2, INR: 2, ISK: 0, JOD: 3, JPY: 0, KES: 2, KRW: 0, KWD: 3, LKR: 2,
  MAD: 2, MXN: 2, MYR: 2, NGN: 2, NOK: 2, NPR: 2, NZD: 2, OMR: 3, PEN: 2, PHP: 2,
  PKR: 2, PLN: 2, QAR: 2, RON: 2, RSD: 2, RUB: 2, SAR: 2, SEK: 2, SGD: 2, THB: 2,
  TRY: 2, TWD: 2, TZS: 2, UAH: 2, UGX: 0, USD: 2, VND: 0, XAF: 0, XOF: 0, ZAR: 2,
};

export const CURRENCY_CODES = Object.keys(CURRENCY_DECIMALS);

export function isCurrency(code: string): boolean {
  return code in CURRENCY_DECIMALS;
}

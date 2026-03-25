/**
 * useCurrency.js
 *
 * Single source of truth for currency display across the entire app.
 *
 * Rules:
 *   - Data is ALWAYS stored in INR in the database
 *   - INR selected  → display as ₹ with no conversion
 *   - USD selected  → divide by 90, display as $
 *   - EUR / GBP     → display as ₹ (no conversion, unsupported)
 *
 * Usage:
 *   const { format, symbol, currency } = useCurrency();
 *   format(968)        → "₹968.00"  (INR)
 *   format(968)        → "$10.76"   (USD)
 *   formatRaw(968)     → 968        (INR)  or  10.76  (USD)
 */

import { useAuth } from '../context/AuthContext';

const USD_RATE = 90; // 1 USD = 90 INR (fixed round figure)

const CONFIG = {
  INR: {
    symbol:   '₹',
    locale:   'en-IN',
    code:     'INR',
    convert:  (inr) => inr,
    revert:   (val) => val,
    decimals: 2,
  },
  USD: {
    symbol:   '$',
    locale:   'en-US',
    code:     'USD',
    convert:  (inr) => inr / USD_RATE,
    revert:   (usd) => usd * USD_RATE,
    decimals: 2,
  },
};

export function useCurrency() {
  const { user } = useAuth();

  // Read currency from user settings. Default = INR.
  const rawCurrency = user?.settings?.currency || 'INR';

  // Only INR and USD are actively supported for conversion.
  // EUR / GBP fall back to INR display.
  const currency = CONFIG[rawCurrency] ? rawCurrency : 'INR';
  const cfg      = CONFIG[currency];

  /**
   * format(inrAmount, options?)
   * Converts from INR to display currency and returns a formatted string.
   *
   * @param {number} inrAmount  - raw INR value from DB
   * @param {object} [opts]
   * @param {boolean} [opts.compact]   - use K/M shorthand (e.g. ₹1.2K)
   * @param {boolean} [opts.noDecimal] - force 0 decimal places
   * @returns {string}
   */
  const format = (inrAmount, opts = {}) => {
    if (inrAmount === null || inrAmount === undefined || isNaN(Number(inrAmount))) {
      return `${cfg.symbol}0.00`;
    }

    const value = cfg.convert(Number(inrAmount));

    if (opts.compact) {
      if (value >= 1_000_000) return `${cfg.symbol}${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000)     return `${cfg.symbol}${(value / 1_000).toFixed(1)}K`;
    }

    const decimals = opts.noDecimal ? 0 : cfg.decimals;

    const formatted = value.toLocaleString(cfg.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return `${cfg.symbol}${formatted}`;
  };

  /**
   * formatRaw(inrAmount)
   * Returns the numeric converted value (no string formatting).
   * Useful for calculations that need to show the converted number.
   */
  const formatRaw = (inrAmount) => {
    if (!inrAmount) return 0;
    return cfg.convert(Number(inrAmount));
  };

  /**
   * toINR(displayValue)
   * Converts display-currency value BACK to INR.
   * Used if you ever need to re-store a value after UI conversion.
   */
  const toINR = (displayValue) => cfg.revert(Number(displayValue));

  return {
    format,
    formatRaw,
    toINR,
    symbol:   cfg.symbol,
    currency,
    isUSD:    currency === 'USD',
    isINR:    currency === 'INR',
    rate:     currency === 'USD' ? USD_RATE : 1,
  };
}
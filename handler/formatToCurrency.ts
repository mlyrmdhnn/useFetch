export const resolveCurrency = (amount: number, country: string = 'id-ID') => {
  const formatter = new Intl.NumberFormat(country, {
    style: 'currency',
    currency:
      country === 'en-US'
        ? 'USD'
        : country === 'de-DE'
          ? 'EUR'
          : country === 'ja-JP'
            ? 'JPY'
            : country === 'id-ID'
              ? 'IDR'
              : 'USD',
  })
  return formatter.format(amount)
}

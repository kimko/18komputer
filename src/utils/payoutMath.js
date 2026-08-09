export const SHARE_COUNTS = [10, 5];

// Half pay rounds the shareholders up; the company keeps whatever is left over.
export const calculatePayout = (revenue, totalShares = 10, isHalfPay = false) => {
  const shares = totalShares || 10;
  const pool = isHalfPay ? revenue / 2 : revenue;
  const perShare = isHalfPay ? Math.ceil(pool / shares) : Math.floor(pool / shares);
  const distributed = perShare * shares;

  return {
    perShare,
    distributed,
    companyKeeps: revenue - distributed
  };
};

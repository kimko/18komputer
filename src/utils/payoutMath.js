// Half pay is a rule most titles do not have. It is not the same as withholding, which pays the
// company everything and needs no calculating.
export const allowsHalfPay = (staticConfig) => staticConfig?.allowsHalfPay === true;

// Half pay rounds the shareholders up; the company keeps whatever is left over.
export const calculatePayout = (revenue, totalShares = 10, isHalfPay = false) => {
  const shares = totalShares || 10;

  // A 2 share company has a single holder, so half pay is a straight split, not a dividend per share.
  if (shares === 2) {
    const distributed = isHalfPay ? Math.ceil(revenue / 2) : revenue;
    return { perShare: distributed, distributed, companyKeeps: revenue - distributed };
  }

  const pool = isHalfPay ? revenue / 2 : revenue;
  const perShare = isHalfPay ? Math.ceil(pool / shares) : Math.floor(pool / shares);
  const distributed = perShare * shares;

  return {
    perShare,
    distributed,
    companyKeeps: revenue - distributed
  };
};

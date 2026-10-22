/** Pure commission and credit-note maths. Prices stay GST-inclusive paise. */

export function soleAgentId(agentIds: Array<string | null | undefined>): string | null {
  const ids = [...new Set(agentIds.map((id) => (id || "").trim()).filter(Boolean))];
  return ids.length === 1 ? ids[0] : null;
}

/** Round half away from zero via Math.round. Zero or an out-of-range percent pays nothing. */
export function commissionPaise(totalPaise: number, percent: number): number {
  const total = Math.max(0, Math.floor(totalPaise));
  const rate = Math.floor(Number(percent));
  if (!Number.isInteger(rate) || rate <= 0 || rate > 100) return 0;
  return Math.round((total * rate) / 100);
}

export type CreditParts = {
  amountPaise: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
};

/**
 * A full credit copies the order tax. A partial credit scales the tax lines
 * and leaves the remainder on taxable so the parts still add up to the amount.
 */
export function scaleCredit(input: {
  amountPaise: number;
  totalPaise: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
}): CreditParts {
  const total = Math.max(0, Math.floor(input.totalPaise));
  const amount = Math.min(total, Math.max(0, Math.floor(input.amountPaise)));
  if (amount <= 0 || total <= 0) {
    return { amountPaise: 0, taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, igstPaise: 0 };
  }
  if (amount >= total) {
    return {
      amountPaise: total,
      taxablePaise: Math.max(0, Math.floor(input.taxablePaise)),
      cgstPaise: Math.max(0, Math.floor(input.cgstPaise)),
      sgstPaise: Math.max(0, Math.floor(input.sgstPaise)),
      igstPaise: Math.max(0, Math.floor(input.igstPaise))
    };
  }
  const scale = (value: number) => Math.max(0, Math.round((Math.max(0, Math.floor(value)) * amount) / total));
  let cgstPaise = scale(input.cgstPaise);
  let sgstPaise = scale(input.sgstPaise);
  let igstPaise = scale(input.igstPaise);
  let taxablePaise = amount - cgstPaise - sgstPaise - igstPaise;
  if (taxablePaise < 0) {
    let debt = -taxablePaise;
    taxablePaise = 0;
    const take = (value: number) => {
      const used = Math.min(value, debt);
      debt -= used;
      return value - used;
    };
    igstPaise = take(igstPaise);
    sgstPaise = take(sgstPaise);
    cgstPaise = take(cgstPaise);
  }
  return { amountPaise: amount, taxablePaise, cgstPaise, sgstPaise, igstPaise };
}

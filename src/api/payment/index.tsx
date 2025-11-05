const endpoint = import.meta.env.VITE_ENDPOINT || "http://localhost:3000";

export const createOnlinePayment = async (
  appointmentId: string,
  type: "Full" | "Downpayment"
) => {
  const res = await fetch(`${endpoint}/payment/online`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ appointmentId, type }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create online payment session");
  }

  return res.json();
};

export const createCashPayment = async (
  appointmentId: string,
  type: "Full" | "Downpayment" | "Balance" | "Refund",
  amount: number,
  remarks?: string
) => {
  const res = await fetch(`${endpoint}/payment/cash`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      appointmentId,
      type,
      amount,
      remarks,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create cash payment");
  }

  return res.json();
};

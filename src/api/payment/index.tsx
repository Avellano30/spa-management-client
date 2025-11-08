const endpoint = import.meta.env.VITE_ENDPOINT || "http://localhost:3000";

export interface Payment {
  _id: string;
  appointmentId: string;
  amount: number;
  method: string;
  type: "Balance" | "Downpayment" | "Full" | "Refund";
  status: "Pending" | "Completed" | "Failed";
  transactionId?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export const createOnlinePayment = async (
  appointmentId: string,
  type: "Full" | "Downpayment" | "Balance"
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

export function getNextPaymentType(payments: Payment[]): "Downpayment" | "Balance" | "Full" | null {
  if (!payments?.length) return "Balance";
  const last = payments[payments.length - 1];

  if (last.type === "Downpayment" && last.status === "Completed") return "Balance";
  if (last.type === "Full" || last.type === "Balance") return null;

  // if the last one is still pending, block further payments
  return null;
}
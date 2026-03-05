const endpoint = import.meta.env.VITE_ENDPOINT || "http://localhost:3000";

export interface Employee {
  _id: string;
  name: string;
  imageUrl: string;
  imagePublicId: string;
  status: "available" | "unavailable";
}

export async function getAllEmployees(): Promise<Employee[]> {
  const res = await fetch(`${endpoint}/employees`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

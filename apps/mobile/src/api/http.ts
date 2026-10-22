export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function readData<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as {
    data?: T;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new ApiError(res.status, json.error?.message || "Something went wrong");
  }
  return json.data as T;
}

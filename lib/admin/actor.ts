export type AdminActor = {
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    role: string;
  };
  device: {
    id: string;
    status: "PENDING" | "ACTIVE" | "REVOKED";
    name: string;
    platform: string;
  };
  ip: string;
};

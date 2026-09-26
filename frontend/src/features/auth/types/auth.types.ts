export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterCustomerPayload = {
  email: string;
  password: string;
  confirm_password: string;
  full_name: string;
  phone: string;
  address: string;
};

export type RegisterFarmerPayload = {
  email: string;
  password: string;
  confirm_password: string;
  stall_name: string;
  contact_person: string;
  phone: string;
  address: string;
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

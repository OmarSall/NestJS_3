export class UserDto {
  email: string;
  name: string;
  password: string;
  phoneNumber?: string | null;
  address?: {
    street: string;
    city: string;
    country: string;
  };
}

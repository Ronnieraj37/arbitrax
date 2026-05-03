import { BadRequestException, Headers } from '@nestjs/common';

export function requireUserEmail(
  headers: Record<string, string | string[] | undefined>,
) {
  const v = headers['x-user-email'];
  const email = Array.isArray(v) ? v[0] : v;
  if (!email) throw new BadRequestException('Missing x-user-email header');
  return email;
}

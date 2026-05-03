import crypto from "crypto";
import { prisma } from "./prisma";

export function generateApiKeyPair(): { key: string; secret: string } {
  const key = `ak_${crypto.randomBytes(24).toString("hex")}`;
  const secret = `sk_${crypto.randomBytes(32).toString("hex")}`;
  return { key, secret };
}

export async function createApiKey(
  userId: string,
  botId?: string,
  label?: string,
) {
  const { key, secret } = generateApiKeyPair();
  const hashedSecret = crypto.createHash("sha256").update(secret).digest("hex");

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      botId,
      key,
      secret: hashedSecret,
      label: label ?? "default",
    },
  });

  // Return unhashed secret only on creation - user must save it
  return { ...apiKey, secret };
}

export async function verifyApiKey(
  key: string,
  secret: string,
): Promise<string | null> {
  const apiKey = await prisma.apiKey.findUnique({ where: { key } });
  if (!apiKey || !apiKey.isActive) return null;

  const hashedSecret = crypto.createHash("sha256").update(secret).digest("hex");
  if (hashedSecret !== apiKey.secret) return null;

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsed: new Date() },
  });

  return apiKey.userId;
}

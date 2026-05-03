import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      // Phase 2: persistence moves to Nest backend.
      // Keep sign-in non-blocking; backend can upsert user/subscription asynchronously.
      if (account?.provider === "google") {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (base) {
          try {
            await fetch(`${base.replace(/\/$/, "")}/v1/auth/on-sign-in`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                email: user.email,
                name: user.name,
                image: user.image,
              }),
            });
          } catch {
            // ignore - do not block sign-in
          }
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/sign-in",
  },
});

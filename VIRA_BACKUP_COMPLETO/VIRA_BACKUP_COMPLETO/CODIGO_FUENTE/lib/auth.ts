
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

// Sistema de autenticación simplificado para desarrollo/demo
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // Autenticación simplificada para desarrollo
        // En producción deberías validar con tu base de datos
        if (credentials?.email && credentials?.password) {
          const user = {
            id: 'demo-user-1',
            email: credentials.email,
            name: 'Usuario VIRA',
            role: 'admin'
          }
          return user
        }
        return null
      }
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return true // Permitir todos los logins en desarrollo
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub
        session.user.role = 'admin' // Dar rol de admin por defecto
      }
      return session
    },
    async jwt({ user, token }) {
      if (user) {
        token.sub = user.id
        token.role = user.role
      }
      return token
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-key',
  pages: {
    signIn: '/auth/signin',
  },
}

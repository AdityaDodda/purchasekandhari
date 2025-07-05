import { PrismaClient } from "@prisma/client";
import { Store } from "express-session";

export class PrismaSessionStore extends Store {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
  }

  async get(sid: string, callback: (err: any, session?: any) => void) {
    try {
      const session = await this.prisma.sessions.findUnique({
        where: { sid },
      });

      if (!session) {
        return callback(null, null);
      }

      // Check if session has expired
      if (session.expire < new Date()) {
        await this.destroy(sid, () => {});
        return callback(null, null);
      }

      callback(null, session.sess);
    } catch (error) {
      callback(error);
    }
  }

  async set(sid: string, session: any, callback: (err?: any) => void) {
    try {
      const expire = new Date(Date.now() + (session.cookie?.maxAge || 24 * 60 * 60 * 1000));
      
      await this.prisma.sessions.upsert({
        where: { sid },
        update: {
          sess: session,
          expire,
        },
        create: {
          sid,
          sess: session,
          expire,
        },
      });

      callback();
    } catch (error) {
      callback(error);
    }
  }

  async destroy(sid: string, callback: (err?: any) => void) {
    try {
      await this.prisma.sessions.delete({
        where: { sid },
      });
      callback();
    } catch (error) {
      callback(error);
    }
  }

  async touch(sid: string, session: any, callback: (err?: any) => void) {
    try {
      const expire = new Date(Date.now() + (session.cookie?.maxAge || 24 * 60 * 60 * 1000));
      
      await this.prisma.sessions.update({
        where: { sid },
        data: {
          sess: session,
          expire,
        },
      });

      callback();
    } catch (error) {
      callback(error);
    }
  }

  async all(callback: (err: any, sessions?: any) => void) {
    try {
      const sessions = await this.prisma.sessions.findMany();
      const result: { [key: string]: any } = {};
      
      sessions.forEach(session => {
        result[session.sid] = session.sess;
      });

      callback(null, result);
    } catch (error) {
      callback(error);
    }
  }

  async clear(callback: (err?: any) => void) {
    try {
      await this.prisma.sessions.deleteMany();
      callback();
    } catch (error) {
      callback(error);
    }
  }

  async length(callback: (err: any, length?: number) => void) {
    try {
      const count = await this.prisma.sessions.count();
      callback(null, count);
    } catch (error) {
      callback(error);
    }
  }
} 
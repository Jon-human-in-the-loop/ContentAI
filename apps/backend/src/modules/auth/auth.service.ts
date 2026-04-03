import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private email: EmailService,
  ) {}

  async register(data: {
    email: string;
    password: string;
    name: string;
    organizationName: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const slug = data.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Create org and user in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: data.organizationName, slug },
      });

      const user = await tx.user.create({
        data: {
          orgId: org.id,
          email: data.email,
          passwordHash,
          name: data.name,
          role: 'OWNER',
        },
      });

      return { org, user };
    });

    const token = this.generateToken(result.user.id, result.org.id, 'OWNER');

    // Send welcome email (fire-and-forget)
    this.email.sendWelcome(result.user.email, result.user.name, result.org.name).catch(() => {});

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      organization: {
        id: result.org.id,
        name: result.org.name,
        slug: result.org.slug,
      },
      token,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.orgId, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        plan: user.organization.plan,
      },
      token,
    };
  }

  private generateToken(userId: string, orgId: string, role: string): string {
    return this.jwtService.sign({ sub: userId, orgId, role });
  }
}

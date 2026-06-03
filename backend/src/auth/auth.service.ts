import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { randomInt } from 'crypto';
import { UsersService } from '../users/users.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { USER_STATUS_ACTIVE } from '../users/user.constants';
import { normalizeEmail, sanitizeUser } from '../users/user-response.util';
import { RegisterDto } from './dto/register.dto';
import { ROLE_STANDARD_USER } from './roles.constants';

@Injectable()
export class AuthService {
  private readonly resetRequestAttempts = new Map<string, number[]>();
  private readonly resetVerifyAttempts = new Map<string, number[]>();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private activityLogs: ActivityLogsService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) throw new UnauthorizedException('Email hoáº·c máº­t kháº©u khÃ´ng Ä‘Ãºng');
    if (user.status !== USER_STATUS_ACTIVE) throw new UnauthorizedException('TÃ i khoáº£n Ä‘Ã£ bá»‹ vÃ´ hiá»‡u hÃ³a');

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw new UnauthorizedException('Email hoáº·c máº­t kháº©u khÃ´ng Ä‘Ãºng');

    return sanitizeUser(user);
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const payload = { sub: user.user_id, email: user.email, role_id: user.role_id };
    await this.activityLogs.log(user.user_id, 'LOGIN', 'users', user.user_id, `ÄÄƒng nháº­p: ${user.email}`);
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(dto: RegisterDto) {
    const normalizedEmail = normalizeEmail(dto.email);
    const existing = await this.usersService.findByEmail(normalizedEmail);
    if (existing) throw new ConflictException('Email Ä‘Ã£ tá»“n táº¡i');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        role_id: ROLE_STANDARD_USER,
        full_name: dto.full_name,
        email: normalizedEmail,
        phone: dto.phone,
        password_hash: hashed,
        status: USER_STATUS_ACTIVE,
      },
      include: { role: true },
    });
    await this.activityLogs.log(user.user_id, 'REGISTER', 'users', user.user_id, `ÄÄƒng kÃ½ tai khoan: ${user.email}`);

    const safeUser = sanitizeUser(user);
    return { message: 'ÄÄƒng kÃ½ tai khoan thanh cong', user: safeUser };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = normalizeEmail(email);
    this.assertRateLimit(
      this.resetRequestAttempts,
      normalizedEmail,
      3,
      15 * 60 * 1000,
      'Báº¡n Ä‘Ã£ yÃªu cáº§u mÃ£ quÃ¡ nhiá»u láº§n. Vui lÃ²ng thá»­ láº¡i sau.',
    );

    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      return { message: 'Neu email ton tai, ma xac nhan se duoc gui den hop thu' };
    }

    const code = String(randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        password_reset_code_hash: codeHash,
        password_reset_expires_at: expiresAt,
      },
    });

    await this.sendResetCodeEmail(user.email, user.full_name, code);
    await this.activityLogs.log(user.user_id, 'PASSWORD_RESET_REQUEST', 'users', user.user_id, `YÃªu cáº§u dat lai mat khau: ${user.email}`);
    return { message: 'MÃ£ xÃ¡c nháº­n da duoc gui den email neu tai khoan hop le' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const normalizedEmail = normalizeEmail(email);
    this.assertRateLimit(
      this.resetVerifyAttempts,
      normalizedEmail,
      5,
      15 * 60 * 1000,
      'Báº¡n Ä‘Ã£ nháº­p mÃ£ sai quÃ¡ nhiá»u láº§n. Vui lÃ²ng yÃªu cáº§u mÃ£ má»›i sau.',
    );

    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user || !user.password_reset_code_hash || !user.password_reset_expires_at) {
      throw new UnauthorizedException('MÃ£ xÃ¡c nháº­n khÃ´ng há»£p lá»‡ hoac da het han');
    }
    if (user.password_reset_expires_at < new Date()) {
      throw new UnauthorizedException('MÃ£ xÃ¡c nháº­n da het han');
    }

    const isMatch = await bcrypt.compare(code, user.password_reset_code_hash);
    if (!isMatch) throw new UnauthorizedException('MÃ£ xÃ¡c nháº­n khÃ´ng Ä‘Ãºng');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        password_hash: hashed,
        password_reset_code_hash: null,
        password_reset_expires_at: null,
      },
    });
    await this.activityLogs.log(user.user_id, 'PASSWORD_RESET', 'users', user.user_id, `Äáº·t láº¡i máº­t kháº©u: ${user.email}`);
    this.resetVerifyAttempts.delete(normalizedEmail);
    return { message: 'Äáº·t láº¡i máº­t kháº©u thÃ nh cÃ´ng' };
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await this.usersService.findOne(userId);
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) throw new UnauthorizedException('Máº­t kháº©u cu khong dung');
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashed);
    await this.activityLogs.log(userId, 'PASSWORD_CHANGE', 'users', userId, `Doi mat khau: ${user.email}`);
    return { message: 'Äá»•i máº­t kháº©u thÃ nh cÃ´ng' };
  }

  private async sendResetCodeEmail(to: string, fullName: string, code: string) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass || !from) {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException('ChÆ°a cáº¥u hÃ¬nh SMTP Ä‘á»ƒ gá»­i mÃ£ Ä‘áº·t láº¡i máº­t kháº©u');
      }
      console.warn(`[PASSWORD_RESET_CODE] ${to}: ${code}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to,
      subject: 'Ma dat lai mat khau he thong biÃªn báº£n hop',
      text: `Xin chÃ o ${fullName},\n\nMÃ£ Ä‘áº·t láº¡i máº­t kháº©u cá»§a báº¡n lÃ : ${code}\nMÃ£ cÃ³ hiá»‡u lá»±c trong 10 phÃºt.\n\nNáº¿u báº¡n khÃ´ng yÃªu cáº§u, vui lÃ²ng bá» qua email nÃ y.`,
    });
  }

  private assertRateLimit(
    store: Map<string, number[]>,
    key: string,
    maxAttempts: number,
    windowMs: number,
    message: string,
  ) {
    const now = Date.now();
    const attempts = (store.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
    if (attempts.length >= maxAttempts) {
      store.set(key, attempts);
      throw new BadRequestException(message);
    }
    attempts.push(now);
    store.set(key, attempts);
  }
}

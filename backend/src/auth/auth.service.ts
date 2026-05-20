import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { randomInt } from 'crypto';
import { UsersService } from '../users/users.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

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
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    if (user.status !== 'active') throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    const { password_hash, password_reset_code_hash, password_reset_expires_at, ...result } = user;
    return result;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const payload = { sub: user.user_id, email: user.email, role_id: user.role_id };
    await this.activityLogs.log(user.user_id, 'LOGIN', 'users', user.user_id, `Đăng nhập: ${user.email}`);
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email đã tồn tại');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        role_id: 4,
        full_name: dto.full_name,
        email: dto.email,
        phone: dto.phone,
        password_hash: hashed,
        status: 'active',
      },
      include: { role: true },
    });
    await this.activityLogs.log(user.user_id, 'REGISTER', 'users', user.user_id, `Đăng ký tai khoan: ${user.email}`);

    const { password_hash, password_reset_code_hash, password_reset_expires_at, ...safeUser } = user;
    return { message: 'Đăng ký tai khoan thanh cong', user: safeUser };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.toLowerCase();
    this.assertRateLimit(
      this.resetRequestAttempts,
      normalizedEmail,
      3,
      15 * 60 * 1000,
      'Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau.',
    );

    const user = await this.usersService.findByEmail(email);
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
    await this.activityLogs.log(user.user_id, 'PASSWORD_RESET_REQUEST', 'users', user.user_id, `Yêu cầu dat lai mat khau: ${user.email}`);
    return { message: 'Mã xác nhận da duoc gui den email neu tai khoan hop le' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const normalizedEmail = email.toLowerCase();
    this.assertRateLimit(
      this.resetVerifyAttempts,
      normalizedEmail,
      5,
      15 * 60 * 1000,
      'Bạn đã nhập mã sai quá nhiều lần. Vui lòng yêu cầu mã mới sau.',
    );

    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password_reset_code_hash || !user.password_reset_expires_at) {
      throw new UnauthorizedException('Mã xác nhận không hợp lệ hoac da het han');
    }
    if (user.password_reset_expires_at < new Date()) {
      throw new UnauthorizedException('Mã xác nhận da het han');
    }

    const isMatch = await bcrypt.compare(code, user.password_reset_code_hash);
    if (!isMatch) throw new UnauthorizedException('Mã xác nhận không đúng');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        password_hash: hashed,
        password_reset_code_hash: null,
        password_reset_expires_at: null,
      },
    });
    await this.activityLogs.log(user.user_id, 'PASSWORD_RESET', 'users', user.user_id, `Đặt lại mật khẩu: ${user.email}`);
    this.resetVerifyAttempts.delete(normalizedEmail);
    return { message: 'Đặt lại mật khẩu thành công' };
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await this.usersService.findOne(userId);
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) throw new UnauthorizedException('Mật khẩu cu khong dung');
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashed);
    await this.activityLogs.log(userId, 'PASSWORD_CHANGE', 'users', userId, `Doi mat khau: ${user.email}`);
    return { message: 'Đổi mật khẩu thành công' };
  }

  private async sendResetCodeEmail(to: string, fullName: string, code: string) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass || !from) {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException('Chưa cấu hình SMTP để gửi mã đặt lại mật khẩu');
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
      subject: 'Ma dat lai mat khau he thong biên bản hop',
      text: `Xin chào ${fullName},\n\nMã đặt lại mật khẩu của bạn là: ${code}\nMã có hiệu lực trong 10 phút.\n\nNếu bạn không yêu cầu, vui lòng bỏ qua email này.`,
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

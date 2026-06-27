import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { randomInt } from 'crypto';
import { UsersService } from '../users/users.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { USER_STATUS_ACTIVE, USER_STATUS_PENDING_VERIFICATION } from '../users/user.constants';
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
    if (!user) throw new UnauthorizedException('Email không tồn tại trong hệ thống');
    if (user.status === USER_STATUS_PENDING_VERIFICATION) {
      throw new UnauthorizedException('Tài khoản chưa được xác thực email. Vui lòng kiểm tra email để xác thực.');
    }
    if (user.status !== USER_STATUS_ACTIVE) throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw new UnauthorizedException('Mật khẩu không đúng');

    return sanitizeUser(user);
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
    const normalizedEmail = normalizeEmail(dto.email);
    const existing = await this.usersService.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException('Email đã tồn tại');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const code = String(randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        role_id: ROLE_STANDARD_USER,
        full_name: dto.full_name,
        email: normalizedEmail,
        phone: dto.phone,
        password_hash: hashed,
        status: USER_STATUS_PENDING_VERIFICATION,
        register_otp_hash: codeHash,
        register_otp_expires_at: expiresAt,
      },
      include: { role: true },
    });

    await this.sendRegistrationOtpEmail(user.email, user.full_name, code);
    await this.activityLogs.log(
      user.user_id,
      'REGISTER',
      'users',
      user.user_id,
      `Đăng ký tài khoản (chờ xác thực email): ${user.email}`,
    );

    return {
      message: 'Mã xác nhận đã được gửi đến email của bạn. Vui lòng kiểm tra và nhập mã để hoàn tất đăng ký.',
      email: normalizedEmail,
    };
  }

  async verifyRegistrationOtp(email: string, code: string) {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user || !user.register_otp_hash || !user.register_otp_expires_at) {
      throw new BadRequestException('Không tìm thấy yêu cầu xác thực. Vui lòng đăng ký lại.');
    }
    if (user.status !== USER_STATUS_PENDING_VERIFICATION) {
      throw new BadRequestException('Tài khoản đã được xác thực trước đó.');
    }
    if (user.register_otp_expires_at < new Date()) {
      throw new BadRequestException('Mã xác nhận đã hết hạn. Vui lòng yêu cầu mã mới.');
    }

    const isMatch = await bcrypt.compare(code, user.register_otp_hash);
    if (!isMatch) throw new BadRequestException('Mã xác nhận không đúng');

    await this.prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        status: USER_STATUS_ACTIVE,
        register_otp_hash: null,
        register_otp_expires_at: null,
        email_verified_at: new Date(),
      },
    });

    await this.activityLogs.log(
      user.user_id,
      'EMAIL_VERIFIED',
      'users',
      user.user_id,
      `Xác thực email thành công: ${user.email}`,
    );

    return { message: 'Xác thực email thành công. Bạn có thể đăng nhập ngay.' };
  }

  async resendRegistrationOtp(email: string) {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new NotFoundException('Email chưa được đăng ký trong hệ thống');
    }
    if (user.status !== USER_STATUS_PENDING_VERIFICATION) {
      throw new BadRequestException('Tài khoản đã được xác thực hoặc không ở trạng thái chờ xác thực.');
    }

    const code = String(randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        register_otp_hash: codeHash,
        register_otp_expires_at: expiresAt,
      },
    });

    await this.sendRegistrationOtpEmail(user.email, user.full_name, code);
    await this.activityLogs.log(
      user.user_id,
      'REGISTER_OTP_RESENT',
      'users',
      user.user_id,
      `Yêu cầu gửi lại mã xác thực: ${user.email}`,
    );

    return { message: 'Mã xác nhận mới đã được gửi đến email của bạn.' };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = normalizeEmail(email);
    this.assertRateLimit(
      this.resetRequestAttempts,
      normalizedEmail,
      3,
      15 * 60 * 1000,
      'Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau.',
    );

    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new NotFoundException('Email chưa được đăng ký trong hệ thống');
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
    await this.activityLogs.log(user.user_id, 'PASSWORD_RESET_REQUEST', 'users', user.user_id, `Yêu cầu đặt lại mật khẩu: ${user.email}`);
    return { message: 'Mã xác nhận đã được gửi đến email nếu tài khoản hợp lệ' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const normalizedEmail = normalizeEmail(email);
    this.assertRateLimit(
      this.resetVerifyAttempts,
      normalizedEmail,
      5,
      15 * 60 * 1000,
      'Bạn đã nhập mã sai quá nhiều lần. Vui lòng yêu cầu mã mới sau.',
    );

    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user || !user.password_reset_code_hash || !user.password_reset_expires_at) {
      throw new UnauthorizedException('Mã xác nhận không hợp lệ hoặc đã hết hạn');
    }
    if (user.password_reset_expires_at < new Date()) {
      throw new UnauthorizedException('Mã xác nhận đã hết hạn');
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
    if (!isMatch) throw new UnauthorizedException('Mật khẩu cũ không đúng');
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashed);
    await this.activityLogs.log(userId, 'PASSWORD_CHANGE', 'users', userId, `Đổi mật khẩu: ${user.email}`);
    return { message: 'Đổi mật khẩu thành công' };
  }

  private async sendRegistrationOtpEmail(to: string, fullName: string, code: string) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass || !from) {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException('Chưa cấu hình SMTP để gửi mã xác thực');
      }
      console.warn(`[REGISTRATION_OTP] ${to}: ${code}`);
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
      subject: 'Mã xác thực đăng ký tài khoản - Biên bản họp',
      text: `Xin chào ${fullName},\n\nCảm ơn bạn đã đăng ký tài khoản trên hệ thống Biên bản họp.\n\nMã xác thực của bạn là: ${code}\nMã có hiệu lực trong 10 phút.\n\nNếu bạn không đăng ký, vui lòng bỏ qua email này.`,
    });
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
      subject: 'Mã đặt lại mật khẩu hệ thống biên bản họp',
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

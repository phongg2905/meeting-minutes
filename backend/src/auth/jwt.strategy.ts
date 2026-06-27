import { Injectable, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { USER_STATUS_ACTIVE } from '../users/user.constants';
import { sanitizeUser } from '../users/user-response.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { user_id: payload.sub },
        include: { role: true },
      });
      if (!user || user.status !== USER_STATUS_ACTIVE) {
        throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
      }
      return sanitizeUser(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const dbUnavailable = ['P1001', 'P1002', 'P1017'].includes(error.code);
        if (dbUnavailable) {
          throw new ServiceUnavailableException(
            'Hệ thống đang bảo trì hoặc database tạm thời không khả dụng. Vui lòng thử lại sau.',
          );
        }
      }
      throw new ServiceUnavailableException('Không thể kết nối đến hệ thống, vui lòng thử lại sau.');
    }
  }
}

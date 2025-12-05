import { FirebaseModule } from 'src/shared/services/firebase/firebase.module';
import { MailModule } from 'src/shared/services/mail/mail.module';
import { PermissionsModule } from 'src/permissions/permissions.module';
import { UsersModule } from 'src/users/users.module';

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailerEmailOtpSender, RedisOtpStore } from './providers';

@Module({
  imports: [
    UsersModule,
    MailModule,
    FirebaseModule,
    PermissionsModule, // Required for PermissionsGuard
    JwtModule.registerAsync({
      global: true,
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwt.secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RedisOtpStore, MailerEmailOtpSender],
})
export class AuthModule {}

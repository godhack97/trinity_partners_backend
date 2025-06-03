import { EmailConfirmModule } from "@api/email-confirmer/email-confirmer.module";
import { NewsModule } from "@api/news/news.module";
import { NotificationModule } from "@api/notification/notification.module";
import { ProfileModule } from "@api/profile/profile.module";
import { RoleGuard } from "@app/guards/role.guard";
import { HbsViewModule } from "@app/hbs-view/hbs-view.module";
import { SendsayModule } from "@app/sendsay/sendsay.module";
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from "node:path";
import { DataSource } from 'typeorm';
import { AuthModule } from './api/auth/auth.module';
import { UsersModule } from './api/users/users.module';
import { ConfiguratorModule } from './api/configurator/configurator.module';
import { RegistrationModule } from './api/registration/registration.module';
import { RoleModule } from './api/role/role.module';
import { UserModule } from './api/user/user.module';
import { UserTableSettingsModule } from './api/user-table-settings/user-table-settings.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthGuard } from './guards/auth.guard';
import { OrmModule } from './orm/orm.module';
import { AdminModule } from "./api/admin/admin.module";
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DealModule } from './api/deal/deal.module';
import { CustomerModule } from './api/customer/customer.module';
import { DistributorModule } from './api/distributor/distributor.module';
import { CompanyModule } from './api/company/company.module';
import { AuthTokenModule } from './services/auth-token/auth-token.module';
import { UploadFileModule } from './api/upload-file/upload-file.module';
import { UserEntity } from './orm/entities/user.entity';
import { UserToken } from './orm/entities/user-token.entity';
import { UserAction } from "./logs/user-action.entity";
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LogActionInterceptor } from './logs/log-action.interceptor';
import { LogsModule } from './logs/logs.module';

const is_development = !(process.env.NODE_ENV?.trim() == 'prod');
const envFilePath = `.env.${process.env.NODE_ENV?.trim() || 'dev'}`;


@Module({
  imports: [
    LogsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePath,
    }),
    TypeOrmModule.forFeature([UserAction]),
    TypeOrmModule.forRootAsync({
      imports: [
        ConfigModule,
        ServeStaticModule.forRoot({
          rootPath: join(__dirname, '../../', 'public'),
          serveRoot: '/public/',
        }),
      ],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: ['dist/**/*.entity{.ts,.js}'],
        synchronize: false,
        driver: require('mysql2') ,
        // logging: is_development ? ["query", "error"] : [],
        logging: false,
      }),
      inject: [ConfigService],
    }),
    HbsViewModule,
    SendsayModule,
    MailerModule.forRootAsync({
      useFactory: async(configService: ConfigService) => {
        console.log({
          EMAIL_SECURE: configService.get('EMAIL_SECURE')
        })
        return ({
          defaults: {
            from: 'partner@trinity.ru',
          },
          transport: {
            host: configService.get('EMAIL_HOST'),
            port: parseInt(configService.get('EMAIL_PORT'), 10) || 2525, // всегда число
            secure: configService.get('EMAIL_SECURE') === 'true',        // всегда boolean
            auth: {
              user: configService.get('EMAIL_USERNAME'),
              pass: configService.get('EMAIL_PASSWORD'),
            },
            debug: configService.get('EMAIL_DEBUG') === 'true',          // всегда boolean
            logger: true
          },
          //preview: true,
          template: {
            dir: path.join(process.env.PWD, 'templates'),
            adapter: new HandlebarsAdapter(
              { url: () => configService.get('FRONTEND_HOSTNAME') },
              { inlineCssEnabled: true }
            ),
            options: {
              strict: true,
            },
          },
        })
      },
      inject: [ConfigService],
    }),
    UserModule,
    UserTableSettingsModule,
    AuthModule,
    UsersModule,
    RoleModule,
    RegistrationModule,
    OrmModule,
    ConfiguratorModule,
    AdminModule,
    DealModule,
    CustomerModule,
    DistributorModule,
    CompanyModule,
    AuthTokenModule,
    UploadFileModule,
    ProfileModule,
    NotificationModule,
    EmailConfirmModule,
    NewsModule,
    UserToken,
    UserEntity
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LogActionInterceptor,
    },
  ],
})
export class AppModule {
  constructor(private dataSource: DataSource) {}
}

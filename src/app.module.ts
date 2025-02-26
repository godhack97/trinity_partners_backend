import { EmailConfirmModule } from "@api/email-confirmer/email-confirmer.module";
import { NewsModule } from "@api/news/news.module";
import { NotificationModule } from "@api/notification/notification.module";
import { ProfileModule } from "@api/profile/profile.module";
import { RoleGuard } from "@app/guards/role.guard";
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from "node:path";
import { DataSource } from 'typeorm';
import { AuthModule } from './api/auth/auth.module';
import { ConfiguratorModule } from './api/configurator/configurator.module';
import { RegistrationModule } from './api/registration/registration.module';
import { RoleModule } from './api/role/role.module';
import { UserModule } from './api/user/user.module';
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

const is_development = !(process.env.NODE_ENV?.trim() == 'prod');
const envFilePath = `.env.${process.env.NODE_ENV?.trim() || 'dev'}`;


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePath,
    }),
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
        logging: is_development ? ["query", "error"] : [],
      }),
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      useFactory: async(configService: ConfigService) => {
        console.log({
          EMAIL_SECURE: configService.get('EMAIL_SECURE')
        })
        return ({
          defaults: {
            from: configService.get('EMAIL_USERNAME'),
          },
          transport: {
            host: configService.get('EMAIL_HOST'),
            port: configService.get('EMAIL_PORT') || 465,
            secure: configService.get('EMAIL_SECURE'),
            auth: {
              user: configService.get('EMAIL_USERNAME'),
              pass: configService.get('EMAIL_PASSWORD'),
            },
            debug: configService.get('EMAIL_DEBUG') || false, // show debug output
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
    AuthModule,
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
    }
  ],
})
export class AppModule {
  constructor(private dataSource: DataSource) {}
}

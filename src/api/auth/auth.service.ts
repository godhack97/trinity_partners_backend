import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { EmailConfirmerMethod } from "@api/email-confirmer/types";
import { NewsService } from "@api/news/news.service";
import { NotificationService } from "@api/notification/notification.service";
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResetHashRepository } from '@orm/repositories/reset-hash.repository';
import { UserRepository } from 'src/orm/repositories/user.repository';
import { UserToken } from 'src/orm/entities/user-token.entity';
import { ResetHashEntity } from 'src/orm/entities/reset-hash.entity';
import {
  createCredentials,
  createPassword,
  createToken,
  verifyPassword,
} from 'src/utils/password';
import { AuthLoginRequestDto } from './dto/request/auth-login.request.dto';
import { RoleTypes } from "@app/types/RoleTypes";

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    @InjectRepository(ResetHashEntity)
    private readonly resetHashRepository: Repository<ResetHashEntity>,
    private readonly emailConfirmerService: EmailConfirmerService,
    private readonly notificationService: NotificationService,
    private readonly newsService: NewsService,

    @InjectRepository(UserToken)
    private readonly userTokenRepository: Repository<UserToken>,
  ) {}

  async login(authLoginDto: AuthLoginRequestDto, clientId: string) {
    let user = await this.userRepository.findByEmail(authLoginDto.email);
    if (!user) throw new UnauthorizedException();
  
    const isVerify = await verifyPassword({
      user_password: user.password,
      password: authLoginDto.password,
      salt: user.salt,
    });
    if (!isVerify) throw new UnauthorizedException();
  
    // Ищем запись user_id + client_id
    let userToken = await this.userTokenRepository.findOneBy({
      user_id: user.id,
      client_id: clientId,
    });
  
    if (userToken) {
      // Если токен уже есть — просто возвращаем его, не трогаем
      const token = userToken.token;
      if (user.role.name === RoleTypes.Partner) {
        user.owner_company = await user.lazy_owner_company;
      }
      return { token, user };
    }
  
    // Если нет — создаём новый токен
    const token = await createToken(user.salt);
  
    userToken = this.userTokenRepository.create({
      user_id: user.id,
      token,
      client_id: clientId,
    });
    await this.userTokenRepository.save(userToken);
  
    if (user.role.name === RoleTypes.Partner) {
      user.owner_company = await user.lazy_owner_company;
    }
  
    return { token, user };
  }

  async logout(authorization: string, clientId: string) {
    const token = authorization.substring(7);

    const tokenEntity = await this.userTokenRepository.findOneBy({ token, client_id: clientId });
    if (!tokenEntity) throw new UnauthorizedException();

    await this.userTokenRepository.delete({ token, client_id: clientId });
  }

  async check(authorization: string, clientId: string) {
    const token = authorization.substring(7);

    const tokenEntity = await this.userTokenRepository.findOneBy({ token, client_id: clientId });
    if (!tokenEntity) throw new UnauthorizedException();

    const user = await this.userRepository.findByIdWithCompanyEmployees(tokenEntity.user_id);
    if (!user) throw new HttpException(`Пользователь не найден`, HttpStatus.NOT_FOUND);

    const notifications = await this.notificationService.check(user.id);
    const notifications_unread = await this.notificationService.countUnread(user.id);
    const notifications_settings = await this.notificationService.getSettings(user.id);
    const news = await this.newsService.check();

    return {
      ...user,
      notifications,
      notifications_unread,
      notifications_settings,
      news
    };
  }

  async updatePassword(authorization: string, clientId: string, { password, newPassword }) {
    const token = authorization.substring(7);

    const tokenEntity = await this.userTokenRepository.findOneBy({ token, client_id: clientId });
    if (!tokenEntity) throw new UnauthorizedException();

    const user = await this.userRepository.findById(tokenEntity.user_id);
    if (!user) throw new UnauthorizedException();

    const isVerify = await verifyPassword({
      user_password: user.password,
      password,
      salt: user.salt,
    });
    if (!isVerify) throw new UnauthorizedException();

    const passwordHashed = await createPassword({
      password: newPassword,
      salt: user.salt,
    });

    await this.userRepository.updateUser(user.id, { password: passwordHashed });
  }

  async forgotPassword({ email }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedException('Пользователь c таким E-mail не найден!');

    await this.emailConfirmerService.send({
      user_id: user.id,
      email,
      method: EmailConfirmerMethod.Recovery
    });
  }

  async recoveryPassword({ hash, email, password, repeat }) {
    const resetHashEntity = await this.resetHashRepository.findOneBy({ hash, email });
    if (!resetHashEntity) throw new UnauthorizedException();

    const user = await this.userRepository.findById(resetHashEntity.user_id);
    if (!user) throw new UnauthorizedException();

    if (password !== repeat) throw new UnauthorizedException();

    const { password: passwordHashed, salt } = await createCredentials(password);

    await this.userRepository.updateUser(user.id, { password: passwordHashed, salt });

    await this.emailConfirmerService.confirm({
      hash,
      email,
      method: EmailConfirmerMethod.Recovery
    });
  }
}

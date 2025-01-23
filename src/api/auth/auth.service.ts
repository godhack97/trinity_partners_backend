import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { EmailConfirmerMethod } from "@api/email-confirmer/types";
import { HttpException, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { ResetHashRepository } from '@orm/repositories/reset-hash.repository';
import { UserRepository } from 'src/orm/repositories/user.repository';
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
    private readonly resetHashRepository: ResetHashRepository,
    private readonly emailConfirmerService: EmailConfirmerService,
  ) {}
  async login(authLoginDto: AuthLoginRequestDto) {
    let user = await this.userRepository.findByEmail(authLoginDto.email);
    if (!user) throw new UnauthorizedException();

    const isVerify = await verifyPassword({
      user_password: user.password,
      password: authLoginDto.password,
      salt: user.salt,
    });

    if (!isVerify) throw new UnauthorizedException();

    const token = await createToken(user.salt);
    await this.userRepository.update(user.id, { token });
    user = await this.userRepository.findByEmail(authLoginDto.email);

    if(user.role.name === RoleTypes.Partner) {
      user.owner_company = await user.lazy_owner_company;
    }
    return {
      token,
      user,
    };
  }

  async logout(authorization: string) {
    const token = authorization.substring(7);
    const user = await this.userRepository.findByToken(token);

    if (!user) throw new UnauthorizedException();

    await this.userRepository.update(user.id, { token: null });
  }

  async check(authorization: string) {
    const token = authorization.substring(7);
    const user = await this.userRepository.findOne({
      where: {token},
      relations: ['company_employee.company', 'user_info', 'user_settings']
    });
    console.log('user',user)
    if (!user) throw new HttpException(`Пользователь не найден по токену: ${token}`, HttpStatus.NOT_FOUND);
    console.warn('AuthService:check')

    return user;
  }
  async updatePassword(authorization, { password, newPassword }) {
    const token = authorization.substring(7);
    const user = await this.userRepository.findByToken(token);

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

    await this.userRepository.update(user.id, { password: passwordHashed });
  }

  async forgotPassword({ email }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedException();

    await this.emailConfirmerService.send({
      user_id: user.id,
      email,
      method: EmailConfirmerMethod.Recovery
    })
  }

  async recoveryPassword({ hash, email, password, password2 }) {
    const resetHashEntity = await this.resetHashRepository.findOneBy({ hash, email});
    if (!resetHashEntity) throw new UnauthorizedException();

    const user = await this.userRepository.findById(resetHashEntity.user_id);
    if (!user) throw new UnauthorizedException();

    if (password !== password2) throw new UnauthorizedException();

    const { password: passwordHashed, salt } = await createCredentials(password)

    await this.userRepository.update(user.id, { password: passwordHashed, salt });

    await this.emailConfirmerService.confirm({
      hash,
      email,
      method: EmailConfirmerMethod.Recovery
    })
  }
}

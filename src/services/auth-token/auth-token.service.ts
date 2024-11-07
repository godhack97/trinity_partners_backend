import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserRepository } from '@orm/repositories';

@Injectable()
export class AuthTokenService {f

  constructor(private readonly userRepository: UserRepository) {}

  extractToken(request: Request): string {
    const headers = request.headers as { authorization?: string };
    const _token: string = headers.authorization || '';
    if (_token.length === 0) {
      throw new HttpException('Пользователь не авторизован', HttpStatus.UNAUTHORIZED);
    }
    return _token.substring(7);
  }

  async getUserRole(token: string) {
    const user = await this.userRepository.findByTokenWithCompanyEmployees( token );
    if (!user) {
      throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
    }
    return { role: user.role.name, userId: user.id, status: user?.company_employee?.status, companyId: user?.company_employee?.company_id};
  }

}

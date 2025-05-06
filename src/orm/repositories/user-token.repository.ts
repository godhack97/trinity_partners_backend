// src/orm/repositories/user-token.repository.ts

import { EntityRepository, Repository } from 'typeorm';
import { UserToken } from '../entities/user-token.entity';

@EntityRepository(UserToken)
export class UserTokenRepository extends Repository<UserToken> {}

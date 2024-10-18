import { Global, Module } from '@nestjs/common';
import { entityList } from './entity.list';
import { repoList } from './repo.list';
import { TypeOrmModule } from '@nestjs/typeorm';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature(entityList)],
  providers: [...repoList],
  exports: [...repoList, TypeOrmModule],
})
export class OrmModule { }

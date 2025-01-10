import { Injectable } from "@nestjs/common";
import { NewsRepository } from "@orm/repositories";

@Injectable()
export class NewsService {
  constructor(private readonly newsRepository: NewsRepository) {}

  async findAll() {
    return await this.newsRepository.find();
  }
  async findOne(id: number) {
    return await this.newsRepository.findById(id);
  }
  async create(data) {
    return await this.newsRepository.find();
  }
  async update(data) {
    return await this.newsRepository.find();
  }

}
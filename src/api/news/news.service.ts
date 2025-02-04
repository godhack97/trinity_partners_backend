import { NewsRequestDto } from "@api/news/dto/news.request.dto";
import { PaginationRequestDto } from "@app/dto/pagination.request.dto";
import { NotEntityException } from "@app/filters/not-entity.exception";
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { UserEntity } from "@orm/entities";
import { NewsRepository } from "@orm/repositories";
const opt = {
  delimiter: '-',
  charMap: {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya',
  }
}

const defaultFilter = {
  limit: 10,
  page: 1,
}

@Injectable()
export class NewsService {
  ERROR_EXISTS = 'Новость с таким заголовком уже существует!';

  constructor(private readonly newsRepository: NewsRepository) {}

  async findAll(filters: PaginationRequestDto) {
    const current_page = filters.current_page || 1;
    const limit = filters.limit || defaultFilter.limit;
    const skip = (current_page - 1) * limit;

    const qb = this.newsRepository.createQueryBuilder();

    const data = await qb
      .skip(skip)
      .take(limit)
      .getMany();

    const total = await qb.getCount();

    console.log({
      data
    })
    return {
      current_page,
      limit,
      total,
      pages_count: Math.ceil(total/limit),
      data,
    };
  }
  async findOne(slug: string) {
    const news = await this.newsRepository.findBySlug({ slug });

    if(!news) {
      throw new NotFoundException()
    }

    return news;
  }
  async create(data: NewsRequestDto, auth_user: Partial<UserEntity>) {
    const {name,content,photo} = data;
    const slug = this.makeCHEPEU(name);
    const url = slug;
    const isExistSlug = await this.newsRepository.findBySlugOrName({ slug, name });
    console.log({isExistSlug})
    if(isExistSlug) throw new HttpException(this.ERROR_EXISTS, HttpStatus.CONFLICT)

    return await this.newsRepository.save({
      name,
      content,
      photo,
      url,
      author_id: auth_user.id
    });
  }
  async update(slug: string, data: NewsRequestDto) {
    const {name,content,photo} = data;
    const slugNew = this.makeCHEPEU(name);
    const url = slugNew;
    const news = await this.newsRepository.findBySlug({slug})
    if (!news) throw new NotEntityException();

    const isExistSlug = await this.newsRepository.findBySlug({ slug: slugNew });

    if(isExistSlug && (isExistSlug.id !== news.id)) throw new HttpException(this.ERROR_EXISTS, HttpStatus.CONFLICT)

    const updateResult = await this.newsRepository.update(news.id, {
      name,
      content,
      photo,
      url
    });
    console.log({updateResult})
    if (updateResult.affected === 0) {
      throw new HttpException('Не удалось обновить', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return await this.newsRepository.findById(news.id);
  }

  async delete(slug: string) {
    const news = await this.newsRepository.findBySlug({slug})
    if (!news) {
      throw new NotEntityException();
    }

    const deleteResult = await this.newsRepository.delete(news.id)

    if (deleteResult.affected === 0) {
      throw new HttpException('Не удалось удалить', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return 
  }

  //ЧПУ
  private makeCHEPEU(str: string): string {
    let text = str.toLowerCase()

    for (const key in opt.charMap) {
      text = text.replace(RegExp(key, 'g'), opt.charMap[key]);
    }

    text = text.replace(RegExp(/[_ ]/, 'g'), opt.delimiter);
    text = text.replace(/[^a-zA-Z0-9_-]/g, "")
    text = text.replace(RegExp('[' + opt.delimiter + ']{2,}', 'g'), opt.delimiter);
    text = text.replace(RegExp('(^' + opt.delimiter + '|' + opt.delimiter + '$)', 'g'), '');
    return text
  }
}